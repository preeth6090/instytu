import express from 'express';
import { protect } from '../middleware/auth';
import {
  generateReportComment,
  generateNotice,
  generateLessonPlan,
  homeworkHelp,
  generateLeaveReason,
  attendanceInsight,
  generateFeeReminder,
  ptmSummary,
} from '../controllers/aiController';

const router = express.Router();

router.use(protect);

router.post('/report-comment', generateReportComment);
router.post('/notice', generateNotice);
router.post('/lesson-plan', generateLessonPlan);
router.post('/homework-help', homeworkHelp);
router.post('/leave-reason', generateLeaveReason);
router.post('/attendance-insight', attendanceInsight);
router.post('/fee-reminder', generateFeeReminder);
router.post('/ptm-summary', ptmSummary);

export default router;
