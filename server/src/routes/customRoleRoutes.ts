import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import CustomRole from '../models/CustomRole';
import User from '../models/User';

const router = express.Router();

router.get('/', authenticate, async (req: any, res) => {
  try {
    const roles = await CustomRole.find({ institution: req.user.institution }).sort({ name: 1 });
    res.json(roles);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authenticate, async (req: any, res) => {
  try {
    const role = await CustomRole.create({ ...req.body, institution: req.user.institution });
    res.status(201).json(role);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const role = await CustomRole.findOneAndUpdate({ _id: req.params.id, institution: req.user.institution }, req.body, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    await CustomRole.findOneAndDelete({ _id: req.params.id, institution: req.user.institution });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// Assign custom role to a user
router.post('/assign', authenticate, async (req: any, res) => {
  try {
    const { userId, roleId } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: userId, institution: req.user.institution },
      { customRole: roleId || null },
      { new: true }
    ).populate('customRole');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

export default router;
