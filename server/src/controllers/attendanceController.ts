import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Attendance from '../models/Attendance';
import Student from '../models/Student';

// GET /api/attendance?studentId=&month=&year=&classId=
export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, month, year } = req.query;
    const filter: any = { institution: req.user!.institution };

    if (studentId) filter.student = studentId;
    if (classId) filter.class = classId;

    if (month && year) {
      const from = new Date(Number(year), Number(month) - 1, 1);
      const to = new Date(Number(year), Number(month), 0, 23, 59, 59);
      filter.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(filter)
      .populate('student', 'rollNumber')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/attendance/my — student's own attendance
export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const { month, year } = req.query;
    const filter: any = { student: student._id };

    if (month && year) {
      const from = new Date(Number(year), Number(month) - 1, 1);
      const to = new Date(Number(year), Number(month), 0, 23, 59, 59);
      filter.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(filter).sort({ date: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/attendance/bulk — teacher marks attendance for whole class
// body: { classId, date, records: [{studentId, status, remarks}] }
export const markBulkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, date, records } = req.body;
    const attendanceDate = new Date(date);

    const ops = records.map((r: any) => ({
      updateOne: {
        filter: { student: r.studentId, date: attendanceDate },
        update: {
          $set: {
            student: r.studentId,
            class: classId,
            institution: req.user!.institution,
            date: attendanceDate,
            status: r.status,
            markedBy: req.user!._id,
            remarks: r.remarks,
          }
        },
        upsert: true,
      }
    }));

    await Attendance.bulkWrite(ops);
    res.json({ message: 'Attendance saved', count: records.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/attendance/:id — update single record
export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status, remarks: req.body.remarks } },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/attendance/stats?studentId= — attendance summary
export const getAttendanceStats = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.query;
    let sId = studentId;

    if (!sId) {
      const student = await Student.findOne({ user: req.user!._id });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      sId = student._id.toString();
    }

    const stats = await Attendance.aggregate([
      { $match: { student: new (await import('mongoose')).default.Types.ObjectId(sId as string) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: any = { present: 0, absent: 0, leave: 0, holiday: 0 };
    stats.forEach((s: any) => { result[s._id] = s.count; });
    result.total = result.present + result.absent + result.leave;
    result.percentage = result.total ? Math.round((result.present / result.total) * 100) : 0;

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
