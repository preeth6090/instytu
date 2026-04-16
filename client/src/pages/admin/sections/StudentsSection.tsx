import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';
import { required, minLen, email, phone, fieldCls, chain } from '../../../utils/validate';

const blank = () => ({
  name: '', email: '', password: '', rollNumber: '', admissionNo: '',
  classId: '', gender: '', phone: '', address: '', dateOfBirth: '',
  bloodGroup: '', busRoute: '',
});

type Errs = Record<string, string>;
type Touched = Record<string, boolean>;

const validate = (form: any, editing: string | null, students: any[]): Errs => {
  const e: Errs = {};

  const nameErr = chain(required, minLen(2))(form.name);
  if (nameErr) e.name = nameErr;

  const emailErr = chain(required, email)(form.email);
  if (emailErr) e.email = emailErr;

  if (!editing) {
    const pwErr = chain(required, minLen(8))(form.password);
    if (pwErr) e.password = pwErr;
  } else if (form.password) {
    const pwErr = minLen(8)(form.password);
    if (pwErr) e.password = pwErr;
  }

  if (!form.classId) e.classId = 'Please select a class';
  if (!form.rollNumber?.trim()) e.rollNumber = 'Required';
  else {
    // Uniqueness: check roll number within same class
    const dup = students.find(s =>
      s.class?._id === form.classId &&
      s.rollNumber?.toLowerCase() === form.rollNumber.trim().toLowerCase() &&
      s._id !== editing
    );
    if (dup) e.rollNumber = `Roll number already exists in this class`;
  }

  const phoneErr = phone(form.phone);
  if (phoneErr) e.phone = phoneErr;

  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (dob >= new Date()) e.dateOfBirth = 'Date of birth must be in the past';
  }

  return e;
};

const ALL_FIELDS = ['name', 'email', 'password', 'rollNumber', 'classId', 'phone', 'dateOfBirth'];

const StudentsSection = ({ role }: { role: string }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [touched, setTouched] = useState<Touched>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const load = () => Promise.all([
    api.get('/students'),
    api.get('/classes'),
  ]).then(([s, c]) => {
    setStudents(Array.isArray(s.data) ? s.data : []);
    setClasses(Array.isArray(c.data) ? c.data : []);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const errors = validate(form, editing, students);
  const hasErrors = Object.keys(errors).length > 0;

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));
  const fc = (field: string) => fieldCls(!!touched[field], errors[field]);

  const openAdd = () => {
    setForm(blank()); setEditing(null);
    setTouched({}); setServerError(''); setModal('add');
  };
  const openEdit = (s: any) => {
    setForm({
      name: s.user?.name || '', email: s.user?.email || '', password: '',
      rollNumber: s.rollNumber || '', admissionNo: s.admissionNo || '',
      classId: s.class?._id || '', gender: s.gender || '',
      phone: s.phone || '', address: s.address || '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
      bloodGroup: s.bloodGroup || '', busRoute: s.busRoute || '',
    });
    setEditing(s._id);
    setTouched({}); setServerError(''); setModal('edit');
  };

  const save = async () => {
    // Touch all validated fields to show errors
    setTouched(ALL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    if (hasErrors) return;
    setSaving(true); setServerError('');
    try {
      if (editing) await api.put(`/students/${editing}`, form);
      else await api.post('/students', form);
      setModal(null);
      load();
    } catch (e: any) {
      setServerError(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    await api.delete(`/students/${id}`);
    load();
  };

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const filtered = students.filter(s => {
    const match = `${s.user?.name} ${s.user?.email} ${s.rollNumber}`.toLowerCase().includes(search.toLowerCase());
    const cls = !filterClass || s.class?._id === filterClass;
    return match && cls;
  });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
          className="flex-1 min-w-[160px] max-w-xs px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors ml-auto whitespace-nowrap">
          + Add Student
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 text-xs text-gray-400 font-medium">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No students found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['Name', 'Roll No.', 'Class', 'Gender', 'Phone', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 whitespace-nowrap">{s.user?.name}</div>
                        <div className="text-xs text-gray-400">{s.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.rollNumber}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.class?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{s.gender || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.phone || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge label={s.isActive ? 'Active' : 'Inactive'} variant={s.isActive ? 'green' : 'gray'} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                          <button onClick={() => remove(s._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
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
        <Modal title={modal === 'add' ? 'Add Student' : 'Edit Student'} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            {serverError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{serverError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name *</label>
                <input value={form.name} onChange={e => f('name', e.target.value)} onBlur={() => touch('name')}
                  placeholder="Student name" className={fc('name')} />
                {touched.name && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Email *</label>
                <input value={form.email} onChange={e => f('email', e.target.value)} onBlur={() => touch('email')}
                  placeholder="student@email.com" type="email" className={fc('email')} />
                {touched.email && errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  {editing ? 'New Password (leave blank to keep)' : 'Password *'}
                </label>
                <input value={form.password} onChange={e => f('password', e.target.value)} onBlur={() => touch('password')}
                  placeholder={editing ? 'Leave blank to keep' : 'Min. 8 characters'} type="password" className={fc('password')} />
                {touched.password && errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Class *</label>
                <select value={form.classId} onChange={e => f('classId', e.target.value)} onBlur={() => touch('classId')}
                  className={fc('classId')}>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {touched.classId && errors.classId && <p className="text-xs text-red-500 mt-1">{errors.classId}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Roll Number *</label>
                <input value={form.rollNumber} onChange={e => f('rollNumber', e.target.value)} onBlur={() => touch('rollNumber')}
                  placeholder="e.g. 25" className={fc('rollNumber')} />
                {touched.rollNumber && errors.rollNumber && <p className="text-xs text-red-500 mt-1">{errors.rollNumber}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Admission No.</label>
                <input value={form.admissionNo} onChange={e => f('admissionNo', e.target.value)}
                  placeholder="ADM-001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Gender</label>
                <select value={form.gender} onChange={e => f('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={e => f('dateOfBirth', e.target.value)}
                  onBlur={() => touch('dateOfBirth')}
                  max={new Date().toISOString().slice(0, 10)}
                  className={fc('dateOfBirth')} />
                {touched.dateOfBirth && errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
                <input value={form.phone} onChange={e => f('phone', e.target.value)} onBlur={() => touch('phone')}
                  placeholder="+91 98765 43210" className={fc('phone')} />
                {touched.phone && errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Blood Group</label>
                <select value={form.bloodGroup} onChange={e => f('bloodGroup', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Bus Route</label>
                <input value={form.busRoute} onChange={e => f('busRoute', e.target.value)}
                  placeholder="Route no. / area"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Address</label>
              <textarea value={form.address} onChange={e => f('address', e.target.value)} rows={2}
                placeholder="Home address"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
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

export default StudentsSection;
