import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getLeaves, applyLeave, reviewLeave, cancelLeave } from '../controllers/leaveController';

const router = express.Router();

router.use(protect);

router.get('/', getLeaves);
router.post('/', authorize('student', 'parent'), applyLeave);
router.put('/:id/review', authorize('teacher', 'admin', 'superadmin'), reviewLeave);
router.delete('/:id', authorize('student', 'parent'), cancelLeave);

export default router;
