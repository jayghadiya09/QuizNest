import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Question from '../models/Question';
import Subject from '../models/Subject';
import { generateQuestionsFromAI } from '../services/aiService';

// @desc    Get questions with filters
// @route   GET /questions
// @access  Private (Teacher/Admin)
export const getQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, difficulty, type } = req.query;
    const filter: any = { isActive: true };

    if (subjectId) filter.subjectId = subjectId;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });

    return res.json(questions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Create a single question
// @route   POST /questions
// @access  Private (Teacher/Admin)
export const createQuestion = async (req: AuthRequest, res: Response) => {
  const { type, subjectId, difficulty, tags, questionText, options, correctAnswers, marks } = req.body;

  try {
    if (!type || !subjectId || !questionText || !correctAnswers) {
      return res.status(400).json({ message: 'Missing required question fields' });
    }

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Validate correctAnswers
    if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
      return res.status(400).json({ message: 'correctAnswers must be a non-empty array' });
    }

    if (type !== 'SHORT_ANSWER') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'MCQ questions require at least 2 options' });
      }

      // Check indices bounds
      for (const ans of correctAnswers) {
        const idx = parseInt(ans);
        if (isNaN(idx) || idx < 0 || idx >= options.length) {
          return res.status(400).json({ message: `Correct answer index "${ans}" is out of bounds` });
        }
      }
    }

    const newQuestion = new Question({
      type,
      subjectId,
      difficulty: difficulty || 'MEDIUM',
      tags: tags || [],
      questionText: questionText.trim(),
      options: type === 'SHORT_ANSWER' ? [] : options,
      correctAnswers: correctAnswers.map((a: string) => a.trim().toLowerCase()),
      marks: marks || 1,
      isActive: true
    });

    await newQuestion.save();
    return res.status(201).json(newQuestion);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update a question
// @route   PUT /questions/:id
// @access  Private (Teacher/Admin)
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  const { type, difficulty, tags, questionText, options, correctAnswers, marks } = req.body;

  try {
    const question = await Question.findById(req.params.id);
    if (!question || !question.isActive) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (type) question.type = type;
    if (difficulty) question.difficulty = difficulty;
    if (tags) question.tags = tags;
    if (questionText) question.questionText = questionText.trim();
    if (marks !== undefined) question.marks = marks;

    if (options && question.type !== 'SHORT_ANSWER') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'MCQ questions require at least 2 options' });
      }
      question.options = options;
    }

    if (correctAnswers) {
      if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
        return res.status(400).json({ message: 'correctAnswers must be a non-empty array' });
      }
      question.correctAnswers = correctAnswers.map((a: string) => a.trim().toLowerCase());
    }

    await question.save();
    return res.json(question);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Hard Delete a question
// @route   DELETE /questions/:id
// @access  Private (Teacher/Admin)
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    return res.json({ message: 'Question removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Bulk JSON Import Engine
// @route   POST /questions/import
// @access  Private (Teacher/Admin)
export const importQuestions = async (req: AuthRequest, res: Response) => {
  const { subjectId, questionsList } = req.body;

  try {
    if (!subjectId || !questionsList || !Array.isArray(questionsList)) {
      return res.status(400).json({ message: 'Please provide subjectId and a list of questions to import' });
    }

    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const questionsToInsert: any[] = [];

    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      const lineNum = i + 1;

      if (!q.type || !q.questionText || !q.correctAnswers) {
        errorCount++;
        errors.push(`Row ${lineNum}: Missing type, questionText, or correctAnswers.`);
        continue;
      }

      if (!['SINGLE_MCQ', 'MULTI_MCQ', 'SHORT_ANSWER'].includes(q.type)) {
        errorCount++;
        errors.push(`Row ${lineNum}: Invalid type "${q.type}".`);
        continue;
      }

      const qText = q.questionText.trim();
      
      // Duplication check in import payload (skip duplicates of exact questionText)
      const isDuplicate = questionsToInsert.some((inserted) => inserted.questionText === qText);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
        errorCount++;
        errors.push(`Row ${lineNum}: correctAnswers must be a non-empty array.`);
        continue;
      }

      if (q.type !== 'SHORT_ANSWER') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errorCount++;
          errors.push(`Row ${lineNum}: MCQ type requires options array with at least 2 entries.`);
          continue;
        }

        // Validate options indices
        let isOOB = false;
        for (const ans of q.correctAnswers) {
          const idx = parseInt(ans);
          if (isNaN(idx) || idx < 0 || idx >= q.options.length) {
            isOOB = true;
            break;
          }
        }
        if (isOOB) {
          errorCount++;
          errors.push(`Row ${lineNum}: One or more correct option index is out of bounds.`);
          continue;
        }
      }

      // Add to batch insert list
      questionsToInsert.push({
        type: q.type,
        subjectId,
        difficulty: q.difficulty || 'MEDIUM',
        tags: q.tags || [],
        questionText: qText,
        options: q.type === 'SHORT_ANSWER' ? [] : q.options,
        correctAnswers: q.correctAnswers.map((a: string) => String(a).trim().toLowerCase()),
        marks: q.marks || 1,
        isActive: true
      });
    }

    if (questionsToInsert.length > 0) {
      await Question.insertMany(questionsToInsert);
      createdCount = questionsToInsert.length;
    }

    return res.json({
      message: 'Bulk import processed',
      createdCount,
      skippedCount,
      errorCount,
      errors
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error during import' });
  }
};

// @desc    Generate questions using AI (Gemini)
// @route   POST /questions/generate-ai
// @access  Private (Teacher/Admin)
export const generateAIQuestions = async (req: AuthRequest, res: Response) => {
  const { topic, difficulty, type, count } = req.body;

  try {
    if (!topic) {
      return res.status(400).json({ message: 'Topic is required for AI generation' });
    }

    const questionType = type || 'SINGLE_MCQ';
    const questionDifficulty = difficulty || 'MEDIUM';
    const questionCount = count ? parseInt(count) : 3;

    if (isNaN(questionCount) || questionCount < 1 || questionCount > 10) {
      return res.status(400).json({ message: 'Count must be a number between 1 and 10' });
    }

    const generated = await generateQuestionsFromAI(
      topic,
      questionDifficulty,
      questionType,
      questionCount
    );

    return res.json(generated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error during AI generation' });
  }
};
