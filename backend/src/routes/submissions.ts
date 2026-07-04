import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import Exam from '../models/Exam';
import Submission from '../models/Submission';
import Question from '../models/Question';

const router = Router();

router.use(requireAuth);

// @route   POST /submissions
// @desc    Submit an exam response, grade it, and save the result
router.post('/', requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  const { examId, answers, warningsCount, tabSwitchesCount } = req.body;

  try {
    if (!examId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Missing examId or answers list' });
    }

    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user already submitted for this exam
    const existingSubmission = await Submission.findOne({ student: req.user?.id, exam: examId });
    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted an attempt for this exam' });
    }

    const questions = exam.questions as any[]; // Populated questions
    let score = 0;
    const maxScore = questions.length;

    // Grade answers
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const studentAnswerIndex = answers[i];
      
      // If student answer matches the correct index
      if (studentAnswerIndex !== undefined && studentAnswerIndex === question.correctOptionIndex) {
        score++;
      }
    }

    const newSubmission = new Submission({
      student: req.user?.id,
      exam: examId,
      answers,
      score,
      maxScore,
      warningsCount: warningsCount || 0,
      tabSwitchesCount: tabSwitchesCount || 0,
      status: 'COMPLETED',
      completedAt: new Date()
    });

    await newSubmission.save();

    return res.status(201).json({
      message: 'Exam submitted successfully',
      submission: {
        id: newSubmission._id,
        score: newSubmission.score,
        maxScore: newSubmission.maxScore,
        warningsCount: newSubmission.warningsCount,
        tabSwitchesCount: newSubmission.tabSwitchesCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /submissions/student
// @desc    Get submissions for the current student
router.get('/student', requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await Submission.find({ student: req.user?.id })
      .populate({
        path: 'exam',
        select: 'title duration'
      })
      .sort({ createdAt: -1 });

    return res.json(submissions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /submissions/exam/:examId
// @desc    Get submissions for a specific exam (Teacher & Admin only)
router.get('/exam/:examId', requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await Submission.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .sort({ score: -1 });

    return res.json(submissions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /submissions/teacher
// @desc    Get all submissions for exams created by this teacher
router.get('/teacher', requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Find exams created by teacher
    const exams = await Exam.find({ createdBy: req.user?.id }).select('_id');
    const examIds = exams.map((e) => e._id);

    const submissions = await Submission.find({ exam: { $in: examIds } })
      .populate('student', 'name email')
      .populate('exam', 'title')
      .sort({ createdAt: -1 });

    return res.json(submissions);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
