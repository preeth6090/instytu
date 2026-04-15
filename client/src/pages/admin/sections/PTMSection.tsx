import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const statusVariant: any = { available: 'blue', booked: 'yellow', completed: 'green', cancelled: 'red' };
const blank = () => ({ teacherId: '', date: '', time: '', duration: 30, notes: '' });

const PTMSection = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  const load = () => Promise.all([api.get('/ptm'), api.get('/users?role=teacher')])
    .then(([p, t]) => { setSlots(p.data); setTeachers(t.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (s: any) => {
    setForm({
      teacherId: s.teacher?._id || '',
      date: s.date?.slice(0, 10) || '',
      time: s.time || '',
      duration: s.duration || 30,
      notes: s.notes || '',
    });
    setEditing(s._id); setError(''); setModal('edit');
  };

  const save = async () => {
    if (!form.teacherId || !form.date || !form.time) return setError('Teacher, date and time are required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/ptm/${editing}`, form);
      else await api.post('/ptm', form);
      setModal(null); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this PTM slot?')) return;
    await api.delete(`/ptm/${id}`); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/ptm/${id}`, { status }); load();
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const filtered = slots.filter(s => {
    const status = !filterStatus || s.status === filterStatus;
    const teacher = !filterTeacher || s.teacher?._id === filterTeacher;
    return status && teacher;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Teachers</option>
          {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 ml-auto">
          + Add PTM Slot
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? <div className="text-center py-16 text-gray-400">No PTM slots found</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Teacher', 'Date', 'Time', 'Duration', 'Booked By', 'Student', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.teacher?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.time || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.duration} min</td>
                    <td className="px-4 py-3 text-gray-600">{s.bookedBy?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.student?.user?.name || '—'}</td>
                    <td className="px-4 py-3"><Badge label={s.status} variant={statusVariant[s.status] || 'gray'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {s.status === 'booked' && (
                          <button onClick={() => updateStatus(s._id, 'completed')}
                            className="text-green-600 hover:underline text-xs font-medium">Complete</button>
                        )}
                        {s.status !== 'cancelled' && s.status !== 'completed' && (
                          <button onClick={() => updateStatus(s._id, 'cancelled')}
                            className="text-red-500 hover:underline text-xs font-medium">Cancel</button>
                        )}
                        <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                        <button onClick={() => remove(s._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
        <Modal title={modal === 'add' ? 'Add PTM Slot' : 'Edit PTM Slot'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Teacher *</label>
              <select value={form.teacherId} onChange={e => f('teacherId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                <option value="">Select teacher</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Time *</label>
                <input type="time" value={form.time} onChange={e => f('time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Duration (minutes)</label>
              <select value={form.duration} onChange={e => f('duration', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} placeholder="Any notes or agenda..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
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

export default PTMSection;
