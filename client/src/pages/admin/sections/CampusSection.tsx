import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

interface Campus {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

const empty = (): Partial<Campus> => ({ name: '', code: '', address: '', phone: '', isActive: true });

const CampusSection = ({ role }: { role: string }) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [form, setForm] = useState<Partial<Campus>>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/campuses')
      .then(r => setCampuses(r.data))
      .catch(() => setCampuses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty()); setError(''); setShowForm(true); };
  const openEdit = (c: Campus) => { setEditing(c); setForm({ ...c }); setError(''); setShowForm(true); };

  const save = async () => {
    if (!form.name?.trim()) { setError('Campus name is required'); return; }
    if (!form.code?.trim()) { setError('Campus code is required'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const r = await api.put(`/campuses/${editing._id}`, form);
        setCampuses(prev => prev.map(c => c._id === editing._id ? r.data : c));
      } else {
        const r = await api.post('/campuses', form);
        setCampuses(prev => [...prev, r.data]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save campus');
    } finally {
      setSaving(false);
    }
  };

  const deleteCampus = async (id: string) => {
    try {
      await api.delete(`/campuses/${id}`);
      setCampuses(prev => prev.filter(c => c._id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete campus');
    } finally {
      setConfirmDelete(null);
    }
  };

  const canEdit = role === 'admin' || role === 'superadmin';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campuses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage branches and campuses of your institution</p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Add Campus
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : campuses.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🏫</div>
          <p className="font-medium">No campuses added yet</p>
          {canEdit && <p className="text-sm mt-1">Click "Add Campus" to create your first campus</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campuses.map(campus => (
            <div key={campus._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{campus.name}</span>
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-mono px-2 py-0.5 rounded">
                      {campus.code}
                    </span>
                    {!campus.isActive && (
                      <span className="inline-block bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  {campus.address && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{campus.address}</p>
                  )}
                  {campus.phone && (
                    <p className="text-sm text-gray-400 mt-0.5">{campus.phone}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => openEdit(campus)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(campus._id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Campus' : 'Add Campus'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Main Campus, North Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus Code *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.code || ''}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. MAIN, NORTH"
                  maxLength={10}
                />
                <p className="text-xs text-gray-400 mt-1">Short identifier used in reports</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={2}
                  value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Full address of this campus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive ?? true}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Spinner />}
                {editing ? 'Save Changes' : 'Add Campus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Campus?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. Students and users assigned to this campus will lose their campus assignment.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteCampus(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusSection;
