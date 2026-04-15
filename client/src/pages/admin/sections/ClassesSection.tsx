import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const blank = () => ({ name: '', grade: '', section: '', subjects: '', academicYear: '2025-26' });

const ClassesSection = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => api.get('/classes').then(r => setClasses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (c: any) => {
    setForm({ name: c.name, grade: c.grade, section: c.section, subjects: c.subjects?.join(', ') || '', academicYear: c.academicYear });
    setEditing(c._id);
    setError('');
    setModal('edit');
  };

  const save = async () => {
    if (!form.grade || !form.section) return setError('Grade and section are required');
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        name: `${form.grade}-${form.section}`,
        subjects: form.subjects.split(',').map((s: string) => s.trim()).filter(Boolean),
      };
      if (editing) await api.put(`/classes/${editing}`, payload);
      else await api.post('/classes', payload);
      setModal(null);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this class?')) return;
    await api.delete(`/classes/${id}`);
    load();
  };

  const filtered = classes.filter(c =>
    `${c.name} ${c.grade} ${c.section}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classes..."
          className="flex-1 max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
          + Add Class
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No classes found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Class', 'Grade', 'Section', 'Academic Year', 'Subjects', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.grade}</td>
                    <td className="px-4 py-3 text-gray-600">{c.section}</td>
                    <td className="px-4 py-3 text-gray-600">{c.academicYear}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.subjects?.join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                        <button onClick={() => remove(c._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
        <Modal title={modal === 'add' ? 'Add Class' : 'Edit Class'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Grade *</label>
                <input value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}
                  placeholder="e.g. 10" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Section *</label>
                <input value={form.section} onChange={e => setForm({...form, section: e.target.value})}
                  placeholder="e.g. A" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Academic Year</label>
              <input value={form.academicYear} onChange={e => setForm({...form, academicYear: e.target.value})}
                placeholder="2025-26" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Subjects (comma-separated)</label>
              <input value={form.subjects} onChange={e => setForm({...form, subjects: e.target.value})}
                placeholder="Maths, Science, English..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
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

export default ClassesSection;
