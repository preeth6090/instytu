import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getHomework, getMyHomework, createHomework,
  updateHomework, deleteHomework, submitHomework,
} from '../controllers/homeworkController';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'superadmin', 'teacher', 'parent'), getHomework);
router.get('/my', authorize('student'), getMyHomework);
router.post('/', authorize('teacher', 'admin', 'superadmin'), createHomework);
router.put('/:id', authorize('teacher', 'admin', 'superadmin'), updateHomework);
router.delete('/:id', authorize('teacher', 'admin', 'superadmin'), deleteHomework);
router.post('/:id/submit', authorize('student'), submitHomework);

export default router;
