import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getTimetable, getMyTimetable, upsertTimetable } from '../controllers/timetableController';

const router = express.Router();

router.use(protect);

router.get('/', getTimetable);
router.get('/my', authorize('student'), getMyTimetable);
router.post('/', authorize('teacher', 'admin', 'superadmin'), upsertTimetable);

export default router;
