import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const PAYMENT_MODES = [
  { value: '', label: 'All Modes' },
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

interface Campus { _id: string; name: string; code: string; }
interface ReportData {
  invoices: any[];
  summary: {
    total: number;
    count: number;
    byMode: Record<string, number>;
    byCampus: Record<string, number>;
    byDay: Record<string, number>;
  };
}

const today = () => new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const ReportsSection = ({ role }: { role: string }) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [filters, setFilters] = useState({
    from: thirtyDaysAgo(),
    to: today(),
    campus: '',
    paymentMode: '',
    academicYear: '2025-26',
  });
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [activeTab, setActiveTab] = useState<'collected' | 'pending'>('collected');

  useEffect(() => {
    api.get('/campuses').then(r => setCampuses(r.data)).catch(() => {});
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.campus) params.set('campus', filters.campus);
      if (filters.paymentMode) params.set('paymentMode', filters.paymentMode);
      if (filters.academicYear) params.set('academicYear', filters.academicYear);
      const r = await api.get(`/reports/fees?${params}`);
      setData(r.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  const fetchPending = async () => {
    setLoadingPending(true);
    try {
      const params = new URLSearchParams();
      if (filters.campus) params.set('campus', filters.campus);
      if (filters.academicYear) params.set('academicYear', filters.academicYear);
      const r = await api.get(`/reports/pending?${params}`);
      setPendingData(Array.isArray(r.data) ? r.data : r.data.fees || []);
    } catch { setPendingData([]); }
    finally { setLoadingPending(false); }
  };

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const exportCollectedExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      const rows = (data?.invoices || []).map((inv: any) => ({
        'Invoice #': inv.invoiceNumber || 'N/A',
        'Date': new Date(inv.createdAt).toLocaleString('en-IN'),
        'Student': inv.student?.name || '',
        'Roll No': inv.student?.rollNumber || '',
        'Campus': inv.student?.campus || '',
        'Class': inv.student?.class || '',
        'Amount (₹)': inv.amountPaid,
        'Payment Mode': (inv.paymentMode || '').replace(/_/g, ' '),
        'Transaction ID': inv.transactionId || '',
        'Items': (inv.lineItems || []).map((li: any) => `${li.name}: ₹${li.amount}`).join('; '),
        'Discounts': (inv.discounts || []).map((d: any) => `${d.type}: ₹${d.amount}`).join('; '),
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Fee Collections');
      xlsx.writeFile(wb, `fee-report-${filters.from}-to-${filters.to}.xlsx`);
    } catch (e) {
      alert('Failed to export Excel');
    }
  };

  const exportPendingExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      const rows = pendingData.map((f: any) => ({
        'Student': f.student?.user?.name || '',
        'Roll No': f.student?.rollNumber || '',
        'Campus': f.student?.campus?.name || '',
        'Class': f.student?.class?.name || '',
        'Fee': f.title,
        'Bundle': f.bundle?.name || '',
        'Amount (₹)': f.amount,
        'Paid (₹)': f.amountPaid || 0,
        'Balance (₹)': f.amount - (f.amountPaid || 0),
        'Due Date': new Date(f.dueDate).toLocaleDateString('en-IN'),
        'Status': f.status,
        'Academic Year': f.academicYear,
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Pending Fees');
      xlsx.writeFile(wb, `pending-fees-${filters.academicYear}.xlsx`);
    } catch { alert('Failed to export Excel'); }
  };

  const canExport = role === 'admin' || role === 'superadmin' || role === 'staff';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Fee collection analytics and pending dues</p>
        </div>
        {canExport && (
          <button
            onClick={activeTab === 'collected' ? exportCollectedExcel : exportPendingExcel}
            disabled={loading || loadingPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span>⬇</span> Export Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Campus</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={filters.campus} onChange={e => setFilters(f => ({ ...f, campus: e.target.value }))}>
              <option value="">All Campuses</option>
              {campuses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Mode</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={filters.paymentMode} onChange={e => setFilters(f => ({ ...f, paymentMode: e.target.value }))}>
              {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={filters.academicYear} onChange={e => setFilters(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025-26" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={fetchReport} disabled={loading} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Spinner />} Apply Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(['collected', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm rounded-lg transition font-medium capitalize ${activeTab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'collected' ? 'Collected' : 'Pending Dues'}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {activeTab === 'collected' ? (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total Collected</p>
                <p className="text-2xl font-bold text-indigo-600">₹{data.summary.total?.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.count}</p>
              </div>
              {Object.entries(data.summary.byMode || {}).slice(0, 2).map(([mode, amt]) => (
                <div key={mode} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1 capitalize">{mode.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(amt as number).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* By Mode breakdown */}
            {Object.keys(data.summary.byMode || {}).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-4">Collections by Payment Mode</h4>
                <div className="space-y-2">
                  {Object.entries(data.summary.byMode).sort(([, a], [, b]) => (b as number) - (a as number)).map(([mode, amt]) => {
                    const pct = data.summary.total ? Math.round(((amt as number) / data.summary.total) * 100) : 0;
                    return (
                      <div key={mode} className="flex items-center gap-3">
                        <div className="w-28 text-xs text-gray-600 capitalize flex-shrink-0">{mode.replace(/_/g, ' ')}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-24 text-right text-sm font-medium text-gray-800">₹{(amt as number).toLocaleString()}</div>
                        <div className="w-10 text-right text-xs text-gray-400">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoice table */}
            {data.invoices.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-gray-50 border-b">
                  <p className="text-sm font-medium text-gray-700">Transaction Detail ({data.invoices.length} records)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-white">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Invoice #</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Student</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Mode</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.invoices.map((inv: any) => (
                        <tr key={inv._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-indigo-600 text-xs">{inv.invoiceNumber || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-gray-800">{inv.student?.name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 capitalize text-xs">{(inv.paymentMode || '').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-right font-medium">₹{inv.amountPaid?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-3" colSpan={4}>Total</td>
                        <td className="px-4 py-3 text-right">₹{data.summary.total?.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null
      ) : (
        /* ── PENDING DUES ── */
        loadingPending ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : pendingData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <p>No pending dues found for the selected filters</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{pendingData.length} pending records</p>
              <p className="text-sm font-bold text-red-600">
                Total: ₹{pendingData.reduce((sum: number, f: any) => sum + (f.amount - (f.amountPaid || 0)), 0).toLocaleString()}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-white">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Student</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Class</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Campus</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Fee</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Due Date</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Balance</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingData.map((f: any) => (
                    <tr key={f._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{f.student?.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.student?.class?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.student?.campus?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{f.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{f.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">₹{(f.amount - (f.amountPaid || 0)).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                          f.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          f.status === 'partial' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'}`}>{f.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ReportsSection;
