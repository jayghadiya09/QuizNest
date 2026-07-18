import { Router } from 'express';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  generateAIQuestions
} from '../controllers/questionController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['TEACHER', 'ADMIN']));

router.get('/', getQuestions);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.post('/import', importQuestions);
router.post('/generate-ai', generateAIQuestions);

export default router;
