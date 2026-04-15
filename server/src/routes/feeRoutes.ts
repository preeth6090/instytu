import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getFees, createFee, createBulkFees, markFeePaid, deleteFee } from '../controllers/feeController';

const router = express.Router();

router.use(protect);

router.get('/', getFees);
router.post('/', authorize('admin', 'superadmin'), createFee);
router.post('/bulk', authorize('admin', 'superadmin'), createBulkFees);
router.put('/:id/pay', markFeePaid);
router.delete('/:id', authorize('admin', 'superadmin'), deleteFee);

export default router;
