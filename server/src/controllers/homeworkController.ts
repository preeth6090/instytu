import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Homework from '../models/Homework';
import Student from '../models/Student';

// GET /api/homework?classId=&subject=
export const getHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subject } = req.query;
    const filter: any = { institution: req.user!.institution };
    if (classId) filter.class = classId;
    if (subject) filter.subject = subject;

    const homework = await Homework.find(filter)
      .populate('assignedBy', 'name')
      .sort({ dueDate: -1 });

    res.json(homework);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/homework/my — student's homework (from their class)
export const getMyHomework = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const homework = await Homework.find({ class: student.class })
      .populate('assignedBy', 'name')
      .sort({ dueDate: -1 });

    // Tag each with submission status for this student
    const studentId = student._id.toString();
    const result = homework.map(hw => {
      const submitted = hw.submissions.some(s => s.student.toString() === studentId);
      return { ...hw.toObject(), submitted };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/homework — teacher creates homework
export const createHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, subject, classId, dueDate } = req.body;

    const hw = await Homework.create({
      title, description, subject,
      class: classId,
      institution: req.user!.institution,
      assignedBy: req.user!._id,
      dueDate: new Date(dueDate),
    });

    await hw.populate('assignedBy', 'name');
    res.status(201).json(hw);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/homework/:id — update homework (teacher)
export const updateHomework = async (req: AuthRequest, res: Response) => {
  try {
    const hw = await Homework.findByIdAndUpdate(
      req.params.id,
      { $set: { title: req.body.title, description: req.body.description, dueDate: req.body.dueDate } },
      { new: true }
    );
    if (!hw) return res.status(404).json({ message: 'Homework not found' });
    res.json(hw);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/homework/:id
export const deleteHomework = async (req: AuthRequest, res: Response) => {
  try {
    await Homework.findByIdAndDelete(req.params.id);
    res.json({ message: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/homework/:id/submit — student marks as submitted
export const submitHomework = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ message: 'Homework not found' });

    const alreadySubmitted = hw.submissions.some(s => s.student.toString() === student._id.toString());
    if (alreadySubmitted) return res.status(400).json({ message: 'Already submitted' });

    hw.submissions.push({ student: student._id as any, submittedAt: new Date(), note: req.body.note });
    await hw.save();

    res.json({ message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
