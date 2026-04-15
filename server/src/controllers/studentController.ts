import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Class from '../models/Class';

// GET /api/students — all students in institution (admin/teacher)
export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, search } = req.query;
    const filter: any = { institution: req.user!.institution };
    if (classId) filter.class = classId;

    let students = await Student.find(filter)
      .populate('user', 'name email avatar')
      .populate('class', 'name grade section')
      .populate('parents', 'name email')
      .sort({ rollNumber: 1 });

    if (search) {
      const q = (search as string).toLowerCase();
      students = students.filter(s =>
        (s.user as any).name?.toLowerCase().includes(q) ||
        s.rollNumber?.toLowerCase().includes(q) ||
        s.admissionNo?.toLowerCase().includes(q)
      );
    }

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/students/me — logged-in student's own record
export const getMyStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findOne({ user: req.user!._id })
      .populate('user', 'name email avatar')
      .populate('class', 'name grade section subjects')
      .populate('parents', 'name email');

    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/students/by-parent — children of logged-in parent
export const getChildrenByParent = async (req: AuthRequest, res: Response) => {
  try {
    const children = await Student.find({ parents: req.user!._id })
      .populate('user', 'name email avatar')
      .populate('class', 'name grade section subjects');

    res.json(children);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// GET /api/students/:id
export const getStudent = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email avatar')
      .populate('class', 'name grade section')
      .populate('parents', 'name email');

    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/students — create student (admin)
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, classId, rollNumber, admissionNo,
            dateOfBirth, gender, phone, address, bloodGroup, busRoute, parentEmails } = req.body;

    // Create user account
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash(password || 'changeme123', 10);
    const user = await User.create({
      name, email,
      password: hashed,
      role: 'student',
      institution: req.user!.institution,
    });

    // Resolve parent user IDs
    let parentIds: any[] = [];
    if (parentEmails?.length) {
      const parents = await User.find({ email: { $in: parentEmails }, role: 'parent' });
      parentIds = parents.map(p => p._id);
    }

    const student = await Student.create({
      user: user._id,
      institution: req.user!.institution,
      class: classId,
      rollNumber,
      admissionNo,
      dateOfBirth,
      gender,
      phone,
      address,
      bloodGroup,
      busRoute,
      parents: parentIds,
    });

    await student.populate('user', 'name email');
    await student.populate('class', 'name grade section');
    res.status(201).json(student);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/students/:id — update student (admin)
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('user', 'name email').populate('class', 'name grade section');

    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/students/:id — soft delete (admin)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
