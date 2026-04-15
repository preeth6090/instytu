import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const statusVariant: any = { pending: 'yellow', paid: 'green', overdue: 'red' };
const blank = () => ({ studentId: '', title: '', amount: '', dueDate: '', status: 'pending', paymentMode: '', transactionId: '', academicYear: '2025-26' });

const FeesSection = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => Promise.all([api.get('/fees'), api.get('/students')])
    .then(([f, s]) => { setFees(f.data); setStudents(s.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (fee: any) => {
    setForm({ studentId: fee.student?._id || '', title: fee.title, amount: fee.amount, dueDate: fee.dueDate?.slice(0, 10) || '', status: fee.status, paymentMode: fee.paymentMode || '', transactionId: fee.transactionId || '', academicYear: fee.academicYear });
    setEditing(fee._id); setError(''); setModal('edit');
  };

  const save = async () => {
    if (!form.studentId || !form.title || !form.amount || !form.dueDate) return setError('Student, title, amount and due date are required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/fees/${editing}`, form);
      else await api.post('/fees', form);
      setModal(null); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this fee record?')) return;
    await api.delete(`/fees/${id}`); load();
  };

  const markPaid = async (id: string) => {
    await api.put(`/fees/${id}`, { status: 'paid', paidAt: new Date() }); load();
  };

  const f = (k: string, v: string) => setForm((p: any) => ({...p, [k]: v}));

  const filtered = fees.filter(fee => {
    const match = `${fee.student?.user?.name} ${fee.title}`.toLowerCase().includes(search.toLowerCase());
    const status = !filterStatus || fee.status === filterStatus;
    return match && status;
  });

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="text-xs text-green-600 font-semibold mb-1">Collected</div>
          <div className="text-2xl font-bold text-green-700">₹{totalCollected.toLocaleString()}</div>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <div className="text-xs text-yellow-600 font-semibold mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">₹{totalPending.toLocaleString()}</div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-semibold mb-1">Total Records</div>
          <div className="text-2xl font-bold text-indigo-700">{fees.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student or title..."
          className="flex-1 min-w-[200px] max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 ml-auto">
          + Add Fee
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? <div className="text-center py-16 text-gray-400">No fee records found</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Student', 'Title', 'Amount', 'Due Date', 'Status', 'Payment', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(fee => (
                  <tr key={fee._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{fee.student?.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fee.title}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{fee.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(fee.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge label={fee.status} variant={statusVariant[fee.status] || 'gray'} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{fee.paymentMode || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {fee.status !== 'paid' && (
                          <button onClick={() => markPaid(fee._id)} className="text-green-600 hover:underline text-xs font-medium">Mark Paid</button>
                        )}
                        <button onClick={() => openEdit(fee)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                        <button onClick={() => remove(fee._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Fee' : 'Edit Fee'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Student *</label>
                <select value={form.studentId} onChange={e => f('studentId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select student</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.user?.name} — {s.class?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Fee Title *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Tuition Fee"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Amount (₹) *</label>
                <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)} placeholder="5000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={e => f('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                <select value={form.status} onChange={e => f('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Mode</label>
                <select value={form.paymentMode} onChange={e => f('paymentMode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Transaction ID</label>
                <input value={form.transactionId} onChange={e => f('transactionId', e.target.value)} placeholder="TXN123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeesSection;
