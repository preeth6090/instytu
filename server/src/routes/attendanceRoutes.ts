import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getAttendance, getMyAttendance, markBulkAttendance,
  updateAttendance, getAttendanceStats,
} from '../controllers/attendanceController';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'superadmin', 'teacher', 'parent'), getAttendance);
router.get('/my', authorize('student'), getMyAttendance);
router.get('/stats', getAttendanceStats);
router.post('/bulk', authorize('teacher', 'admin', 'superadmin'), markBulkAttendance);
router.put('/:id', authorize('teacher', 'admin', 'superadmin'), updateAttendance);

export default router;
