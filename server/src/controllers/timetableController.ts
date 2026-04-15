import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Timetable from '../models/Timetable';
import Student from '../models/Student';

// GET /api/timetable?classId=&academicYear=
export const getTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, academicYear } = req.query;
    const filter: any = { institution: req.user!.institution };
    if (classId) filter.class = classId;
    if (academicYear) filter.academicYear = academicYear;

    const timetable = await Timetable.findOne(filter)
      .populate('class', 'name grade section')
      .populate('updatedBy', 'name');

    res.json(timetable || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/timetable/my — student's own class timetable
export const getMyTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const timetable = await Timetable.findOne({ class: student.class })
      .populate('class', 'name grade section');

    res.json(timetable || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST/PUT /api/timetable — upsert full timetable for a class
export const upsertTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, schedule, academicYear } = req.body;

    const timetable = await Timetable.findOneAndUpdate(
      { class: classId, academicYear: academicYear || '2025-26' },
      {
        $set: {
          class: classId,
          institution: req.user!.institution,
          academicYear: academicYear || '2025-26',
          schedule,
          updatedBy: req.user!._id,
        }
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('class', 'name grade section');

    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
