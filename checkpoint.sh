#!/bin/bash
# Checkpoint script for QuizNest

ACTION=$1
NAME=$2

if [ -z "$ACTION" ]; then
  echo "Usage: ./checkpoint.sh [save|restore] [name]"
  exit 1
fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)

if [ "$ACTION" = "save" ]; then
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  CHECKPOINT_NAME=${NAME:-$TIMESTAMP}
  BRANCH_NAME="checkpoint-${CHECKPOINT_NAME}"

  if [ -z "$(git status --porcelain)" ]; then
    echo "Workspace is clean. Creating checkpoint branch '${BRANCH_NAME}' at HEAD..."
    git branch -f "${BRANCH_NAME}" HEAD
    echo "Checkpoint saved successfully to branch: ${BRANCH_NAME}"
  else
    echo "Workspace has uncommitted changes. Saving to checkpoint branch '${BRANCH_NAME}'..."
    
    # 1. Stash current changes (including untracked files)
    git stash push -u -m "temp-checkpoint-${TIMESTAMP}" > /dev/null
    
    # 2. Create checkpoint branch from HEAD
    git checkout -b "${BRANCH_NAME}" > /dev/null 2>&1 || git branch -f "${BRANCH_NAME}" HEAD
    git checkout "${BRANCH_NAME}" > /dev/null
    
    # 3. Apply the stashed changes to checkpoint branch and commit them
    git stash apply > /dev/null
    git add -A
    git commit -m "Checkpoint: ${CHECKPOINT_NAME}" > /dev/null
    
    # 4. Return to original branch
    git checkout "${CURRENT_BRANCH}" > /dev/null
    
    # 5. Restore the workspace state by popping the stash
    git stash pop > /dev/null
    
    echo "Checkpoint saved successfully to branch: ${BRANCH_NAME}"
  fi

elif [ "$ACTION" = "restore" ]; then
  if [ -z "$NAME" ]; then
    echo "Error: Please specify the checkpoint name to restore."
    echo "Available checkpoints:"
    git branch --list "checkpoint-*" | sed 's/^[ *]*//'
    exit 1
  fi
  
  BRANCH_NAME="checkpoint-${NAME}"
  
  # Check if checkpoint branch exists
  if ! git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "Error: Checkpoint '${NAME}' does not exist."
    exit 1
  fi
  
  echo "Restoring workspace to checkpoint '${NAME}'..."
  
  # Check if there are uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: You have uncommitted changes. Stashing them before restore..."
    git stash push -u -m "pre-restore-backup-$(date +"%Y%m%d_%H%M%S")"
  fi
  
  # Switch to the checkpoint branch
  git checkout "${BRANCH_NAME}"
  echo "Switched to branch '${BRANCH_NAME}'. Workspace is now at checkpoint '${NAME}'."
else
  echo "Invalid action: ${ACTION}. Use 'save' or 'restore'."
  exit 1
fi
