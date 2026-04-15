import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const TYPES = ['general','exam','event','holiday','urgent'];
const typeVariant: any = { general: 'blue', exam: 'purple', event: 'green', holiday: 'yellow', urgent: 'red' };
const blank = () => ({ title: '', content: '', type: 'general', targetRoles: ['student','parent','teacher'], expiresAt: '' });

const NoticesSection = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = () => api.get('/notices').then(r => setNotices(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(blank()); setEditing(null); setError(''); setModal('add'); };
  const openEdit = (n: any) => {
    setForm({ title: n.title, content: n.content, type: n.type, targetRoles: n.targetRoles || [], expiresAt: n.expiresAt ? n.expiresAt.slice(0, 10) : '' });
    setEditing(n._id); setError(''); setModal('edit');
  };

  const save = async () => {
    if (!form.title || !form.content) return setError('Title and content are required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/notices/${editing}`, form);
      else await api.post('/notices', form);
      setModal(null); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this notice?')) return;
    await api.delete(`/notices/${id}`); load();
  };

  const toggleRole = (role: string) => {
    setForm((p: any) => ({
      ...p,
      targetRoles: p.targetRoles.includes(role)
        ? p.targetRoles.filter((r: string) => r !== role)
        : [...p.targetRoles, role],
    }));
  };

  const filtered = !filterType ? notices : notices.filter(n => n.type === filterType);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 ml-auto">
          + Post Notice
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="space-y-3">
          {filtered.length === 0 ? <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">No notices found</div> : filtered.map(n => (
            <div key={n._id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge label={n.type} variant={typeVariant[n.type] || 'gray'} />
                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                    {n.expiresAt && <span className="text-xs text-gray-400">· Expires {new Date(n.expiresAt).toLocaleDateString()}</span>}
                  </div>
                  <h3 className="font-bold text-gray-900">{n.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.content}</p>
                  <div className="flex gap-1.5 mt-2">
                    {(n.targetRoles || []).map((r: string) => (
                      <span key={r} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{r}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(n)} className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                  <button onClick={() => remove(n._id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Post Notice' : 'Edit Notice'} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Notice title"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Expires At</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Target Audience</label>
              <div className="flex gap-2">
                {['student','teacher','parent','admin'].map(role => (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${form.targetRoles.includes(role) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Content *</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={5} placeholder="Notice content..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Post'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NoticesSection;
