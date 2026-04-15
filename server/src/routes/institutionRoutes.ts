import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { getBrandingBySlug, getMyInstitution, updateMyInstitution } from '../controllers/institutionController';

const router = express.Router();

// Public — no auth needed
router.get('/branding/:slug', getBrandingBySlug);

// Protected
router.get('/me', protect, getMyInstitution);
router.put('/me', protect, authorize('admin', 'superadmin'), updateMyInstitution);

export default router;
