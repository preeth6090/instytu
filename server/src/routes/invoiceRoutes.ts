import express from 'express';
import { protect as authenticate } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Institution from '../models/Institution';
import Fee from '../models/Fee';

const router = express.Router();

// Generate next invoice number atomically
const generateInvoiceNumber = async (institutionId: string): Promise<string> => {
  const inst = await Institution.findById(institutionId);
  if (!inst) throw new Error('Institution not found');
  const s = inst.invoiceSettings;
  const currentYear = new Date().getFullYear().toString();
  
  // Reset sequence if new year and resetYearly is on
  if (s.resetYearly && s.currentYear !== currentYear) {
    s.currentYear = currentYear;
    s.currentSequence = 0;
  }
  s.currentSequence += 1;
  await Institution.findByIdAndUpdate(institutionId, {
    'invoiceSettings.currentSequence': s.currentSequence,
    'invoiceSettings.currentYear': s.currentYear,
  });
  
  const seq = s.currentSequence.toString().padStart(4, '0');
  const yearPart = s.resetYearly ? `${s.currentYear}${s.separator}` : '';
  return `${s.prefix}${s.separator}${yearPart}${seq}${s.suffix ? s.separator + s.suffix : ''}`;
};

// GET /api/invoices?studentId=&from=&to=
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { studentId, from, to } = req.query;
    const filter: any = { institution: req.user.institution };
    if (studentId) filter.student = studentId;
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from as string);
      if (to) filter.paymentDate.$lte = new Date(to as string);
    }
    const invoices = await Invoice.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('campus', 'name')
      .populate('generatedBy', 'name')
      .sort({ paymentDate: -1 });
    res.json(invoices);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, institution: req.user.institution })
      .populate({ path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] })
      .populate('campus', 'name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/invoices — generate invoice and mark fees as paid
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { studentId, feeIds, lineItems, discounts, subtotal, totalDiscount, totalTax, total,
      paymentMode, chequeNo, ddNo, bankName, transactionRef, campusId, isConcessionOnly, academicYear } = req.body;

    const inst = await Institution.findById(req.user.institution);
    if (!inst) return res.status(404).json({ message: 'Institution not found' });

    // Only generate invoice number for actual payments (not concession-only)
    let invoiceNumber: string | undefined;
    if (!isConcessionOnly) {
      invoiceNumber = await generateInvoiceNumber(req.user.institution.toString());
    }

    // Freeze school details at time of generation
    const schoolSnapshot = {
      name: inst.name,
      address: inst.address,
      phone: inst.phone,
      email: inst.email,
      gstn: inst.gstn,
      gstPercentage: inst.gstPercentage,
      logo: inst.logo,
      headerText: inst.invoiceSettings.headerText,
      footerText: inst.invoiceSettings.footerText,
      terms: inst.invoiceSettings.terms,
    };

    const invoice = await Invoice.create({
      invoiceNumber,
      student: studentId,
      institution: req.user.institution,
      campus: campusId,
      feeIds: feeIds || [],
      lineItems: lineItems || [],
      discounts: discounts || [],
      subtotal, totalDiscount: totalDiscount || 0, totalTax: totalTax || 0, total,
      paymentMode, chequeNo, ddNo, bankName, transactionRef,
      isConcessionOnly: !!isConcessionOnly,
      schoolSnapshot,
      generatedBy: req.user._id,
      academicYear: academicYear || '2025-26',
    });

    // Mark referenced fees as paid
    if (feeIds?.length) {
      await Fee.updateMany(
        { _id: { $in: feeIds } },
        { $set: { status: 'paid', paidAt: new Date(), paymentMode, invoiceId: invoice._id, collectedBy: req.user._id, amountPaid: total } }
      );
    }

    await invoice.populate([
      { path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] },
      { path: 'campus', select: 'name' },
    ]);

    res.status(201).json(invoice);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// PUT /api/invoices/:id/void
router.put('/:id/void', authenticate, async (req: any, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, institution: req.user.institution },
      { isVoid: true, voidReason: req.body.reason },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
