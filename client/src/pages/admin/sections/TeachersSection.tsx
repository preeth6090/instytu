import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';
import { required, minLen, email, phone, fieldCls, chain } from '../../../utils/validate';

const blank = () => ({ name: '', email: '', password: '', phone: '', subjects: '', address: '' });

type Errs = Record<string, string>;
type Touched = Record<string, boolean>;

const validate = (form: any, editing: string | null): Errs => {
  const e: Errs = {};

  const nameErr = chain(required, minLen(2))(form.name);
  if (nameErr) e.name = nameErr;

  const emailErr = chain(required, email)(form.email);
  if (emailErr) e.email = emailErr;

  if (!editing) {
    if (!form.password) e.password = 'Required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
  } else if (form.password && form.password.length < 8) {
    e.password = 'Password must be at least 8 characters';
  }

  const phoneErr = phone(form.phone);
  if (phoneErr) e.phone = phoneErr;

  return e;
};

const ALL_FIELDS = ['name', 'email', 'password', 'phone'];

const TeachersSection = ({ role }: { role: string }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [touched, setTouched] = useState<Touched>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => api.get('/users?role=teacher')
    .then(r => setTeachers(Array.isArray(r.data) ? r.data : []))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const errors = validate(form, editing);
  const hasErrors = Object.keys(errors).length > 0;

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));
  const fc = (field: string) => fieldCls(!!touched[field], errors[field]);

  const openAdd = () => {
    setForm(blank()); setEditing(null);
    setTouched({}); setServerError(''); setModal('add');
  };
  const openEdit = (t: any) => {
    setForm({ name: t.name, email: t.email, password: '', phone: t.phone || '', subjects: t.subjects?.join(', ') || '', address: t.address || '' });
    setEditing(t._id);
    setTouched({}); setServerError(''); setModal('edit');
  };

  const save = async () => {
    setTouched(ALL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    if (hasErrors) return;
    setSaving(true); setServerError('');
    try {
      if (editing) await api.put(`/users/${editing}`, { ...form, role: 'teacher' });
      else await api.post('/users', { ...form, role: 'teacher' });
      setModal(null);
      load();
    } catch (e: any) {
      setServerError(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this teacher?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = teachers.filter(t => `${t.name} ${t.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teachers..."
          className="flex-1 min-w-[160px] max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <button onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors ml-auto whitespace-nowrap">
          + Add Teacher
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 text-xs text-gray-400 font-medium">
            {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No teachers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Name', 'Email', 'Phone', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => (
                    <tr key={t._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {t.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.email}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{t.phone || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge label={t.isActive ? 'Active' : 'Inactive'} variant={t.isActive ? 'green' : 'gray'} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(t)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                          <button onClick={() => remove(t._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
        <Modal title={modal === 'add' ? 'Add Teacher' : 'Edit Teacher'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {serverError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{serverError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name *</label>
                <input value={form.name} onChange={e => f('name', e.target.value)} onBlur={() => touch('name')}
                  placeholder="Teacher name" className={fc('name')} />
                {touched.name && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Email *</label>
                <input value={form.email} onChange={e => f('email', e.target.value)} onBlur={() => touch('email')}
                  placeholder="teacher@school.com" type="email" className={fc('email')} />
                {touched.email && errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  {editing ? 'New Password (blank to keep)' : 'Password *'}
                </label>
                <input value={form.password} onChange={e => f('password', e.target.value)} onBlur={() => touch('password')}
                  type="password" placeholder={editing ? 'Leave blank to keep' : 'Min. 8 characters'} className={fc('password')} />
                {touched.password && errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
                <input value={form.phone} onChange={e => f('phone', e.target.value)} onBlur={() => touch('phone')}
                  placeholder="+91 98765 43210" className={fc('phone')} />
                {touched.phone && errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Subjects (comma-separated)</label>
              <input value={form.subjects} onChange={e => f('subjects', e.target.value)}
                placeholder="Maths, Physics, Chemistry"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
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

export default TeachersSection;
