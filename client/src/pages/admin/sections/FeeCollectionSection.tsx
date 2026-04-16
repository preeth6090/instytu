import React, { useEffect, useRef, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'dd', label: 'DD' },
  { value: 'online_transfer', label: 'Online Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash_deposit', label: 'Cash Deposit' },
  { value: 'upi', label: 'UPI' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'concession', label: 'Concession' },
  { value: 'fee_reduction', label: 'Fee Reduction' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtAmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

interface Student {
  _id: string;
  user: { name: string; email: string };
  rollNumber: string;
  admissionNo?: string;
  dateOfBirth?: string;
  phone?: string;
  class?: { _id: string; name: string };
  campus?: { _id: string; name: string };
  parents?: { _id: string; name: string; email: string }[];
}

interface Fee {
  _id: string;
  title: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'overdue' | 'paid' | 'waived';
  bundle?: { _id: string; name: string };
  academicYear: string;
  notes?: string;
  // GST info (from bundle component if applicable)
  taxable?: boolean;
  taxType?: string;
  taxRate?: number;
}

interface LineItem {
  description: string;
  amount: number;
  taxable?: boolean;
  taxType?: string;
  taxRate?: number;
  taxAmount?: number;
}

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  createdAt: string;
  paymentDate: string;
  subtotal: number;
  totalTax: number;
  total: number;
  paymentMode: string;
  chequeNo?: string;
  ddNo?: string;
  transactionRef?: string;
  lineItems: LineItem[];
  discounts?: { description: string; amount: number }[];
  isVoid: boolean;
  isConcessionOnly: boolean;
  schoolSnapshot: any;
  studentSnapshot?: any;
  student: any;
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-orange-100 text-orange-700',
  overdue: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-400',
};

const FeeCollectionSection = ({ role }: { role: string }) => {
  // ── Search ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);

  // ── Selected student ────────────────────────────────────
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');

  // ── Payment form ─────────────────────────────────────────
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({}); // feeId → string
  const [payModes, setPayModes] = useState<Record<string, string>>({});     // feeId → mode
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [transactionRef, setTransactionRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // ── Confirmation / processing ───────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  // ── Print ────────────────────────────────────────────────
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // ── Search debounce ──────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!search.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.get(`/students?search=${encodeURIComponent(search)}`);
        setResults(Array.isArray(r.data) ? r.data : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [search]);

  const selectStudent = async (s: Student) => {
    setStudent(s); setResults([]); setSearch('');
    setPayAmounts({}); setPayModes({}); setActiveTab('payment');
    setLoadingData(true);
    try {
      const [fRes, iRes] = await Promise.all([
        api.get(`/fees?student=${s._id}`),
        api.get(`/invoices?student=${s._id}`),
      ]);
      const feeList: Fee[] = Array.isArray(fRes.data) ? fRes.data : fRes.data.fees || [];
      setFees(feeList);
      // Init modes to 'cash' for all pending fees
      const modes: Record<string, string> = {};
      feeList.forEach(f => { if (f.status !== 'paid' && f.status !== 'waived') modes[f._id] = 'cash'; });
      setPayModes(modes);
      setInvoices(Array.isArray(iRes.data) ? iRes.data : iRes.data.invoices || []);
    } catch { setFees([]); setInvoices([]); }
    finally { setLoadingData(false); }
  };

  const pendingFees = fees.filter(f => f.status !== 'paid' && f.status !== 'waived');

  // ── Quick amount distribution ─────────────────────────────
  const distributeAmount = (totalStr: string) => {
    const total = parseFloat(totalStr) || 0;
    if (!total) { setPayAmounts({}); return; }
    let remaining = total;
    const newAmounts: Record<string, string> = {};
    for (const fee of pendingFees) {
      const balance = fee.amount - (fee.amountPaid || 0);
      const pay = Math.min(balance, remaining);
      if (pay > 0) newAmounts[fee._id] = String(pay);
      remaining -= pay;
      if (remaining <= 0) break;
    }
    setPayAmounts(newAmounts);
  };

  // ── Computed totals ──────────────────────────────────────
  const payingItems = pendingFees
    .map(f => ({ fee: f, amount: parseFloat(payAmounts[f._id] || '0') || 0, mode: payModes[f._id] || 'cash' }))
    .filter(x => x.amount > 0);

  const payingTotal = payingItems.reduce((s, x) => s + x.amount, 0);

  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
    + fees.filter(f => f.status === 'partial').reduce((s, f) => s + (f.amountPaid || 0), 0);
  const totalBalance = fees.reduce((s, f) => s + Math.max(0, f.amount - (f.amountPaid || 0)), 0);

  // ── Confirm & Pay ─────────────────────────────────────────
  const confirmPay = async () => {
    if (!student || payingItems.length === 0) return;
    setProcessing(true); setProcessError('');
    try {
      const r = await api.post('/invoices/collect', {
        studentId: student._id,
        feePayments: payingItems.map(x => {
          const taxAmt = x.fee.taxable && x.fee.taxRate
            ? Math.round(x.amount * (x.fee.taxRate / 100) * 100) / 100 : 0;
          return {
            feeId: x.fee._id,
            feeName: x.fee.title,
            feeAmount: x.fee.amount,
            payAmount: x.amount,
            mode: x.mode,
            bundleName: x.fee.bundle?.name,
            taxable: x.fee.taxable || false,
            taxType: x.fee.taxType || 'none',
            taxRate: x.fee.taxRate || 0,
            taxAmount: taxAmt,
          };
        }),
        paymentDate,
        transactionRef: transactionRef || undefined,
        notes: payNotes || undefined,
        academicYear: pendingFees[0]?.academicYear || '2025-26',
      });

      // Refresh data
      const [fRes, iRes] = await Promise.all([
        api.get(`/fees?student=${student._id}`),
        api.get(`/invoices?student=${student._id}`),
      ]);
      setFees(Array.isArray(fRes.data) ? fRes.data : fRes.data.fees || []);
      const newInvoices: Invoice[] = Array.isArray(iRes.data) ? iRes.data : iRes.data.invoices || [];
      setInvoices(newInvoices);

      // Reset form
      setPayAmounts({}); setTransactionRef(''); setPayNotes(''); setQuickAmount('');
      setShowConfirm(false);
      setActiveTab('history');

      // Auto-print first invoice from this batch
      if (r.data.invoices?.length) setPrintInvoice(r.data.invoices[0]);
    } catch (e: any) {
      setProcessError(e.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const canCollect = role === 'admin' || role === 'superadmin' || role === 'staff';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Fee Collection</h2>
        <p className="text-sm text-gray-500 mt-1">Search for a student to view dues and collect fees</p>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <input
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm pr-10"
          placeholder="Search student by name, roll number, or admission number..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        {searching && <div className="absolute right-4 top-3.5"><Spinner /></div>}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 z-20 overflow-hidden max-h-72 overflow-y-auto">
            {results.map(s => (
              <button key={s._id} onClick={() => selectStudent(s)}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition border-b last:border-0 flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {s.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{s.user?.name}</p>
                  <p className="text-xs text-gray-500">
                    Roll: {s.rollNumber}
                    {s.admissionNo && ` · Adm: ${s.admissionNo}`}
                    {s.class?.name && ` · ${s.class.name}`}
                    {s.campus?.name && ` · ${s.campus.name}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── LEFT PANEL (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Student Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl flex-shrink-0">
                    {student.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{student.user?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {student.class?.name && <span>{student.class.name}</span>}
                      {student.campus?.name && <span> · {student.campus.name}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setStudent(null); setFees([]); setInvoices([]); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                  Change Student
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-gray-400">Student ID</p>
                  <p className="font-medium text-gray-700">{student.admissionNo || student.rollNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Roll Number</p>
                  <p className="font-medium text-gray-700">{student.rollNumber}</p>
                </div>
                {student.parents?.[0] && (
                  <div>
                    <p className="text-xs text-gray-400">Parent / Guardian</p>
                    <p className="font-medium text-gray-700">{student.parents[0].name}</p>
                  </div>
                )}
                {student.phone && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-medium text-gray-700">{student.phone}</p>
                  </div>
                )}
                {student.dateOfBirth && (
                  <div>
                    <p className="text-xs text-gray-400">Date of Birth</p>
                    <p className="font-medium text-gray-700">{fmtDate(student.dateOfBirth)}</p>
                  </div>
                )}
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Amount Paid</p>
                  <p className="text-lg font-bold text-green-700">{fmtAmt(totalPaid)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Balance Due</p>
                  <p className="text-lg font-bold text-red-700">{fmtAmt(totalBalance)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">Unallocated</p>
                  <p className="text-lg font-bold text-gray-600">₹0</p>
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                  {(['payment', 'history'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`px-5 py-2 text-sm rounded-lg font-medium transition ${activeTab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t === 'payment' ? 'New Payment' : 'History'}
                    </button>
                  ))}
                </div>

                {activeTab === 'payment' ? (
                  /* ── NEW PAYMENT TAB ── */
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    {pendingFees.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-2">✅</p>
                        <p className="font-medium">All fees are cleared</p>
                      </div>
                    ) : (
                      <>
                        {/* Payment header controls */}
                        {canCollect && (
                          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Enter Total Amount</label>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-400">₹</span>
                                <input
                                  type="number" min={0} placeholder="0"
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  value={quickAmount}
                                  onChange={e => { setQuickAmount(e.target.value); distributeAmount(e.target.value); }}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Payment Date</label>
                              <input type="date"
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-gray-500 block mb-1">Reference / Cheque No / UTR</label>
                              <input
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={transactionRef} onChange={e => setTransactionRef(e.target.value)}
                                placeholder="Optional" />
                            </div>
                          </div>
                        )}

                        {/* Fee table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="text-left px-4 py-3 text-gray-500 font-medium">Due Date</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fee</th>
                                <th className="text-left px-4 py-3 text-gray-500 font-medium">Mode</th>
                                <th className="text-right px-4 py-3 text-gray-500 font-medium">Balance</th>
                                <th className="text-right px-4 py-3 text-gray-500 font-medium">Payment ₹</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {pendingFees.map(fee => {
                                const balance = fee.amount - (fee.amountPaid || 0);
                                const payAmt = payAmounts[fee._id] || '';
                                const isOverpay = parseFloat(payAmt) > balance;
                                return (
                                  <tr key={fee._id} className={`hover:bg-gray-50 ${parseFloat(payAmt) > 0 ? 'bg-indigo-50/30' : ''}`}>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(fee.dueDate)}</td>
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-gray-900">{fee.title}</p>
                                      {fee.bundle && <p className="text-xs text-gray-400">{fee.bundle.name}</p>}
                                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded capitalize mt-0.5 ${statusColor[fee.status]}`}>{fee.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {canCollect ? (
                                        <select
                                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                          value={payModes[fee._id] || 'cash'}
                                          onChange={e => setPayModes(m => ({ ...m, [fee._id]: e.target.value }))}>
                                          {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                      ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">{fmtAmt(balance)}</td>
                                    <td className="px-4 py-3 text-right">
                                      {canCollect ? (
                                        <div className={`flex items-center justify-end gap-1 ${isOverpay ? 'text-red-500' : ''}`}>
                                          <span className="text-gray-400">₹</span>
                                          <input
                                            type="number" min={0} max={balance} step={1}
                                            className={`w-28 border rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isOverpay ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                            placeholder="0"
                                            value={payAmt}
                                            onChange={e => setPayAmounts(a => ({ ...a, [fee._id]: e.target.value }))}
                                          />
                                        </div>
                                      ) : <span className="text-gray-400">—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-200 bg-gray-50">
                                <td colSpan={3} className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-right text-sm text-gray-500 font-medium">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-600 text-base">{fmtAmt(payingTotal)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {canCollect && (
                          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Notes</label>
                              <input
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64"
                                value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional remarks" />
                            </div>
                            <button
                              onClick={() => setShowConfirm(true)}
                              disabled={payingTotal === 0}
                              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow transition">
                              Confirm & Pay {payingTotal > 0 ? fmtAmt(payingTotal) : ''}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* ── HISTORY TAB ── */
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    {invoices.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-2">📄</p>
                        <p>No payment history yet</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Receipt #</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Fees Covered</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Mode</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Amount</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {invoices.map(inv => (
                            <tr key={inv._id} className={`hover:bg-gray-50 ${inv.isVoid ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(inv.paymentDate || inv.createdAt)}</td>
                              <td className="px-4 py-3 font-mono text-indigo-600 text-xs">
                                {inv.invoiceNumber || <span className="text-gray-400 italic">No #</span>}
                                {inv.isVoid && <span className="ml-1 bg-red-100 text-red-600 text-xs px-1 rounded">VOID</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                                {inv.lineItems?.map((li: any) => li.description).join(', ')}
                              </td>
                              <td className="px-4 py-3 text-gray-500 capitalize text-xs">{inv.paymentMode?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3 text-right font-bold">{fmtAmt(inv.total)}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setPrintInvoice(inv)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800">Print</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-500">Total</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {fmtAmt(invoices.filter(i => !i.isVoid).reduce((s, i) => s + i.total, 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT PANEL (1/3) ── */}
          <div className="space-y-4">
            {/* Compact transaction history */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="font-semibold text-gray-800">Transaction History</p>
              </div>
              {loadingData ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : invoices.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No transactions</p>
              ) : (
                <div>
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {invoices.filter(i => !i.isVoid).map(inv => (
                      <div key={inv._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                        <div>
                          <p className="text-xs text-gray-500">{fmtDate(inv.paymentDate || inv.createdAt)}</p>
                          <p className="text-xs text-gray-400 capitalize">{inv.paymentMode?.replace(/_/g, ' ')}</p>
                        </div>
                        <p className={`font-bold text-sm ${inv.isConcessionOnly ? 'text-orange-500' : 'text-gray-900'}`}>
                          {inv.isConcessionOnly ? '−' : ''}{fmtAmt(inv.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t px-4 py-3 flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {fmtAmt(invoices.filter(i => !i.isVoid && !i.isConcessionOnly).reduce((s, i) => s + i.total, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fee breakdown by status */}
            {fees.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <p className="font-semibold text-gray-800">Fee Breakdown</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {fees.map(f => (
                    <div key={f._id} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{f.title}</p>
                        <p className="text-xs text-gray-400">{fmtDate(f.dueDate)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmtAmt(f.amount)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${statusColor[f.status]}`}>{f.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {showConfirm && student && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Payment</h3>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="bg-indigo-50 rounded-xl p-4 mb-5">
                <p className="font-semibold text-indigo-900">{student.user?.name}</p>
                <p className="text-xs text-indigo-600">{student.class?.name} · {student.campus?.name || 'No campus'}</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left pb-2 font-medium">Fee</th>
                    <th className="text-left pb-2 font-medium">Mode</th>
                    <th className="text-right pb-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payingItems.map(x => (
                    <tr key={x.fee._id}>
                      <td className="py-2 text-gray-800">{x.fee.title}</td>
                      <td className="py-2 text-gray-500 capitalize text-xs">{x.mode.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right font-medium">{fmtAmt(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td colSpan={2} className="pt-3">Total</td>
                    <td className="pt-3 text-right text-indigo-600 text-lg">{fmtAmt(payingTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mb-4">
                <div><span className="font-medium">Date:</span> {new Date(paymentDate).toLocaleDateString('en-IN')}</div>
                {transactionRef && <div><span className="font-medium">Ref:</span> {transactionRef}</div>}
                {payNotes && <div className="col-span-2"><span className="font-medium">Notes:</span> {payNotes}</div>}
              </div>
              {processError && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm mb-4">{processError}</div>}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={processing}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Go Back
              </button>
              <button onClick={confirmPay} disabled={processing}
                className="px-6 py-2.5 text-sm bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow">
                {processing && <Spinner />}
                {processing ? 'Processing...' : `Confirm Payment ${fmtAmt(payingTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Modal ── */}
      {printInvoice && <InvoicePrintModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}
    </div>
  );
};

/* ──────────────────────────────────────────────── */
/* Invoice Print Modal                             */
/* ──────────────────────────────────────────────── */
const modeLabel = (mode: string) => mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const fmtINR = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const InvoicePrintModal = ({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) => {
  const ss = invoice.schoolSnapshot || {} as any;
  const stu = invoice.studentSnapshot || {} as any;
  const showGST = !!ss.showGST;
  const showBankDetails = !!ss.showBankDetails;
  const dateStr = new Date(invoice.paymentDate || invoice.createdAt)
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Per-line GST split helper
  const gstSplit = (li: any) => {
    const taxAmt = li.taxAmount || 0;
    if (!taxAmt) return { cgst: 0, sgst: 0, igst: 0 };
    const taxType = (li.taxType || 'cgst_sgst').toLowerCase();
    if (taxType === 'igst') return { cgst: 0, sgst: 0, igst: taxAmt };
    return { cgst: taxAmt / 2, sgst: taxAmt / 2, igst: 0 };
  };

  const totalTax = invoice.totalTax || 0;
  const subtotal = invoice.subtotal || (invoice.total - totalTax);

  const buildHTML = () => {
    const lineRows = (invoice.lineItems || []).map((li: any, i: number) => {
      const base = showGST ? (li.amount - (li.taxAmount || 0)) : li.amount;
      const split = gstSplit(li);
      const taxType = (li.taxType || 'cgst_sgst').toLowerCase();
      const gstCell = showGST ? `
        <td style="text-align:right;padding:7px 8px">${li.taxRate ? li.taxRate + '%' : '—'}</td>
        <td style="text-align:center;padding:7px 8px;font-size:11px">
          ${li.taxAmount ? (taxType === 'igst'
            ? `IGST: ₹${split.igst.toFixed(2)}`
            : `CGST: ₹${split.cgst.toFixed(2)}<br>SGST: ₹${split.sgst.toFixed(2)}`) : '—'}
        </td>` : '';
      const modeCell = `<td style="padding:7px 8px">
        <span>${modeLabel(invoice.paymentMode)}</span>
        ${invoice.chequeNo ? `<br><span style="color:#6b7280;font-size:10px">Cheque: ${invoice.chequeNo}</span>` : ''}
        ${invoice.ddNo ? `<br><span style="color:#6b7280;font-size:10px">DD: ${invoice.ddNo}</span>` : ''}
        ${invoice.transactionRef && !invoice.chequeNo && !invoice.ddNo ? `<br><span style="color:#6b7280;font-size:10px">Ref: ${invoice.transactionRef}</span>` : ''}
      </td>`;
      return `<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:7px 8px;text-align:center">${i + 1}</td>
        <td style="padding:7px 8px">${li.description || ''}</td>
        ${modeCell}
        <td style="text-align:right;padding:7px 8px">${showGST ? fmtINR(base) : fmtINR(li.amount)}</td>
        ${gstCell}
        <td style="text-align:right;padding:7px 8px;font-weight:600">${fmtINR(li.amount)}</td>
      </tr>`;
    }).join('');

    const gstHeaders = showGST ? `<th style="${thStyle}text-align:right">GST %</th><th style="${thStyle}text-align:center">GST Breakup</th>` : '';
    const amtHeader = showGST ? 'Base Amt' : 'Amount';

    return `<!DOCTYPE html><html><head><title>Fee Receipt ${invoice.invoiceNumber || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; padding: 28px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .school-name { font-size: 20px; font-weight: 800; color: #111827; }
  .school-meta { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.5; }
  .divider { border: none; border-top: 2px solid #1f2937; margin: 10px 0 6px; }
  .divider2 { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }
  .title-row { text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0; }
  .stu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; padding: 10px 0; font-size: 12px; }
  .stu-grid .lbl { color: #6b7280; font-size: 10px; text-transform: uppercase; }
  .stu-grid .val { font-weight: 600; color: #111827; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f9fafb; padding: 8px; font-size: 11px; color: #6b7280; border-top: 2px solid #1f2937; border-bottom: 1px solid #d1d5db; text-align: left; font-weight: 700; }
  td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  .total-row td { font-weight: 700; background: #f9fafb; border-top: 2px solid #1f2937; border-bottom: 2px solid #1f2937; font-size: 13px; }
  .footer-note { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 28px; border-top: 1px dashed #d1d5db; padding-top: 10px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 80px; color: rgba(0,0,0,0.04); font-weight: 900; z-index: -1; white-space: nowrap; }
  @media print { body { padding: 0 16px; } .no-print { display: none !important; } }
</style></head><body>
${invoice.isVoid ? '<div class="watermark">VOID</div>' : ''}
<div class="header">
  ${ss.logo ? `<img src="${ss.logo}" style="max-height:60px;max-width:140px;object-fit:contain">` : '<div></div>'}
  <div style="text-align:right">
    <div class="school-name">${ss.name || ''}</div>
    ${ss.showAddress && ss.address ? `<div class="school-meta">${ss.address}</div>` : ''}
    ${ss.showPhone && ss.phone ? `<div class="school-meta">Ph: ${ss.phone}</div>` : ''}
    ${ss.email ? `<div class="school-meta">${ss.email}</div>` : ''}
    ${ss.gstn ? `<div class="school-meta" style="color:#374151;font-weight:600">GSTIN: ${ss.gstn}</div>` : ''}
    ${showBankDetails && ss.bankDetails ? `<div class="school-meta" style="margin-top:4px">${ss.bankDetails}</div>` : ''}
  </div>
</div>
<hr class="divider">
<div class="title-row">Fee Receipt</div>
<hr class="divider2">

<div class="stu-grid">
  <div><div class="lbl">Student ID</div><div class="val">${stu.studentId || stu.rollNumber || invoice.student?.admissionNo || invoice.student?.rollNumber || '—'}</div></div>
  <div><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
  <div><div class="lbl">Student Name</div><div class="val">${stu.name || invoice.student?.user?.name || '—'}</div></div>
  <div><div class="lbl">Receipt No.</div><div class="val">${invoice.invoiceNumber || 'N/A (Concession)'}</div></div>
  ${stu.parentName ? `<div><div class="lbl">Father's Name</div><div class="val">${stu.parentName}</div></div>` : '<div></div>'}
  ${stu.parentPhone ? `<div><div class="lbl">Father's Phone</div><div class="val">${stu.parentPhone}</div></div>` : '<div></div>'}
  ${stu.className ? `<div><div class="lbl">Classroom</div><div class="val">${stu.className}</div></div>` : '<div></div>'}
  ${stu.tags ? `<div><div class="lbl">Tags</div><div class="val">${stu.tags}</div></div>` : '<div></div>'}
</div>
<hr class="divider2">

<table>
  <thead>
    <tr>
      <th style="width:36px;text-align:center">S.NO</th>
      <th>Fee Item</th>
      <th>Mode</th>
      <th style="text-align:right">${amtHeader}</th>
      ${gstHeaders}
      <th style="text-align:right">Total Amount</th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="${showGST ? 3 : 3}" style="padding:8px">Grand Total</td>
      <td style="text-align:right;padding:8px">${fmtINR(subtotal)}</td>
      ${showGST ? `<td></td><td style="text-align:center;padding:8px;font-size:11px">Tax: ${fmtINR(totalTax)}</td>` : ''}
      <td style="text-align:right;padding:8px;color:#4f46e5">${fmtINR(invoice.total)}</td>
    </tr>
  </tfoot>
</table>

${ss.terms ? `<div style="margin-top:16px;font-size:11px;color:#374151"><strong>Terms:</strong> ${ss.terms}</div>` : ''}
${ss.footerText ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;text-align:center">${ss.footerText}</div>` : ''}
<div class="footer-note">This is a computer generated receipt. No signature is required.</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;
  };

  const thStyle = 'padding:8px;font-size:11px;color:#6b7280;border-top:2px solid #1f2937;border-bottom:1px solid #d1d5db;font-weight:700;background:#f9fafb;';

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildHTML());
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.invoiceNumber ? `Receipt: ${invoice.invoiceNumber}` : 'Receipt (Concession)'}
            </h3>
            {invoice.isVoid && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-2">VOID</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
              Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">&times;</button>
          </div>
        </div>

        {/* Preview pane */}
        <div className="overflow-y-auto p-5 flex-1">
          <div className="border border-gray-200 rounded-xl bg-white p-6 font-mono text-xs shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* School header */}
            <div className="flex justify-between items-start mb-2">
              {ss.logo && <img src={ss.logo} alt="logo" className="max-h-12 object-contain" />}
              <div className="text-right">
                <p className="text-base font-extrabold text-gray-900">{ss.name}</p>
                {ss.showAddress && ss.address && <p className="text-xs text-gray-500">{ss.address}</p>}
                {ss.showPhone && ss.phone && <p className="text-xs text-gray-500">Ph: {ss.phone}</p>}
                {ss.gstn && <p className="text-xs font-semibold text-gray-700">GSTIN: {ss.gstn}</p>}
                {showBankDetails && ss.bankDetails && <p className="text-xs text-gray-500 mt-1">{ss.bankDetails}</p>}
              </div>
            </div>
            <hr className="border-gray-800 border-t-2 my-2" />
            <p className="text-center font-bold tracking-widest text-sm uppercase text-gray-800 py-1">Fee Receipt</p>
            <hr className="border-gray-200 my-2" />

            {/* Student block */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
              <div><span className="text-gray-400 uppercase text-[10px]">Student ID</span><p className="font-semibold">{stu.studentId || stu.rollNumber || '—'}</p></div>
              <div><span className="text-gray-400 uppercase text-[10px]">Date</span><p className="font-semibold">{dateStr}</p></div>
              <div><span className="text-gray-400 uppercase text-[10px]">Student Name</span><p className="font-semibold">{stu.name || invoice.student?.user?.name || '—'}</p></div>
              <div><span className="text-gray-400 uppercase text-[10px]">Receipt No.</span><p className="font-semibold text-indigo-700">{invoice.invoiceNumber || 'N/A'}</p></div>
              {stu.parentName && <><div><span className="text-gray-400 uppercase text-[10px]">Father's Name</span><p className="font-semibold">{stu.parentName}</p></div><div /></>}
              {stu.className && <><div><span className="text-gray-400 uppercase text-[10px]">Classroom</span><p className="font-semibold">{stu.className}</p></div><div /></>}
            </div>
            <hr className="border-gray-200 mb-2" />

            {/* Fee table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-t-2 border-gray-800 border-b border-gray-300">
                  <th className="text-center py-1.5 px-2 text-gray-500 font-semibold w-8">#</th>
                  <th className="text-left py-1.5 px-2 text-gray-500 font-semibold">Fee Item</th>
                  <th className="text-left py-1.5 px-2 text-gray-500 font-semibold">Mode</th>
                  <th className="text-right py-1.5 px-2 text-gray-500 font-semibold">{showGST ? 'Base Amt' : 'Amount'}</th>
                  {showGST && <>
                    <th className="text-right py-1.5 px-2 text-gray-500 font-semibold">GST%</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-semibold">GST Breakup</th>
                  </>}
                  <th className="text-right py-1.5 px-2 text-gray-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems || []).map((li: any, i: number) => {
                  const base = showGST ? (li.amount - (li.taxAmount || 0)) : li.amount;
                  const split = gstSplit(li);
                  const taxType = (li.taxType || 'cgst_sgst').toLowerCase();
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="text-center py-1.5 px-2 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 px-2 font-medium text-gray-800">{li.description}</td>
                      <td className="py-1.5 px-2 text-gray-600">
                        <span>{modeLabel(invoice.paymentMode)}</span>
                        {invoice.chequeNo && <p className="text-[10px] text-gray-400">Cheque: {invoice.chequeNo}</p>}
                        {invoice.ddNo && <p className="text-[10px] text-gray-400">DD: {invoice.ddNo}</p>}
                        {invoice.transactionRef && !invoice.chequeNo && !invoice.ddNo &&
                          <p className="text-[10px] text-gray-400">Ref: {invoice.transactionRef}</p>}
                      </td>
                      <td className="py-1.5 px-2 text-right">{fmtINR(base)}</td>
                      {showGST && <>
                        <td className="py-1.5 px-2 text-right">{li.taxRate ? `${li.taxRate}%` : '—'}</td>
                        <td className="py-1.5 px-2 text-center text-[10px] text-gray-600">
                          {li.taxAmount ? (
                            taxType === 'igst'
                              ? `IGST: ${fmtINR(split.igst)}`
                              : <><p>CGST: {fmtINR(split.cgst)}</p><p>SGST: {fmtINR(split.sgst)}</p></>
                          ) : '—'}
                        </td>
                      </>}
                      <td className="py-1.5 px-2 text-right font-semibold">{fmtINR(li.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-800 bg-gray-50 font-bold">
                  <td colSpan={showGST ? 3 : 3} className="py-2 px-2">Grand Total</td>
                  <td className="py-2 px-2 text-right">{fmtINR(subtotal)}</td>
                  {showGST && <>
                    <td></td>
                    <td className="py-2 px-2 text-center text-[10px]">Tax: {fmtINR(totalTax)}</td>
                  </>}
                  <td className="py-2 px-2 text-right text-indigo-700 text-sm">{fmtINR(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>

            {ss.terms && <p className="text-[10px] text-gray-500 mt-3"><strong>Terms:</strong> {ss.terms}</p>}
            {ss.footerText && <p className="text-[10px] text-gray-400 text-center mt-2">{ss.footerText}</p>}
            <p className="text-[10px] text-gray-400 text-center mt-4 border-t border-dashed border-gray-200 pt-2">
              This is a computer generated receipt. No signature is required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeCollectionSection;
