import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const blank = () => ({ studentId: '', classId: '', subject: '', term: 'Term 1', marks: '', maxMarks: '100', examType: '', academicYear: '2025-26' });

const gradeLabel = (marks: number, max: number) => {
  const pct = (marks / max) * 100;
  if (pct >= 90) return { label: 'A+', variant: 'green' };
  if (pct >= 80) return { label: 'A', variant: 'green' };
  if (pct >= 70) return { label: 'B+', variant: 'blue' };
  if (pct >= 60) return { label: 'B', variant: 'blue' };
  if (pct >= 50) return { label: 'C', variant: 'yellow' };
  if (pct >= 35) return { label: 'D', variant: 'orange' };
  return { label: 'F', variant: 'red' };
};

const GradesSection = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  const load = () => Promise.all([api.get('/grades'), api.get('/students'), api.get('/classes')])
    .then(([g, s, c]) => { setGrades(g.data); setStudents(s.data); setClasses(c.data); })
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (g: any) => {
    setForm({ studentId: g.student?._id || '', classId: g.class?._id || '', subject: g.subject, term: g.term, marks: g.marks, maxMarks: g.maxMarks, examType: g.examType || '', academicYear: g.academicYear });
    setEditing(g._id); setError(''); setModal('edit');
  };

  const save = async () => {
    if (!form.studentId || !form.classId || !form.subject || !form.term || form.marks === '') return setError('All required fields must be filled');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/grades/${editing}`, form);
      else await api.post('/grades', form);
      setModal(null); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this grade record?')) return;
    await api.delete(`/grades/${id}`); load();
  };

  const f = (k: string, v: any) => setForm((p: any) => ({...p, [k]: v}));
  const filtered = grades.filter(g => {
    const cls = !filterClass || g.class?._id === filterClass;
    const term = !filterTerm || g.term === filterTerm;
    return cls && term;
  });

  const terms = Array.from(new Set(grades.map((g: any) => g.term)));
  const classStudents = students.filter(s => !form.classId || s.class?._id === form.classId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Terms</option>
          {terms.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 ml-auto">
          + Add Grade
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? <div className="text-center py-16 text-gray-400">No grade records found</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Student', 'Class', 'Subject', 'Term', 'Marks', 'Grade', 'Exam Type', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(g => {
                  const gl = gradeLabel(g.marks, g.maxMarks);
                  return (
                    <tr key={g._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{g.student?.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{g.class?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{g.subject}</td>
                      <td className="px-4 py-3 text-gray-600">{g.term}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{g.marks}/{g.maxMarks} <span className="text-gray-400 font-normal text-xs">({Math.round((g.marks/g.maxMarks)*100)}%)</span></td>
                      <td className="px-4 py-3"><Badge label={gl.label} variant={gl.variant as any} /></td>
                      <td className="px-4 py-3 text-gray-600">{g.examType || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(g)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                          <button onClick={() => remove(g._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Grade' : 'Edit Grade'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Class *</label>
                <select value={form.classId} onChange={e => f('classId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Student *</label>
                <select value={form.studentId} onChange={e => f('studentId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select student</option>
                  {classStudents.map(s => <option key={s._id} value={s._id}>{s.user?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Subject *</label>
                <input value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="e.g. Mathematics"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Term *</label>
                <input value={form.term} onChange={e => f('term', e.target.value)} placeholder="e.g. Term 1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Marks *</label>
                <input type="number" value={form.marks} onChange={e => f('marks', e.target.value)} placeholder="85"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Max Marks</label>
                <input type="number" value={form.maxMarks} onChange={e => f('maxMarks', e.target.value)} placeholder="100"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Exam Type</label>
                <input value={form.examType} onChange={e => f('examType', e.target.value)} placeholder="e.g. Unit Test"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Academic Year</label>
                <input value={form.academicYear} onChange={e => f('academicYear', e.target.value)} placeholder="2025-26"
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

export default GradesSection;
