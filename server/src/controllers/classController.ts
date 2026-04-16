import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Class from '../models/Class';

// GET /api/classes
export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const classes = await Class.find({ institution: req.user!.institution })
      .populate('classTeacher', 'name email')
      .select('-__v')
      .sort({ grade: 1, section: 1 })
      .lean();
    res.set('Cache-Control', 'private, max-age=60');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/classes/:id
export const getClass = async (req: AuthRequest, res: Response) => {
  try {
    const cls = await Class.findById(req.params.id).populate('classTeacher', 'name email');
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/classes
export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { grade, section, classTeacher, subjects, academicYear } = req.body;
    const name = `${grade}-${section}`;
    const cls = await Class.create({
      name, grade, section,
      institution: req.user!.institution,
      classTeacher, subjects,
      academicYear: academicYear || '2025-26',
    });
    res.status(201).json(cls);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: 'Class already exists for this grade/section/year' });
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/classes/:id
export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/classes/:id
export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
