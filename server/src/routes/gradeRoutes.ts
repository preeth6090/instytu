import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getGrades, getMyGrades, createGrade, updateGrade, deleteGrade, bulkUpsertGrades } from '../controllers/gradeController';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'superadmin', 'teacher', 'parent'), getGrades);
router.get('/my', authorize('student'), getMyGrades);
router.post('/', authorize('teacher', 'admin', 'superadmin'), createGrade);
router.post('/bulk', authorize('teacher', 'admin', 'superadmin'), bulkUpsertGrades);
router.put('/:id', authorize('teacher', 'admin', 'superadmin'), updateGrade);
router.delete('/:id', authorize('teacher', 'admin', 'superadmin'), deleteGrade);

export default router;
