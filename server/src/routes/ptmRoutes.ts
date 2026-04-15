import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getPTMSlots, createPTMSlot, createBulkPTMSlots,
  bookSlot, cancelSlot, deleteSlot,
} from '../controllers/ptmController';

const router = express.Router();

router.use(protect);

router.get('/', getPTMSlots);
router.post('/', authorize('teacher', 'admin', 'superadmin'), createPTMSlot);
router.post('/bulk', authorize('teacher', 'admin', 'superadmin'), createBulkPTMSlots);
router.put('/:id/book', authorize('parent'), bookSlot);
router.put('/:id/cancel', cancelSlot);
router.delete('/:id', authorize('teacher', 'admin', 'superadmin'), deleteSlot);

export default router;
