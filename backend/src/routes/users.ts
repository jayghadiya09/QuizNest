import { Router } from 'express';
import { getUsers, updateUserRole, deleteUser } from '../controllers/userController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/', getUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
