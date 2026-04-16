import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import WidgetConfig from '../models/WidgetConfig';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  try {
    const configs = await WidgetConfig.find({ user: req.user._id, institution: req.user.institution }).sort({ updatedAt: -1 });
    res.json(configs);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authenticate, async (req: any, res) => {
  try {
    const config = await WidgetConfig.create({ ...req.body, user: req.user._id, institution: req.user.institution });
    res.status(201).json(config);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const config = await WidgetConfig.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    if (!config) return res.status(404).json({ message: 'Not found' });
    res.json(config);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    await WidgetConfig.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
