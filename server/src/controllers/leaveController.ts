import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Leave from '../models/Leave';
import Student from '../models/Student';

// GET /api/leave — context-aware
export const getLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const { status, studentId } = req.query;
    const filter: any = { institution: req.user!.institution };

    if (status) filter.status = status;

    if (req.user!.role === 'student') {
      const student = await Student.findOne({ user: req.user!._id });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      filter.student = student._id;
    } else if (req.user!.role === 'parent') {
      // All children's leaves
      const children = await Student.find({ parents: req.user!._id });
      filter.student = { $in: children.map(c => c._id) };
    } else if (studentId) {
      filter.student = studentId;
    }

    const leaves = await Leave.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('appliedBy', 'name role')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/leave — student or parent applies
export const applyLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, type, fromDate, toDate, reason } = req.body;

    let studentRef = studentId;
    if (req.user!.role === 'student') {
      const student = await Student.findOne({ user: req.user!._id });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      studentRef = student._id;
    }

    const leave = await Leave.create({
      student: studentRef,
      appliedBy: req.user!._id,
      institution: req.user!.institution,
      type,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
    });

    await leave.populate([
      { path: 'student', populate: { path: 'user', select: 'name' } },
      { path: 'appliedBy', select: 'name role' },
    ]);

    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/leave/:id/review — teacher/admin/principal approves or rejects
export const reviewLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reviewedBy: req.user!._id,
          reviewedAt: new Date(),
          reviewNote,
        }
      },
      { new: true }
    ).populate([
      { path: 'student', populate: { path: 'user', select: 'name' } },
      { path: 'reviewedBy', select: 'name role' },
    ]);

    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/leave/:id — cancel pending leave (applicant only)
export const cancelLeave = async (req: AuthRequest, res: Response) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ message: 'Only pending leaves can be cancelled' });
    if (leave.appliedBy.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this leave' });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
