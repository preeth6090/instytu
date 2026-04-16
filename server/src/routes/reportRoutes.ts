import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Fee from '../models/Fee';

const router = express.Router();

// GET /api/reports/fees?from=&to=&campusId=&paymentMode=&academicYear=
router.get('/fees', authenticate, async (req: any, res) => {
  try {
    const { from, to, campusId, paymentMode, academicYear } = req.query;
    const filter: any = { institution: req.user.institution, isConcessionOnly: false };
    
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from as string);
      if (to) { const d = new Date(to as string); d.setHours(23,59,59,999); filter.paymentDate.$lte = d; }
    }
    if (campusId) filter.campus = campusId;
    if (paymentMode) filter.paymentMode = paymentMode;
    if (academicYear) filter.academicYear = academicYear;
    filter.isVoid = false;

    const invoices = await Invoice.find(filter)
      .populate({ path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] })
      .populate('campus', 'name code')
      .populate('generatedBy', 'name')
      .sort({ paymentDate: -1 });

    // Summary stats
    const summary = {
      total: invoices.reduce((s, i) => s + i.total, 0),
      count: invoices.length,
      byMode: {} as Record<string, number>,
      byCampus: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };
    invoices.forEach(inv => {
      summary.byMode[inv.paymentMode] = (summary.byMode[inv.paymentMode] || 0) + inv.total;
      const campusName = (inv.campus as any)?.name || 'Main';
      summary.byCampus[campusName] = (summary.byCampus[campusName] || 0) + inv.total;
      const day = new Date(inv.paymentDate).toISOString().slice(0, 10);
      summary.byDay[day] = (summary.byDay[day] || 0) + inv.total;
    });

    res.json({ invoices, summary });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/reports/pending?campusId=&academicYear=
router.get('/pending', authenticate, async (req: any, res) => {
  try {
    const { campusId, academicYear } = req.query;
    const filter: any = { institution: req.user.institution, status: { $in: ['pending','overdue','partial'] } };
    if (campusId) filter.campus = campusId;
    if (academicYear) filter.academicYear = academicYear;

    const fees = await Fee.find(filter)
      .populate({ path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] })
      .populate('campus', 'name')
      .sort({ dueDate: 1 });

    const totalPending = fees.reduce((s, f) => s + f.amount, 0);
    res.json({ fees, totalPending });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
