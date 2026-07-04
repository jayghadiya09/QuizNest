import { Router } from 'express';
import { getSubjects, createSubject, updateSubject } from '../controllers/subjectController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getSubjects);
router.post('/', requireRole(['TEACHER', 'ADMIN']), createSubject);
router.put('/:id', requireRole(['TEACHER', 'ADMIN']), updateSubject);

export default router;
