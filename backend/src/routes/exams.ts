import { Router } from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/examController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getTemplates);
router.post('/', requireRole(['TEACHER', 'ADMIN']), createTemplate);
router.put('/:id', requireRole(['TEACHER', 'ADMIN']), updateTemplate);
router.delete('/:id', requireRole(['TEACHER', 'ADMIN']), deleteTemplate);

export default router;
