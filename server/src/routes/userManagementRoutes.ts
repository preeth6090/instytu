import express from 'express';
import bcrypt from 'bcryptjs';
import { protect as authenticate } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// GET /api/users?role=
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { role } = req.query;
    const filter: any = { institution: req.user.institution };
    if (role) filter.role = role;
    const users = await User.find(filter).populate('customRole', 'name').populate('campus', 'name').select('-password').sort({ name: 1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/users — create new user (any role) for institution
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Accept both customRole/campus (frontend) and customRoleId/campusId (legacy)
    const customRole = req.body.customRole || req.body.customRoleId || undefined;
    const campus = req.body.campus || req.body.campusId || undefined;

    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed,
      role: role || 'staff',
      customRole: customRole || undefined,
      campus: campus || undefined,
      institution: req.user.institution,
    });

    const populated = await User.findById(user._id).populate('customRole', 'name').populate('campus', 'name').select('-password');
    res.status(201).json(populated);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const updates: any = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    delete updates.email; // Don't allow email change via this route
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      updates, { new: true }
    ).populate('customRole', 'name').populate('campus', 'name').select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot delete yourself' });
    await User.findOneAndUpdate({ _id: req.params.id, institution: req.user.institution }, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
