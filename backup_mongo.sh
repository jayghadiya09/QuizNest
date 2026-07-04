#!/bin/bash
# Backup MongoDB database for QuizNest

set -e

# Configuration
DB_NAME=${1:-quiznest}
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_PATH="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "Starting MongoDB backup for database: '${DB_NAME}'..."

if [ -z "$MONGODB_URI" ]; then
  # Local backup via mongodump default
  mongodump --db="${DB_NAME}" --out="${OUTPUT_PATH}"
else
  # URI-based backup
  mongodump --uri="${MONGODB_URI}" --out="${OUTPUT_PATH}"
fi

echo "Backup created successfully at: ${OUTPUT_PATH}"
