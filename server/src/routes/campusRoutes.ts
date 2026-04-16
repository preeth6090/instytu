import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import Campus from '../models/Campus';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  try {
    const campuses = await Campus.find({ institution: req.user.institution }).sort({ name: 1 });
    res.json(campuses);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authenticate, async (req: any, res) => {
  try {
    const campus = await Campus.create({ ...req.body, institution: req.user.institution });
    res.status(201).json(campus);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const campus = await Campus.findOneAndUpdate({ _id: req.params.id, institution: req.user.institution }, req.body, { new: true });
    if (!campus) return res.status(404).json({ message: 'Campus not found' });
    res.json(campus);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    await Campus.findOneAndDelete({ _id: req.params.id, institution: req.user.institution });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
