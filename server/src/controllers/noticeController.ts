import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notice from '../models/Notice';

// GET /api/notices?type=&role=
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;
    const filter: any = {
      institution: req.user!.institution,
      $or: [
        { targetRoles: req.user!.role },
        { targetRoles: 'all' },
      ],
    };
    if (type) filter.type = type;

    const notices = await Notice.find(filter)
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/notices/:id
export const getNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id).populate('postedBy', 'name role');
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/notices — admin/teacher
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, targetRoles, targetClasses, expiresAt } = req.body;

    const notice = await Notice.create({
      title, content,
      type: type || 'general',
      institution: req.user!.institution,
      postedBy: req.user!._id,
      targetRoles: targetRoles || ['all'],
      targetClasses,
      expiresAt,
    });

    await notice.populate('postedBy', 'name role');
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/notices/:id
export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('postedBy', 'name role');

    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/notices/:id
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
