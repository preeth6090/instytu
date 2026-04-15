import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Fee from '../models/Fee';
import Student from '../models/Student';

// GET /api/fees?studentId=&academicYear=
export const getFees = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, academicYear } = req.query;
    const filter: any = { institution: req.user!.institution };

    if (academicYear) filter.academicYear = academicYear;

    if (req.user!.role === 'student') {
      const student = await Student.findOne({ user: req.user!._id });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      filter.student = student._id;
    } else if (req.user!.role === 'parent') {
      const children = await Student.find({ parents: req.user!._id });
      if (studentId) {
        filter.student = studentId;
      } else {
        filter.student = { $in: children.map(c => c._id) };
      }
    } else if (studentId) {
      filter.student = studentId;
    }

    const fees = await Fee.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ dueDate: 1 });

    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/fees — admin creates fee record
export const createFee = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, title, amount, dueDate, academicYear } = req.body;

    const fee = await Fee.create({
      student: studentId,
      institution: req.user!.institution,
      title,
      amount,
      dueDate: new Date(dueDate),
      academicYear: academicYear || '2025-26',
      createdBy: req.user!._id,
    });

    await fee.populate({ path: 'student', populate: { path: 'user', select: 'name' } });
    res.status(201).json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/fees/bulk — create fee for entire class
export const createBulkFees = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, title, amount, dueDate, academicYear } = req.body;

    const students = await Student.find({ class: classId, institution: req.user!.institution });
    if (!students.length) return res.status(404).json({ message: 'No students found in class' });

    const fees = students.map(s => ({
      student: s._id,
      institution: req.user!.institution,
      title, amount,
      dueDate: new Date(dueDate),
      academicYear: academicYear || '2025-26',
      createdBy: req.user!._id,
    }));

    const created = await Fee.insertMany(fees);
    res.status(201).json({ message: `Created ${created.length} fee records`, count: created.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/fees/:id/pay — mark as paid (admin or online payment callback)
export const markFeePaid = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMode, transactionId } = req.body;

    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          paymentMode: paymentMode || 'online',
          transactionId,
        }
      },
      { new: true }
    );

    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    res.json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/fees/:id
export const deleteFee = async (req: AuthRequest, res: Response) => {
  try {
    await Fee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fee record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
