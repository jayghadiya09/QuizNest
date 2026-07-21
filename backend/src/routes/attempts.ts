import { Router } from 'express';
import {
  startAttempt,
  saveAttemptProgress,
  submitAttempt,
  getStudentHistory,
  getTeacherResults,
  resetStudentAttempts
} from '../controllers/attemptController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/start', requireRole(['STUDENT']), startAttempt);
router.post('/:id/progress', requireRole(['STUDENT']), saveAttemptProgress);
router.post('/:id/submit', requireRole(['STUDENT']), submitAttempt);
router.get('/student', requireRole(['STUDENT']), getStudentHistory);
router.get('/teacher', requireRole(['TEACHER', 'ADMIN']), getTeacherResults);
router.delete('/reset/:templateId', resetStudentAttempts);

export default router;

