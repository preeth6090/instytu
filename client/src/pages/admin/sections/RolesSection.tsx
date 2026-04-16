import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const MODULES = [
  'fees', 'students', 'teachers', 'classes', 'attendance',
  'grades', 'homework', 'notices', 'leaves', 'timetable',
  'ptm', 'reports', 'settings',
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;
type Action = typeof ACTIONS[number];

type PermMatrix = Record<string, Record<Action, boolean>>;

const emptyMatrix = (): PermMatrix =>
  Object.fromEntries(MODULES.map(m => [m, { view: false, create: false, edit: false, delete: false, export: false }]));

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  permissions: PermMatrix;
}

const RolesSection = ({ role }: { role: string }) => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [matrix, setMatrix] = useState<PermMatrix>(emptyMatrix());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/custom-roles')
      .then(r => setRoles(r.data))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setName(''); setDescription('');
    setMatrix(emptyMatrix()); setError(''); setShowForm(true);
  };

  const openEdit = (r: CustomRole) => {
    setEditing(r); setName(r.name); setDescription(r.description || '');
    // merge with emptyMatrix so new modules don't crash
    const merged = emptyMatrix();
    if (r.permissions) {
      for (const mod of MODULES) {
        if (r.permissions[mod]) {
          for (const act of ACTIONS) {
            merged[mod][act] = !!r.permissions[mod][act];
          }
        }
      }
    }
    setMatrix(merged); setError(''); setShowForm(true);
  };

  const toggle = (mod: string, act: Action) => {
    setMatrix(prev => ({
      ...prev,
      [mod]: { ...prev[mod], [act]: !prev[mod][act] },
    }));
  };

  const toggleRow = (mod: string) => {
    const allOn = ACTIONS.every(a => matrix[mod][a]);
    setMatrix(prev => ({
      ...prev,
      [mod]: Object.fromEntries(ACTIONS.map(a => [a, !allOn])) as Record<Action, boolean>,
    }));
  };

  const toggleCol = (act: Action) => {
    const allOn = MODULES.every(m => matrix[m][act]);
    setMatrix(prev => {
      const next = { ...prev };
      for (const mod of MODULES) next[mod] = { ...next[mod], [act]: !allOn };
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) { setError('Role name is required'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const r = await api.put(`/custom-roles/${editing._id}`, { name, description, permissions: matrix });
        setRoles(prev => prev.map(x => x._id === editing._id ? r.data : x));
      } else {
        const r = await api.post('/custom-roles', { name, description, permissions: matrix });
        setRoles(prev => [...prev, r.data]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await api.delete(`/custom-roles/${id}`);
      setRoles(prev => prev.filter(r => r._id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete role');
    } finally {
      setConfirmDelete(null);
    }
  };

  const permCount = (r: CustomRole) => {
    let c = 0;
    for (const mod of MODULES) if (r.permissions?.[mod]) for (const act of ACTIONS) if (r.permissions[mod][act]) c++;
    return c;
  };

  const canEdit = role === 'admin' || role === 'superadmin';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Roles</h2>
          <p className="text-sm text-gray-500 mt-1">Create roles with granular module-level permissions</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Create Role
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🔐</div>
          <p className="font-medium">No custom roles defined yet</p>
          {canEdit && <p className="text-sm mt-1">Create a role like "Accountant" or "Receptionist" with specific permissions</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(r => (
            <div key={r._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                  <p className="text-xs text-indigo-600 mt-2 font-medium">{permCount(r)} permissions granted</p>
                </div>
                {canEdit && (
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => openEdit(r)} className="text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                    <button onClick={() => setConfirmDelete(r._id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                  </div>
                )}
              </div>
              {/* mini permission summary */}
              <div className="mt-3 flex flex-wrap gap-1">
                {MODULES.filter(m => r.permissions?.[m]?.view).map(m => (
                  <span key={m} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded capitalize">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Role' : 'Create Role'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-5">
              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">{error}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Accountant, Receptionist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Permission Matrix */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Permissions Matrix</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Module</th>
                        {ACTIONS.map(act => (
                          <th key={act} className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleCol(act)}
                              className="text-xs font-medium text-gray-600 hover:text-indigo-600 capitalize transition"
                              title={`Toggle all ${act}`}
                            >
                              {act}
                            </button>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-400">All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod, idx) => {
                        const rowAllOn = ACTIONS.every(a => matrix[mod][a]);
                        return (
                          <tr key={mod} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-4 py-2.5 font-medium text-gray-700 capitalize">{mod}</td>
                            {ACTIONS.map(act => (
                              <td key={act} className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={matrix[mod][act]}
                                  onChange={() => toggle(mod, act)}
                                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={rowAllOn}
                                onChange={() => toggleRow(mod)}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                title="Toggle all for this module"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Click column headers to toggle entire columns. Last column toggles the whole row.</p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Spinner />}
                {editing ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Role?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Users assigned this role will lose their custom permissions. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteRole(confirmDelete)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesSection;
