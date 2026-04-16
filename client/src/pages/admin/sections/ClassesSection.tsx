import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import { required, academicYear, fieldCls } from '../../../utils/validate';

const blank = () => ({ name: '', grade: '', section: '', subjects: '', academicYear: '2025-26' });

type Errs = Record<string, string>;
type Touched = Record<string, boolean>;

const validate = (form: any, editing: string | null, classes: any[]): Errs => {
  const e: Errs = {};

  if (!form.grade?.trim()) e.grade = 'Required';
  if (!form.section?.trim()) e.section = 'Required';
  else if (form.section.trim().length > 5) e.section = 'Max 5 characters';

  const yearErr = required(form.academicYear) || academicYear(form.academicYear);
  if (yearErr) e.academicYear = yearErr;

  // Duplicate class check within same academic year
  if (form.grade && form.section) {
    const expectedName = `${form.grade}-${form.section}`;
    const dup = classes.find(c =>
      c.name?.toLowerCase() === expectedName.toLowerCase() &&
      c.academicYear === form.academicYear &&
      c._id !== editing
    );
    if (dup) e.section = `Class ${expectedName} already exists for ${form.academicYear}`;
  }

  return e;
};

const ALL_FIELDS = ['grade', 'section', 'academicYear'];

const ClassesSection = ({ role }: { role: string }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [touched, setTouched] = useState<Touched>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => api.get('/classes')
    .then(r => setClasses(Array.isArray(r.data) ? r.data : []))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const errors = validate(form, editing, classes);
  const hasErrors = Object.keys(errors).length > 0;

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));
  const fc = (field: string) => fieldCls(!!touched[field], errors[field]);

  const openAdd = () => {
    setForm(blank()); setEditing(null);
    setTouched({}); setServerError(''); setModal('add');
  };
  const openEdit = (c: any) => {
    setForm({ name: c.name, grade: c.grade, section: c.section, subjects: c.subjects?.join(', ') || '', academicYear: c.academicYear });
    setEditing(c._id);
    setTouched({}); setServerError(''); setModal('edit');
  };

  const save = async () => {
    setTouched(ALL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    if (hasErrors) return;
    setSaving(true); setServerError('');
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
      setServerError(e.response?.data?.message || 'Failed to save');
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
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classes..."
          className="flex-1 min-w-[160px] max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <button onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors ml-auto whitespace-nowrap">
          + Add Class
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No classes found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Class', 'Grade', 'Section', 'Academic Year', 'Subjects', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.grade}</td>
                      <td className="px-4 py-3 text-gray-600">{c.section}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.academicYear}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{c.subjects?.join(', ') || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(c)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                          <button onClick={() => remove(c._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Class' : 'Edit Class'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {serverError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{serverError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Grade *</label>
                <input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                  onBlur={() => touch('grade')} placeholder="e.g. 10 or Class X"
                  className={fc('grade')} />
                {touched.grade && errors.grade && <p className="text-xs text-red-500 mt-1">{errors.grade}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Section *</label>
                <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
                  onBlur={() => touch('section')} placeholder="e.g. A, B, Science"
                  className={fc('section')} />
                {touched.section && errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Academic Year *</label>
              <input value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
                onBlur={() => touch('academicYear')} placeholder="2025-26"
                className={fc('academicYear')} />
              {touched.academicYear && errors.academicYear
                ? <p className="text-xs text-red-500 mt-1">{errors.academicYear}</p>
                : <p className="text-xs text-gray-400 mt-1">Format: YYYY-YY (e.g. 2025-26)</p>}
            </div>

            {form.grade && form.section && (
              <div className="bg-indigo-50 text-indigo-700 text-xs rounded-lg px-3 py-2">
                Class name will be: <strong>{form.grade}-{form.section}</strong>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Subjects (comma-separated)</label>
              <input value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })}
                placeholder="Maths, Science, English..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                {saving && <Spinner />}
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
