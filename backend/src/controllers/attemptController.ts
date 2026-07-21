import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ExamTemplate from '../models/ExamTemplate';
import ExamInstance from '../models/ExamInstance';
import Attempt from '../models/Attempt';
import Question from '../models/Question';
import { generateExamInstance } from '../services/examGenerator';

// Helper to check if two string arrays contain the exact same items (order-insensitive)
const isSameAnswers = (arr1: string[], arr2: string[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, index) => val === sorted2[index]);
};

// @desc    Start an exam attempt
// @route   POST /attempts/start
// @access  Private (Student only)
export const startAttempt = async (req: AuthRequest, res: Response) => {
  const { templateId } = req.body;
  const studentId = req.user?.id;

  try {
    if (!templateId || !studentId) {
      return res.status(400).json({ message: 'Missing exam template ID' });
    }

    const template = await ExamTemplate.findById(templateId);
    if (!template || !template.isActive) {
      return res.status(404).json({ message: 'Exam template not found' });
    }

    // Check attempts limit
    const attemptCount = await Attempt.countDocuments({ studentId, templateId });
    if (attemptCount >= template.maxAttempts) {
      return res.status(400).json({ message: `Maximum attempt limit of ${template.maxAttempts} reached for this examination.` });
    }

    // Check if there is an active in-progress attempt for this template
    let attempt = await Attempt.findOne({ studentId, templateId, status: 'IN_PROGRESS' });
    let instance;

    if (attempt) {
      // Re-load the existing instance
      instance = await ExamInstance.findById(attempt.examInstanceId).populate('questions.questionId');
      if (!instance) {
        return res.status(400).json({ message: 'Attempt instance records mismatch.' });
      }
    } else {
      // Compile new dynamic instance
      instance = await generateExamInstance(studentId, templateId);
      
      // Create new attempt
      attempt = new Attempt({
        studentId,
        examInstanceId: instance._id,
        templateId,
        responses: [],
        status: 'IN_PROGRESS',
        startedAt: new Date()
      });
      await attempt.save();

      // Populate questions to return to user
      instance = await instance.populate('questions.questionId');
    }

    // Construct the formatted questions payload (without correctAnswers)
    const formattedQuestions = instance.questions.map((iq: any) => {
      const q = iq.questionId;
      
      // Shuffle options text order based on stored indices mapping
      let optionsPayload = q.options;
      if (q.type !== 'SHORT_ANSWER' && iq.shuffledOptionIndices && iq.shuffledOptionIndices.length > 0) {
        optionsPayload = iq.shuffledOptionIndices.map((origIdx: number) => q.options[origIdx]);
      }

      return {
        _id: q._id,
        type: q.type,
        questionText: q.questionText,
        options: optionsPayload,
        difficulty: q.difficulty,
        marks: q.marks
      };
    });

    const now = new Date();
    const timeLeftSeconds = Math.max(0, Math.floor((instance.expiresAt.getTime() - now.getTime()) / 1000));

    return res.json({
      attemptId: attempt._id,
      timeLeft: timeLeftSeconds,
      questions: formattedQuestions,
      title: template.title,
      description: template.description,
      passingPercentage: template.passingPercentage
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error starting attempt' });
  }
};

// @desc    Auto-save responses progress periodically
// @route   POST /attempts/:id/progress
// @access  Private (Student only)
export const saveAttemptProgress = async (req: AuthRequest, res: Response) => {
  const { responses } = req.body;
  const attemptId = req.params.id;

  try {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(404).json({ message: 'Active attempt session not found' });
    }

    const instance = await ExamInstance.findById(attempt.examInstanceId);
    if (!instance) {
      return res.status(404).json({ message: 'Exam session instance mismatch' });
    }

    // Verify time limit (with 30 seconds grace window)
    if (new Date() > new Date(instance.expiresAt.getTime() + 30000)) {
      return res.status(400).json({ message: 'Exam session time limit expired' });
    }

    if (responses && Array.isArray(responses)) {
      attempt.responses = responses.map((r: any) => ({
        questionId: r.questionId,
        answers: r.answers || []
      }));
      await attempt.save();
    }

    return res.json({ message: 'Progress saved successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Submit final exam attempt and compute score grading
// @route   POST /attempts/:id/submit
// @access  Private (Student only)
export const submitAttempt = async (req: AuthRequest, res: Response) => {
  const attemptId = req.params.id;
  const { responses, warningsCount, tabSwitchesCount, cheatingDetected } = req.body;

  try {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt has already been finalized or does not exist.' });
    }

    const template = await ExamTemplate.findById(attempt.templateId);
    if (!template) {
      return res.status(404).json({ message: 'Associated exam template not found' });
    }

    const instance = await ExamInstance.findById(attempt.examInstanceId).populate('questions.questionId');
    if (!instance) {
      return res.status(404).json({ message: 'Exam instance record missing' });
    }

    // Update with final submissions if sent in payload
    if (responses && Array.isArray(responses)) {
      attempt.responses = responses.map((r: any) => ({
        questionId: r.questionId,
        answers: r.answers || []
      }));
    }

    if (warningsCount !== undefined) attempt.warningsCount = warningsCount;
    if (tabSwitchesCount !== undefined) attempt.tabSwitchesCount = tabSwitchesCount;

    const isDisqualified = cheatingDetected === true || attempt.tabSwitchesCount > 2;

    // --- GRADING PIPELINE ---
    let totalScore = 0;
    let maxPossibleScore = 0;

    const questionsMap = new Map<string, any>();
    instance.questions.forEach((iq: any) => {
      questionsMap.set(iq.questionId._id.toString(), iq);
    });

    for (const resp of attempt.responses) {
      const qId = resp.questionId.toString();
      const instanceQuestion = questionsMap.get(qId);
      if (!instanceQuestion) continue;

      const q = instanceQuestion.questionId;
      maxPossibleScore += q.marks;

      let isCorrect = false;

      if (q.type === 'SHORT_ANSWER') {
        const studentText = resp.answers[0] ? resp.answers[0].trim().toLowerCase() : '';
        // Look up against array of allowed correct values
        if (q.correctAnswers.includes(studentText)) {
          isCorrect = true;
        }
      } else {
        // MCQ types
        // Student indices in payload are references to shuffled UI list.
        // Map them back to DB index mapping: dbIndex = shuffledOptionIndices[studentIndex]
        const dbStudentAnswers = resp.answers
          .map((studentUIIdxStr) => {
            const uiIdx = parseInt(studentUIIdxStr);
            if (isNaN(uiIdx) || uiIdx < 0 || uiIdx >= instanceQuestion.shuffledOptionIndices.length) {
              return null;
            }
            return String(instanceQuestion.shuffledOptionIndices[uiIdx]);
          })
          .filter((v) => v !== null) as string[];

        // Check correct values
        if (isSameAnswers(dbStudentAnswers, q.correctAnswers)) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        totalScore += q.marks;
      } else {
        // Apply negative marking penalty if enabled
        if (template.negativeMarkingRules.enabled) {
          totalScore -= template.negativeMarkingRules.penalty;
        }
      }
    }

    // Clamp score at zero to prevent negative total exam scores
    attempt.score = isDisqualified ? 0 : Math.max(0, totalScore);
    attempt.maxScore = maxPossibleScore;
    attempt.status = 'COMPLETED';
    attempt.cheatingDetected = isDisqualified;
    attempt.completedAt = new Date();

    await attempt.save();

    // Remove the instance document as it is no longer required (keeps database clean)
    await ExamInstance.findByIdAndDelete(attempt.examInstanceId);

    // Populate templateId so that the frontend has the passingPercentage and title info immediately
    await attempt.populate('templateId', 'title duration passingPercentage');

    return res.json({
      message: isDisqualified ? 'Exam terminated due to cheating disqualification' : 'Exam submitted and graded successfully',
      attempt
    });
  } catch (error: any) {
    console.error('Submission Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during submission' });
  }
};

// @desc    Get current student's attempts history
// @route   GET /attempts/student
// @access  Private (Student only)
export const getStudentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await Attempt.find({ studentId: req.user?.id, status: 'COMPLETED' })
      .populate('templateId', 'title duration')
      .sort({ completedAt: -1 });

    return res.json(attempts);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get all exam submissions (Teacher/Admin only)
// @route   GET /attempts/teacher
// @access  Private (Teacher/Admin only)
export const getTeacherResults = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.query;
    const filter: any = { status: 'COMPLETED' };

    if (templateId) {
      filter.templateId = templateId;
    }

    const attempts = await Attempt.find(filter)
      .populate('studentId', 'name email')
      .populate('templateId', 'title duration passingPercentage')
      .sort({ completedAt: -1 });

    return res.json(attempts);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Reset student attempt history for an exam template
// @route   DELETE /attempts/reset/:templateId
// @access  Private
export const resetStudentAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;
    const studentId = req.user?.id;
    await Attempt.deleteMany({ studentId, templateId });
    return res.json({ message: 'Attempts reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

