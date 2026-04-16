import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const blank = () => ({ title: '', description: '', subject: '', classId: '', dueDate: '' });
const isOverdue = (date: string) => new Date(date) < new Date();

// ── Admin / Teacher: Full CRUD ────────────────────────────────────────────────
const AdminHomework = () => {
  const [homework, setHomework] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [search, setSearch] = useState('');

  const load = () => Promise.all([api.get('/homework'), api.get('/classes')])
    .then(([h, c]) => { setHomework(h.data); setClasses(c.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (h: any) => {
    setForm({ title: h.title, description: h.description || '', subject: h.subject, classId: h.class?._id || '', dueDate: h.dueDate?.slice(0, 10) || '' });
    setEditing(h._id); setError(''); setModal('edit');
  };
  const save = async () => {
    if (!form.title || !form.subject || !form.classId || !form.dueDate) return setError('Title, subject, class and due date are required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/homework/${editing}`, form);
      else await api.post('/homework', form);
      setModal(null); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!window.confirm('Delete this homework?')) return; await api.delete(`/homework/${id}`); load(); };
  const f = (k: string, v: string) => setForm((p: any) => ({...p, [k]: v}));

  const filtered = homework.filter(h => {
    const match = `${h.title} ${h.subject}`.toLowerCase().includes(search.toLowerCase());
    const cls = !filterClass || h.class?._id === filterClass;
    return match && cls;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search homework..." className="flex-1 min-w-[200px] max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 ml-auto">+ Assign Homework</button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? <div className="text-center py-16 text-gray-400">No homework assigned</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Title','Subject','Class','Due Date','Submissions','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(h => (
                  <tr key={h._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-semibold text-gray-900">{h.title}</div>{h.description && <div className="text-xs text-gray-400 truncate max-w-xs">{h.description}</div>}</td>
                    <td className="px-4 py-3 text-gray-600">{h.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{h.class?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isOverdue(h.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>{new Date(h.dueDate).toLocaleDateString()}</span>
                        {isOverdue(h.dueDate) && <Badge label="Overdue" variant="red" />}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge label={`${h.submissions?.length || 0} submitted`} variant="blue" /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(h)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                        <button onClick={() => remove(h._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
        <Modal title={modal === 'add' ? 'Assign Homework' : 'Edit Homework'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Title *</label>
              <input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Homework title" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">Subject *</label><input value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="e.g. Mathematics" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">Class *</label>
                <select value={form.classId} onChange={e => f('classId', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">Due Date *</label><input type="date" value={form.dueDate} onChange={e => f('dueDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" /></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">Description</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} placeholder="Instructions or details..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Student / Parent: View homework for their class ───────────────────────────
const StudentHomework = () => {
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');

  useEffect(() => {
    api.get('/students').then(async r => {
      const me = r.data.find((s: any) => s.user?._id === user._id || s.user === user._id);
      const url = me?.class?._id ? `/homework?classId=${me.class._id}` : '/homework';
      const h = await api.get(url);
      setHomework(h.data);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const pending = homework.filter(h => !isOverdue(h.dueDate));
  const overdue = homework.filter(h => isOverdue(h.dueDate));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100"><div className="text-xs text-indigo-600 font-semibold mb-1">Upcoming</div><div className="text-2xl font-bold text-indigo-700">{pending.length}</div></div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100"><div className="text-xs text-red-600 font-semibold mb-1">Overdue</div><div className="text-2xl font-bold text-red-700">{overdue.length}</div></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {homework.length === 0 ? <div className="text-center py-16 text-gray-400">No homework assigned</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Title','Subject','Due Date','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {homework.map(h => (
                <tr key={h._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-semibold text-gray-900">{h.title}</div>{h.description && <div className="text-xs text-gray-400 truncate max-w-xs">{h.description}</div>}</td>
                  <td className="px-4 py-3 text-gray-600">{h.subject}</td>
                  <td className="px-4 py-3 text-sm">{new Date(h.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge label={isOverdue(h.dueDate) ? 'Overdue' : 'Upcoming'} variant={isOverdue(h.dueDate) ? 'red' : 'green'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const HomeworkSection = ({ role }: { role: string }) => {
  if (role === 'student' || role === 'parent') return <StudentHomework />;
  return <AdminHomework />;
};
export default HomeworkSection;
