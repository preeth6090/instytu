import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Institution from '../models/Institution';

// GET /api/institutions/branding/:slug — PUBLIC, used by login page
export const getBrandingBySlug = async (req: Request, res: Response) => {
  try {
    const institution = await Institution.findOne({ slug: req.params.slug, isActive: true })
      .select('name slug logo tagline primaryColor type');
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/institutions/me — logged-in admin's institution
export const getMyInstitution = async (req: AuthRequest, res: Response) => {
  try {
    const institution = await Institution.findById(req.user!.institution);
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/institutions/me — update branding + settings (admin)
export const updateMyInstitution = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['name', 'tagline', 'logo', 'primaryColor', 'phone', 'address', 'email'];
    const updates: any = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const institution = await Institution.findByIdAndUpdate(
      req.user!.institution,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
