import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getNotices, getNotice, createNotice, updateNotice, deleteNotice } from '../controllers/noticeController';

const router = express.Router();

router.use(protect);

router.get('/', getNotices);
router.get('/:id', getNotice);
router.post('/', authorize('teacher', 'admin', 'superadmin'), createNotice);
router.put('/:id', authorize('teacher', 'admin', 'superadmin'), updateNotice);
router.delete('/:id', authorize('teacher', 'admin', 'superadmin'), deleteNotice);

export default router;
