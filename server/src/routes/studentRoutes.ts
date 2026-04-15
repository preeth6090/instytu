import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getStudents, getMyStudentProfile, getChildrenByParent,
  getStudent, createStudent, updateStudent, deleteStudent,
} from '../controllers/studentController';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'superadmin', 'teacher'), getStudents);
router.get('/me', authorize('student'), getMyStudentProfile);
router.get('/by-parent', authorize('parent'), getChildrenByParent);
router.get('/:id', authorize('admin', 'superadmin', 'teacher', 'parent'), getStudent);
router.post('/', authorize('admin', 'superadmin'), createStudent);
router.put('/:id', authorize('admin', 'superadmin'), updateStudent);
router.delete('/:id', authorize('admin', 'superadmin'), deleteStudent);

export default router;
