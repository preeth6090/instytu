import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PTMSlot from '../models/PTMSlot';

// GET /api/ptm?teacherId=&date=
export const getPTMSlots = async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId, date } = req.query;
    const filter: any = { institution: req.user!.institution };

    if (teacherId) filter.teacher = teacherId;

    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    // Parents only see their own bookings + available slots
    if (req.user!.role === 'parent') {
      filter.$or = [{ status: 'available' }, { bookedBy: req.user!._id }];
    }

    const slots = await PTMSlot.find(filter)
      .populate('teacher', 'name avatar')
      .populate('bookedBy', 'name')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ date: 1, time: 1 });

    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/ptm — teacher/admin creates slots
export const createPTMSlot = async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, duration } = req.body;

    const slot = await PTMSlot.create({
      teacher: req.user!._id,
      institution: req.user!.institution,
      date: new Date(date),
      time,
      duration: duration || 15,
    });

    await slot.populate('teacher', 'name avatar');
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// POST /api/ptm/bulk — create multiple slots at once
export const createBulkPTMSlots = async (req: AuthRequest, res: Response) => {
  try {
    const { date, times, duration } = req.body; // times: ['09:00','09:15',...]

    const slots = times.map((time: string) => ({
      teacher: req.user!._id,
      institution: req.user!.institution,
      date: new Date(date),
      time,
      duration: duration || 15,
    }));

    const created = await PTMSlot.insertMany(slots);
    res.status(201).json({ message: `${created.length} slots created`, slots: created });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/ptm/:id/book — parent books a slot
export const bookSlot = async (req: AuthRequest, res: Response) => {
  try {
    const slot = await PTMSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.status !== 'available') return res.status(400).json({ message: 'Slot not available' });

    slot.status = 'booked';
    slot.bookedBy = req.user!._id as any;
    slot.student = req.body.studentId;
    await slot.save();

    await slot.populate('teacher', 'name avatar');
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// PUT /api/ptm/:id/cancel — cancel booking
export const cancelSlot = async (req: AuthRequest, res: Response) => {
  try {
    const slot = await PTMSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.bookedBy?.toString() !== req.user!._id.toString() && !['admin', 'teacher'].includes(req.user!.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    slot.status = 'available';
    slot.bookedBy = undefined;
    slot.student = undefined;
    await slot.save();

    res.json({ message: 'Booking cancelled', slot });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// DELETE /api/ptm/:id — delete slot (teacher/admin)
export const deleteSlot = async (req: AuthRequest, res: Response) => {
  try {
    await PTMSlot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
