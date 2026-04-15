import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Grade from '../models/Grade';
import Student from '../models/Student';

// GET /api/grades?studentId=&term=&academicYear=
export const getGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, term, academicYear } = req.query;
    const filter: any = { institution: req.user!.institution };

    if (studentId) filter.student = studentId;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    const grades = await Grade.find(filter)
      .populate('student', 'rollNumber')
      .populate('recordedBy', 'name')
      .sort({ subject: 1 });

    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/grades/my — student's own grades
export const getMyGrades = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const { term, academicYear } = req.query;
    const filter: any = { student: student._id };
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    const grades = await Grade.find(filter).sort({ subject: 1 });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/grades — create grade (teacher/admin)
export const createGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, subject, term, marks, maxMarks, examType, academicYear } = req.body;

    const grade = await Grade.findOneAndUpdate(
      { student: studentId, subject, term, academicYear: academicYear || '2025-26' },
      {
        $set: {
          student: studentId,
          class: classId,
          institution: req.user!.institution,
          subject, term, marks,
          maxMarks: maxMarks || 100,
          examType,
          recordedBy: req.user!._id,
          academicYear: academicYear || '2025-26',
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(grade);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/grades/:id
export const updateGrade = async (req: AuthRequest, res: Response) => {
  try {
    const grade = await Grade.findByIdAndUpdate(
      req.params.id,
      { $set: { marks: req.body.marks, maxMarks: req.body.maxMarks, examType: req.body.examType } },
      { new: true, runValidators: true }
    );
    if (!grade) return res.status(404).json({ message: 'Grade not found' });
    res.json(grade);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/grades/:id
export const deleteGrade = async (req: AuthRequest, res: Response) => {
  try {
    await Grade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Grade deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/grades/bulk — upsert multiple grades at once
export const bulkUpsertGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { grades } = req.body; // [{ studentId, classId, subject, term, marks, maxMarks }]

    const ops = grades.map((g: any) => ({
      updateOne: {
        filter: { student: g.studentId, subject: g.subject, term: g.term, academicYear: g.academicYear || '2025-26' },
        update: {
          $set: {
            student: g.studentId,
            class: g.classId,
            institution: req.user!.institution,
            subject: g.subject,
            term: g.term,
            marks: g.marks,
            maxMarks: g.maxMarks || 100,
            recordedBy: req.user!._id,
            academicYear: g.academicYear || '2025-26',
          }
        },
        upsert: true,
      }
    }));

    const result = await Grade.bulkWrite(ops);
    res.json({ message: 'Grades saved', modified: result.modifiedCount, inserted: result.upsertedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
