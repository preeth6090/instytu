import React, { useEffect, useRef, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'dd', label: 'Demand Draft' },
  { value: 'online_transfer', label: 'Online Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash_deposit', label: 'Cash Deposit' },
  { value: 'upi', label: 'UPI' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'concession', label: 'Concession' },
  { value: 'fee_reduction', label: 'Fee Reduction' },
];

interface Student {
  _id: string;
  user: { _id: string; name: string; email: string };
  rollNumber: string;
  admissionNo?: string;
  class?: { name: string };
  campus?: { name: string };
}

interface Fee {
  _id: string;
  title: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  bundle?: { name: string };
  academicYear: string;
}

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  createdAt: string;
  totalAmount: number;
  amountPaid: number;
  paymentMode: string;
  lineItems: { name: string; amount: number; taxAmount?: number }[];
  discounts: { type: string; label?: string; amount: number }[];
  schoolSnapshot: { name: string; address?: string; phone?: string; gstn?: string; gstPercentage?: number; logo?: string; bankDetails?: string; invoiceSettings?: any };
  student: { name: string; rollNumber: string; admissionNo?: string; class?: string; campus?: string };
  isVoid: boolean;
  isConcessionOnly: boolean;
}

const FeeCollectionSection = ({ role }: { role: string }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectionError, setCollectionError] = useState('');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');
  const searchTimeout = useRef<any>(null);

  // Search students
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!search.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.get(`/students?search=${encodeURIComponent(search)}`);
        setSearchResults(Array.isArray(r.data) ? r.data : r.data.students || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [search]);

  const selectStudent = async (s: Student) => {
    setSelectedStudent(s);
    setSearchResults([]);
    setSearch('');
    setSelectedFees([]);
    setLoadingFees(true);
    try {
      const [f, inv] = await Promise.all([
        api.get(`/fees?student=${s._id}`),
        api.get(`/invoices?student=${s._id}`),
      ]);
      setFees(Array.isArray(f.data) ? f.data : f.data.fees || []);
      setInvoices(Array.isArray(inv.data) ? inv.data : inv.data.invoices || []);
    } catch { setFees([]); setInvoices([]); }
    finally { setLoadingFees(false); }
  };

  const toggleFee = (id: string) => {
    setSelectedFees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const pendingFees = fees.filter(f => f.status === 'pending' || f.status === 'partial' || f.status === 'overdue');
  const isConcessionOnly = ['scholarship', 'concession', 'fee_reduction'].includes(paymentMode);

  const collect = async () => {
    if (!selectedStudent || !selectedFees.length) return;
    setCollecting(true); setCollectionError('');
    try {
      const r = await api.post('/invoices', {
        student: selectedStudent._id,
        fees: selectedFees,
        paymentMode,
        transactionId: transactionId || undefined,
        notes: notes || undefined,
      });
      const newInvoice: Invoice = r.data;
      setInvoices(prev => [newInvoice, ...prev]);
      // Refresh fees
      const f = await api.get(`/fees?student=${selectedStudent._id}`);
      setFees(Array.isArray(f.data) ? f.data : f.data.fees || []);
      setSelectedFees([]);
      setTransactionId(''); setNotes('');
      setPrintInvoice(newInvoice);
      setActiveTab('history');
    } catch (e: any) {
      setCollectionError(e.response?.data?.message || 'Failed to record payment');
    } finally {
      setCollecting(false);
    }
  };

  const selectedTotal = fees.filter(f => selectedFees.includes(f._id)).reduce((sum, f) => sum + (f.amount - (f.amountPaid || 0)), 0);

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-orange-100 text-orange-700',
    overdue: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    waived: 'bg-gray-100 text-gray-500',
  };

  const canEdit = role === 'admin' || role === 'superadmin' || role === 'staff';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Fee Collection</h2>
        <p className="text-sm text-gray-500 mt-1">Search a student to view dues and collect payments</p>
      </div>

      {/* Student Search */}
      <div className="relative mb-6">
        <input
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          placeholder="Search student by name, roll number, or admission number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {searching && <div className="absolute right-4 top-3.5"><Spinner /></div>}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 z-20 overflow-hidden">
            {searchResults.map(s => (
              <button key={s._id} onClick={() => selectStudent(s)}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition border-b last:border-0">
                <p className="font-medium text-gray-900">{s.user?.name}</p>
                <p className="text-xs text-gray-500">
                  Roll: {s.rollNumber}
                  {s.admissionNo && ` · Adm: ${s.admissionNo}`}
                  {s.class?.name && ` · Class: ${s.class.name}`}
                  {s.campus?.name && ` · Campus: ${s.campus.name}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          {/* Student Card */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-indigo-900">{selectedStudent.user?.name}</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Roll: {selectedStudent.rollNumber}
                {selectedStudent.admissionNo && ` · Adm: ${selectedStudent.admissionNo}`}
                {selectedStudent.class?.name && ` · ${selectedStudent.class.name}`}
                {selectedStudent.campus?.name && ` · ${selectedStudent.campus.name}`}
              </p>
            </div>
            <button onClick={() => { setSelectedStudent(null); setFees([]); setInvoices([]); setSelectedFees([]); }}
              className="text-indigo-400 hover:text-indigo-600 text-sm">Change</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
            {(['dues', 'history'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 text-sm rounded-lg transition font-medium capitalize ${activeTab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'dues' ? 'Outstanding Dues' : 'Payment History'}
              </button>
            ))}
          </div>

          {loadingFees ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : activeTab === 'dues' ? (
            /* ── DUES ── */
            <div>
              {pendingFees.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-medium">No outstanding dues</p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-5">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {canEdit && <th className="px-4 py-3 w-10"></th>}
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Fee</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Bundle</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Due Date</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Balance</th>
                          <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingFees.map(f => (
                          <tr key={f._id} className={selectedFees.includes(f._id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                            {canEdit && (
                              <td className="px-4 py-3">
                                <input type="checkbox" checked={selectedFees.includes(f._id)} onChange={() => toggleFee(f._id)}
                                  className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                              </td>
                            )}
                            <td className="px-4 py-3 font-medium text-gray-900">{f.title}</td>
                            <td className="px-4 py-3 text-gray-500">{f.bundle?.name || '—'}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 text-right">₹{f.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-600">₹{(f.amount - (f.amountPaid || 0)).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusColor[f.status] || ''}`}>{f.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {canEdit && selectedFees.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4">Collect Payment</h4>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                            {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID / Reference</label>
                          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Cheque no., UTR, etc." />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional remarks" />
                      </div>
                      {isConcessionOnly && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700 mb-4">
                          Concession/Scholarship payments will not generate an invoice number.
                        </div>
                      )}
                      {collectionError && (
                        <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm mb-4">{collectionError}</div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{selectedFees.length} fee(s) selected</p>
                          <p className="text-xl font-bold text-indigo-600">₹{selectedTotal.toLocaleString()}</p>
                        </div>
                        <button onClick={collect} disabled={collecting}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                          {collecting && <Spinner />}
                          Collect & Generate Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── HISTORY ── */
            <div>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-medium">No payment history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map(inv => (
                    <div key={inv._id} className={`bg-white border rounded-xl p-4 shadow-sm ${inv.isVoid ? 'opacity-60 border-red-200' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {inv.invoiceNumber ? (
                              <span className="font-mono text-sm font-semibold text-indigo-700">{inv.invoiceNumber}</span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">No Invoice #</span>
                            )}
                            {inv.isVoid && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">VOID</span>}
                            {inv.isConcessionOnly && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded">Concession</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{inv.amountPaid.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 capitalize">{inv.paymentMode?.replace(/_/g, ' ')}</p>
                        </div>
                        <button onClick={() => setPrintInvoice(inv)}
                          className="ml-4 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                          Print
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {inv.lineItems?.map((li, i) => (
                          <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100">{li.name}: ₹{li.amount.toLocaleString()}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Invoice Print Modal */}
      {printInvoice && (
        <InvoicePrintModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Invoice Print Modal                                       */
/* ────────────────────────────────────────────────────────── */
const InvoicePrintModal = ({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const ss = invoice.schoolSnapshot || {} as any;
  const settings = ss.invoiceSettings || {};

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${invoice.invoiceNumber || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .logo { max-height: 80px; max-width: 160px; object-fit: contain; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 80px; font-weight: 900; color: rgba(0,0,0,${settings.watermarkOpacity ?? 0.08}); pointer-events: none; z-index: 0; white-space: nowrap; }
        .content { position: relative; z-index: 1; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; }
        td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        .total-row { font-weight: bold; background: #f9fafb; }
        .inv-num { font-size: 18px; font-weight: bold; color: #4f46e5; }
        .school-name { font-size: 20px; font-weight: bold; }
        .meta { font-size: 12px; color: #6b7280; }
        .divider { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${settings.showWatermark && ss.logo ? `<div class="watermark"><img src="${ss.logo}" style="max-height:200px;opacity:${settings.watermarkOpacity ?? 0.08}"></div>` : ''}
      <div class="content">
        ${settings.headerText ? `<div style="text-align:center;margin-bottom:8px;font-size:13px;color:#6b7280">${settings.headerText}</div>` : ''}
        <div class="header">
          ${settings.logoPosition !== 'right' && ss.logo ? `<img src="${ss.logo}" class="logo">` : '<div></div>'}
          <div style="text-align:${settings.logoPosition === 'center' ? 'center' : 'right'}">
            <div class="school-name">${ss.name || ''}</div>
            ${settings.showAddress && ss.address ? `<div class="meta">${ss.address}</div>` : ''}
            ${settings.showPhone && ss.phone ? `<div class="meta">Ph: ${ss.phone}</div>` : ''}
            ${settings.showGST && ss.gstn ? `<div class="meta">GSTIN: ${ss.gstn}</div>` : ''}
          </div>
          ${settings.logoPosition === 'right' && ss.logo ? `<img src="${ss.logo}" class="logo">` : ''}
        </div>
        <hr class="divider">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <div>${invoice.invoiceNumber ? `<span class="inv-num">${invoice.invoiceNumber}</span>` : '<span style="color:#6b7280;font-style:italic">No Invoice Number (Concession)</span>'}</div>
            <div class="meta">Date: ${new Date(invoice.createdAt).toLocaleString('en-IN')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:600">${invoice.student?.name || ''}</div>
            <div class="meta">Roll: ${invoice.student?.rollNumber || ''}</div>
            ${invoice.student?.admissionNo ? `<div class="meta">Adm: ${invoice.student.admissionNo}</div>` : ''}
            ${invoice.student?.class ? `<div class="meta">Class: ${invoice.student.class}</div>` : ''}
            ${invoice.student?.campus ? `<div class="meta">Campus: ${invoice.student.campus}</div>` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>Description</th><th style="text-align:right">Amount</th>${settings.showGST ? '<th style="text-align:right">Tax</th>' : ''}<th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${(invoice.lineItems || []).map(li => `<tr><td>${li.name}</td><td style="text-align:right">₹${li.amount.toLocaleString()}</td>${settings.showGST ? `<td style="text-align:right">₹${(li.taxAmount || 0).toLocaleString()}</td>` : ''}<td style="text-align:right">₹${(li.amount + (li.taxAmount || 0)).toLocaleString()}</td></tr>`).join('')}
            ${(invoice.discounts || []).map(d => `<tr><td style="color:#16a34a">${d.type.replace(/_/g, ' ')}${d.label ? ' — ' + d.label : ''}</td><td></td>${settings.showGST ? '<td></td>' : ''}<td style="text-align:right;color:#16a34a">- ₹${d.amount.toLocaleString()}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr class="total-row"><td colspan="${settings.showGST ? '3' : '2'}">Total Paid</td><td style="text-align:right">₹${invoice.amountPaid.toLocaleString()}</td></tr></tfoot>
        </table>
        <div class="meta">Payment Mode: ${(invoice.paymentMode || '').replace(/_/g, ' ')}</div>
        ${settings.showBankDetails && ss.bankDetails ? `<div class="meta" style="margin-top:8px">Bank: ${ss.bankDetails}</div>` : ''}
        ${settings.footerText ? `<div style="margin-top:16px;font-size:12px;color:#6b7280;text-align:center">${settings.footerText}</div>` : ''}
        ${settings.terms ? `<div style="margin-top:8px;font-size:11px;color:#9ca3af">${settings.terms}</div>` : ''}
      </div>
      <script>window.onload=()=>{ window.print(); window.close(); }</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {invoice.invoiceNumber ? `Receipt: ${invoice.invoiceNumber}` : 'Receipt (No Invoice Number)'}
          </h3>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Print / Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto flex-1 p-6" ref={printRef}>
          {/* School header */}
          <div className="flex justify-between items-start mb-4">
            {ss.logo && settings.logoPosition !== 'right' && (
              <img src={ss.logo} alt="logo" className="max-h-16 max-w-32 object-contain" />
            )}
            <div className={`${settings.logoPosition === 'center' ? 'text-center mx-auto' : 'text-right'}`}>
              <p className="text-lg font-bold">{ss.name}</p>
              {settings.showAddress && ss.address && <p className="text-xs text-gray-500">{ss.address}</p>}
              {settings.showPhone && ss.phone && <p className="text-xs text-gray-500">Ph: {ss.phone}</p>}
              {settings.showGST && ss.gstn && <p className="text-xs text-gray-500">GSTIN: {ss.gstn}</p>}
            </div>
            {ss.logo && settings.logoPosition === 'right' && (
              <img src={ss.logo} alt="logo" className="max-h-16 max-w-32 object-contain" />
            )}
          </div>

          <hr className="my-3" />

          <div className="flex justify-between mb-4">
            <div>
              {invoice.invoiceNumber ? (
                <p className="text-xl font-bold text-indigo-700">{invoice.invoiceNumber}</p>
              ) : (
                <p className="text-sm italic text-gray-400">No Invoice Number</p>
              )}
              <p className="text-xs text-gray-400">{new Date(invoice.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{invoice.student?.name}</p>
              <p className="text-xs text-gray-500">Roll: {invoice.student?.rollNumber}</p>
              {invoice.student?.class && <p className="text-xs text-gray-500">{invoice.student.class}</p>}
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600">Description</th>
                <th className="text-right px-3 py-2 text-gray-600">Amount</th>
                {settings.showGST && <th className="text-right px-3 py-2 text-gray-600">Tax</th>}
                <th className="text-right px-3 py-2 text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems?.map((li, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{li.name}</td>
                  <td className="px-3 py-2 text-right">₹{li.amount.toLocaleString()}</td>
                  {settings.showGST && <td className="px-3 py-2 text-right">₹{(li.taxAmount || 0).toLocaleString()}</td>}
                  <td className="px-3 py-2 text-right">₹{(li.amount + (li.taxAmount || 0)).toLocaleString()}</td>
                </tr>
              ))}
              {invoice.discounts?.map((d, i) => (
                <tr key={`d-${i}`} className="text-green-600">
                  <td className="px-3 py-2 capitalize">{d.type.replace(/_/g, ' ')}{d.label ? ` — ${d.label}` : ''}</td>
                  <td></td>
                  {settings.showGST && <td></td>}
                  <td className="px-3 py-2 text-right">- ₹{d.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-3 py-2" colSpan={settings.showGST ? 3 : 2}>Total Paid</td>
                <td className="px-3 py-2 text-right">₹{invoice.amountPaid.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-gray-500 capitalize">Payment Mode: {invoice.paymentMode?.replace(/_/g, ' ')}</p>
          {settings.showBankDetails && ss.bankDetails && <p className="text-xs text-gray-500 mt-1">{ss.bankDetails}</p>}
          {settings.footerText && <p className="text-xs text-gray-400 mt-3 text-center">{settings.footerText}</p>}
          {settings.terms && <p className="text-xs text-gray-300 mt-1">{settings.terms}</p>}
        </div>
      </div>
    </div>
  );
};

export default FeeCollectionSection;
