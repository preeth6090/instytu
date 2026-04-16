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
  const sep = s.separator || '-';
  const yearPart = s.resetYearly ? `${s.currentYear}${sep}` : '';
  const suffix = s.suffix ? `${sep}${s.suffix}` : '';
  return `${s.prefix}${sep}${yearPart}${seq}${suffix}`;
};

// GET /api/invoices?student=&studentId=&from=&to=
router.get('/', authenticate, async (req: any, res) => {
  try {
    // Accept both ?student= and ?studentId= for compatibility
    const studentId = (req.query.student || req.query.studentId) as string;
    const { from, to } = req.query;
    const filter: any = { institution: req.user.institution };
    if (studentId) filter.student = studentId;
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from as string);
      if (to) filter.paymentDate.$lte = new Date(to as string);
    }
    const invoices = await Invoice.find(filter)
      .populate({ path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] })
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

// POST /api/invoices/collect
// Accepts per-fee payment amounts with per-fee modes.
// Groups by payment mode → creates one invoice per mode group.
// Handles partial payments correctly.
router.post('/collect', authenticate, async (req: any, res) => {
  try {
    const {
      studentId,
      feePayments,   // [{ feeId, feeName, feeAmount, payAmount, mode, bundleName? }]
      paymentDate,
      transactionRef,
      chequeNo,
      ddNo,
      bankName,
      notes,
      academicYear,
    } = req.body;

    if (!studentId || !feePayments?.length) {
      return res.status(400).json({ message: 'studentId and feePayments are required' });
    }

    const inst = await Institution.findById(req.user.institution);
    if (!inst) return res.status(404).json({ message: 'Institution not found' });

    // Freeze school snapshot
    const schoolSnapshot = {
      name: inst.name,
      address: inst.address,
      phone: inst.phone,
      email: inst.email,
      gstn: inst.gstn,
      gstPercentage: inst.gstPercentage,
      logo: inst.logo,
      headerText: inst.invoiceSettings?.headerText,
      footerText: inst.invoiceSettings?.footerText,
      terms: inst.invoiceSettings?.terms,
    };

    // Filter out zero/negative amounts
    const validPayments = feePayments.filter((p: any) => p.payAmount > 0);
    if (!validPayments.length) {
      return res.status(400).json({ message: 'No payment amounts entered' });
    }

    // Group by mode
    const groups: Record<string, typeof validPayments> = {};
    for (const p of validPayments) {
      const mode = p.mode || 'cash';
      if (!groups[mode]) groups[mode] = [];
      groups[mode].push(p);
    }

    const CONCESSION_MODES = new Set(['concession', 'scholarship', 'fee_reduction']);
    const createdInvoices: any[] = [];

    for (const [mode, payments] of Object.entries(groups)) {
      const isConcession = CONCESSION_MODES.has(mode);
      let invoiceNumber: string | undefined;

      if (!isConcession) {
        invoiceNumber = await generateInvoiceNumber(req.user.institution.toString());
      }

      const lineItems = payments.map((p: any) => ({
        description: p.feeName,
        amount: p.payAmount,
        taxable: false,
        taxAmount: 0,
      }));

      const total = payments.reduce((s: number, p: any) => s + p.payAmount, 0);

      const invoice = await Invoice.create({
        invoiceNumber,
        student: studentId,
        institution: req.user.institution,
        feeIds: payments.map((p: any) => p.feeId),
        lineItems,
        discounts: [],
        subtotal: total,
        totalDiscount: 0,
        totalTax: 0,
        total,
        paymentMode: mode,
        chequeNo: chequeNo || undefined,
        ddNo: ddNo || undefined,
        bankName: bankName || undefined,
        transactionRef: transactionRef || undefined,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        isConcessionOnly: isConcession,
        schoolSnapshot,
        generatedBy: req.user._id,
        academicYear: academicYear || '2025-26',
      });

      // Update each fee individually (partial payment support)
      for (const p of payments) {
        const fee = await Fee.findById(p.feeId);
        if (!fee) continue;

        const prevPaid = fee.amountPaid || 0;
        const newPaid = Math.min(prevPaid + p.payAmount, fee.amount); // don't exceed face value
        const newStatus = newPaid >= fee.amount ? 'paid' : 'partial';

        await Fee.findByIdAndUpdate(p.feeId, {
          amountPaid: newPaid,
          status: newStatus,
          paymentMode: mode,
          invoiceId: invoice._id,
          collectedBy: req.user._id,
          ...(newStatus === 'paid' ? { paidAt: new Date() } : {}),
          ...(notes ? { notes } : {}),
        });
      }

      await invoice.populate([
        { path: 'student', populate: [{ path: 'user', select: 'name' }, { path: 'class', select: 'name' }] },
      ]);

      createdInvoices.push(invoice);
    }

    res.status(201).json({ invoices: createdInvoices });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// POST /api/invoices — legacy single-invoice creation (kept for compatibility)
router.post('/', authenticate, async (req: any, res) => {
  try {
    const {
      studentId, feeIds, lineItems, discounts, subtotal,
      totalDiscount, totalTax, total, paymentMode, chequeNo, ddNo,
      bankName, transactionRef, campusId, isConcessionOnly, academicYear,
    } = req.body;

    const inst = await Institution.findById(req.user.institution);
    if (!inst) return res.status(404).json({ message: 'Institution not found' });

    let invoiceNumber: string | undefined;
    if (!isConcessionOnly) {
      invoiceNumber = await generateInvoiceNumber(req.user.institution.toString());
    }

    const schoolSnapshot = {
      name: inst.name, address: inst.address, phone: inst.phone, email: inst.email,
      gstn: inst.gstn, gstPercentage: inst.gstPercentage, logo: inst.logo,
      headerText: inst.invoiceSettings.headerText,
      footerText: inst.invoiceSettings.footerText,
      terms: inst.invoiceSettings.terms,
    };

    const invoice = await Invoice.create({
      invoiceNumber, student: studentId, institution: req.user.institution,
      campus: campusId, feeIds: feeIds || [], lineItems: lineItems || [],
      discounts: discounts || [], subtotal, totalDiscount: totalDiscount || 0,
      totalTax: totalTax || 0, total, paymentMode, chequeNo, ddNo, bankName, transactionRef,
      isConcessionOnly: !!isConcessionOnly, schoolSnapshot,
      generatedBy: req.user._id, academicYear: academicYear || '2025-26',
    });

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
