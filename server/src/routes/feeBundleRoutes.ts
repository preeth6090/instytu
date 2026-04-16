import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import FeeBundle from '../models/FeeBundle';
import StudentBundle from '../models/StudentBundle';
import StudentDiscount from '../models/StudentDiscount';

const router = express.Router();

// ── Bundles ──────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req: any, res) => {
  try {
    const bundles = await FeeBundle.find({ institution: req.user.institution }).sort({ name: 1 });
    res.json(bundles);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authenticate, async (req: any, res) => {
  try {
    const bundle = await FeeBundle.create({ ...req.body, institution: req.user.institution });
    res.status(201).json(bundle);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const bundle = await FeeBundle.findOneAndUpdate({ _id: req.params.id, institution: req.user.institution }, req.body, { new: true, runValidators: true });
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(bundle);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    await FeeBundle.findOneAndDelete({ _id: req.params.id, institution: req.user.institution });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ── Student-Bundle assignments ────────────────────────────────────────────────
router.get('/assignments', authenticate, async (req: any, res) => {
  try {
    const { studentId } = req.query;
    const filter: any = { institution: req.user.institution };
    if (studentId) filter.student = studentId;
    const assignments = await StudentBundle.find(filter).populate('bundle').populate({ path: 'student', populate: { path: 'user', select: 'name' } });
    res.json(assignments);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/assign', authenticate, async (req: any, res) => {
  try {
    const { studentId, bundleId, academicYear } = req.body;
    const assignment = await StudentBundle.findOneAndUpdate(
      { student: studentId, bundle: bundleId, academicYear: academicYear || '2025-26' },
      { student: studentId, bundle: bundleId, institution: req.user.institution, academicYear: academicYear || '2025-26', isActive: true },
      { upsert: true, new: true }
    );
    await assignment.populate('bundle');
    res.status(201).json(assignment);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/assign/:id', authenticate, async (req: any, res) => {
  try {
    await StudentBundle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment removed' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ── Student discounts ─────────────────────────────────────────────────────────
router.get('/discounts', authenticate, async (req: any, res) => {
  try {
    const { studentId } = req.query;
    const filter: any = { institution: req.user.institution };
    if (studentId) filter.student = studentId;
    const discounts = await StudentDiscount.find(filter).populate({ path: 'student', populate: { path: 'user', select: 'name' } });
    res.json(discounts);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/discounts', authenticate, async (req: any, res) => {
  try {
    const discount = await StudentDiscount.create({ ...req.body, institution: req.user.institution, createdBy: req.user._id });
    res.status(201).json(discount);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/discounts/:id', authenticate, async (req: any, res) => {
  try {
    const discount = await StudentDiscount.findOneAndUpdate({ _id: req.params.id, institution: req.user.institution }, req.body, { new: true });
    res.json(discount);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/discounts/:id', authenticate, async (req: any, res) => {
  try {
    await StudentDiscount.findOneAndDelete({ _id: req.params.id, institution: req.user.institution });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
