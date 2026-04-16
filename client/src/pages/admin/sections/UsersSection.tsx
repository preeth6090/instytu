import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const ROLES = ['admin', 'teacher', 'student', 'parent', 'staff'];

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  customRole?: { _id: string; name: string };
  campus?: { _id: string; name: string };
  isActive: boolean;
}

interface CustomRole { _id: string; name: string; }
interface Campus { _id: string; name: string; code: string; }

const emptyForm = () => ({
  name: '', email: '', password: '', role: 'staff',
  customRole: '', campus: '', isActive: true,
});

const UsersSection = ({ role }: { role: string }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/users'),
      api.get('/custom-roles'),
      api.get('/campuses'),
    ]).then(([u, cr, cam]) => {
      setUsers(u.data);
      setCustomRoles(cr.data);
      setCampuses(cam.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      customRole: u.customRole?._id || '',
      campus: u.campus?._id || '',
      isActive: u.isActive,
    });
    setError(''); setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return; }
    if (!editing && !form.password.trim()) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        name: form.name, email: form.email, role: form.role,
        customRole: form.customRole || undefined,
        campus: form.campus || undefined,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        const r = await api.put(`/users/${editing._id}`, payload);
        setUsers(prev => prev.map(u => u._id === editing._id ? r.data : u));
      } else {
        const r = await api.post('/users', payload);
        setUsers(prev => [...prev, r.data]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete user');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
    parent: 'bg-yellow-100 text-yellow-700',
    staff: 'bg-gray-100 text-gray-700',
    superadmin: 'bg-red-100 text-red-700',
  };

  const canEdit = role === 'admin' || role === 'superadmin';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">Manage staff, teachers, and other personnel accounts</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64"
          placeholder="Search name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">👤</div>
          <p className="font-medium">{users.length === 0 ? 'No users yet' : 'No users match your search'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Campus</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Custom Role</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                {canEdit && <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded capitalize ${roleColor[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.campus?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.customRole?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(u)} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Edit</button>
                      <button onClick={() => setConfirmDelete(u._id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">{error}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editing ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}>
                    <option value="">No campus</option>
                    {campuses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Role (Optional)</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.customRole} onChange={e => setForm(f => ({ ...f, customRole: e.target.value }))}>
                  <option value="">None — use default role permissions</option>
                  {customRoles.map(cr => <option key={cr._id} value={cr._id}>{cr.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">If set, this overrides the user's base role permissions</p>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="uActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="uActive" className="text-sm text-gray-700">Account active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner />}
                {editing ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove the user account. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteUser(confirmDelete)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
