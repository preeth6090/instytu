import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getClasses, getClass, createClass, updateClass, deleteClass } from '../controllers/classController';

const router = express.Router();

router.use(protect);

router.get('/', getClasses);
router.get('/:id', getClass);
router.post('/', authorize('admin', 'superadmin'), createClass);
router.put('/:id', authorize('admin', 'superadmin'), updateClass);
router.delete('/:id', authorize('admin', 'superadmin'), deleteClass);

export default router;
