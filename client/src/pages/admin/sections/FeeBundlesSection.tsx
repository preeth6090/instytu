import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const TAX_TYPES = ['none', 'CGST+SGST', 'IGST'];
const DISCOUNT_TYPES = ['scholarship', 'concession', 'sibling', 'merit', 'fee_reduction', 'staff_ward', 'other'];

interface Component {
  name: string;
  amount: number;
  taxable: boolean;
  taxType: string;
  taxRate: number;
}

interface Bundle {
  _id: string;
  name: string;
  description?: string;
  academicYear: string;
  totalAmount: number;
  components: Component[];
  isActive: boolean;
}

interface Student {
  _id: string;
  user: { name: string; email: string };
  rollNumber: string;
  class?: { name: string };
}

interface Discount {
  _id: string;
  type: string;
  label?: string;
  amount?: number;
  percentage?: number;
  applicableTo: string;
}

const emptyComponent = (): Component => ({ name: '', amount: 0, taxable: false, taxType: 'none', taxRate: 0 });
const emptyBundle = () => ({ name: '', description: '', academicYear: '2025-26', components: [emptyComponent()], isActive: true });

const TABS = ['Bundles', 'Assign to Students', 'Discounts'];

const FeeBundlesSection = ({ role }: { role: string }) => {
  const [tab, setTab] = useState('Bundles');
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [form, setForm] = useState<any>(emptyBundle());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Assign tab
  const [selStudent, setSelStudent] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignYear, setAssignYear] = useState('2025-26');
  const [loadingAssign, setLoadingAssign] = useState(false);

  // Discounts tab
  const [discountStudent, setDiscountStudent] = useState('');
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showDiscForm, setShowDiscForm] = useState(false);
  const [discForm, setDiscForm] = useState<any>({ type: 'scholarship', label: '', amount: '', percentage: '', applicableTo: 'all', bundleId: '' });
  const [savingDisc, setSavingDisc] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/fee-bundles'), api.get('/students')])
      .then(([b, s]) => { setBundles(b.data); setStudents(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Load assignments when student selected
  useEffect(() => {
    if (!selStudent) { setAssignments([]); return; }
    setLoadingAssign(true);
    api.get(`/fee-bundles/assignments?student=${selStudent}&academicYear=${assignYear}`)
      .then(r => setAssignments(r.data))
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssign(false));
  }, [selStudent, assignYear]);

  // ── Load discounts when student selected
  useEffect(() => {
    if (!discountStudent) { setDiscounts([]); return; }
    api.get(`/fee-bundles/discounts?student=${discountStudent}`)
      .then(r => setDiscounts(r.data))
      .catch(() => setDiscounts([]));
  }, [discountStudent]);

  const openAdd = () => { setEditing(null); setForm(emptyBundle()); setError(''); setShowForm(true); };
  const openEdit = (b: Bundle) => {
    setEditing(b);
    setForm({ ...b, components: b.components.map(c => ({ ...c })) });
    setError(''); setShowForm(true);
  };

  const setComp = (idx: number, field: string, value: any) => {
    setForm((f: any) => {
      const comps = [...f.components];
      comps[idx] = { ...comps[idx], [field]: value };
      return { ...f, components: comps };
    });
  };

  const addComp = () => setForm((f: any) => ({ ...f, components: [...f.components, emptyComponent()] }));
  const removeComp = (idx: number) => setForm((f: any) => ({ ...f, components: f.components.filter((_: any, i: number) => i !== idx) }));

  const save = async () => {
    if (!form.name?.trim()) { setError('Bundle name is required'); return; }
    if (!form.components?.length) { setError('Add at least one fee component'); return; }
    for (const c of form.components) {
      if (!c.name?.trim()) { setError('All components must have a name'); return; }
    }
    setSaving(true); setError('');
    try {
      if (editing) {
        const r = await api.put(`/fee-bundles/${editing._id}`, form);
        setBundles(prev => prev.map(b => b._id === editing._id ? r.data : b));
      } else {
        const r = await api.post('/fee-bundles', form);
        setBundles(prev => [...prev, r.data]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  const assignBundle = async (bundleId: string) => {
    try {
      await api.post('/fee-bundles/assignments', { student: selStudent, bundle: bundleId, academicYear: assignYear });
      const r = await api.get(`/fee-bundles/assignments?student=${selStudent}&academicYear=${assignYear}`);
      setAssignments(r.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to assign'); }
  };

  const unassignBundle = async (assignId: string) => {
    try {
      await api.delete(`/fee-bundles/assignments/${assignId}`);
      setAssignments(prev => prev.filter((a: any) => a._id !== assignId));
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to remove'); }
  };

  const saveDiscount = async () => {
    if (!discountStudent) return;
    setSavingDisc(true);
    try {
      const payload: any = { student: discountStudent, type: discForm.type, label: discForm.label, applicableTo: discForm.applicableTo === 'bundle' ? discForm.bundleId : 'all' };
      if (discForm.amount) payload.amount = Number(discForm.amount);
      if (discForm.percentage) payload.percentage = Number(discForm.percentage);
      await api.post('/fee-bundles/discounts', payload);
      const r = await api.get(`/fee-bundles/discounts?student=${discountStudent}`);
      setDiscounts(r.data);
      setShowDiscForm(false);
      setDiscForm({ type: 'scholarship', label: '', amount: '', percentage: '', applicableTo: 'all', bundleId: '' });
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to add discount'); }
    finally { setSavingDisc(false); }
  };

  const deleteDiscount = async (id: string) => {
    try {
      await api.delete(`/fee-bundles/discounts/${id}`);
      setDiscounts(prev => prev.filter(d => d._id !== id));
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const assignedIds = new Set(assignments.map((a: any) => a.bundle?._id || a.bundle));

  const canEdit = role === 'admin' || role === 'superadmin';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Bundles</h2>
          <p className="text-sm text-gray-500 mt-1">Define fee structures, assign to students, and manage discounts</p>
        </div>
        {tab === 'Bundles' && canEdit && (
          <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + New Bundle
          </button>
        )}
        {tab === 'Discounts' && discountStudent && canEdit && (
          <button onClick={() => setShowDiscForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Add Discount
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg transition font-medium ${tab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tab === 'Bundles' ? (
        /* ── BUNDLES TAB ── */
        bundles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-3">📦</div>
            <p className="font-medium">No fee bundles created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bundles.map(b => (
              <div key={b._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{b.academicYear}</span>
                    {!b.isActive && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-indigo-600">₹{b.totalAmount?.toLocaleString()}</span>
                    {canEdit && (
                      <button onClick={() => openEdit(b)} className="text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                    )}
                  </div>
                </div>
                <div className="px-5 py-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {b.components.map((c, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-gray-700">{c.name}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">₹{c.amount?.toLocaleString()}</p>
                        {c.taxable && <p className="text-xs text-orange-500">{c.taxType} {c.taxRate}%</p>}
                      </div>
                    ))}
                  </div>
                  {b.description && <p className="text-xs text-gray-400 mt-2">{b.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'Assign to Students' ? (
        /* ── ASSIGN TAB ── */
        <div className="space-y-5">
          <div className="flex gap-3 flex-wrap">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 min-w-48"
              value={selStudent} onChange={e => setSelStudent(e.target.value)}>
              <option value="">Select a student...</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.user?.name} — {s.rollNumber}</option>
              ))}
            </select>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-32"
              placeholder="Year" value={assignYear} onChange={e => setAssignYear(e.target.value)} />
          </div>

          {selStudent && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <p className="text-sm font-medium text-gray-700">Available Bundles</p>
              </div>
              {loadingAssign ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {bundles.filter(b => b.isActive).map(b => {
                    const isAssigned = assignedIds.has(b._id);
                    return (
                      <div key={b._id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                          <p className="text-xs text-gray-500">₹{b.totalAmount?.toLocaleString()} · {b.components.length} components</p>
                        </div>
                        {canEdit && (
                          isAssigned ? (
                            <button
                              onClick={() => { const a = assignments.find((x: any) => (x.bundle?._id || x.bundle) === b._id); if (a) unassignBundle(a._id); }}
                              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                            >
                              Remove
                            </button>
                          ) : (
                            <button onClick={() => assignBundle(b._id)}
                              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                              Assign
                            </button>
                          )
                        )}
                        {isAssigned && <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Assigned</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {!selStudent && <p className="text-sm text-gray-400 text-center py-8">Select a student to manage their bundle assignments</p>}
        </div>
      ) : (
        /* ── DISCOUNTS TAB ── */
        <div className="space-y-5">
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full max-w-xs"
            value={discountStudent} onChange={e => setDiscountStudent(e.target.value)}>
            <option value="">Select a student...</option>
            {students.map(s => <option key={s._id} value={s._id}>{s.user?.name} — {s.rollNumber}</option>)}
          </select>

          {discountStudent && (
            discounts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No discounts for this student</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Label</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Value</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Applies To</th>
                      {canEdit && <th className="text-right px-4 py-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {discounts.map(d => (
                      <tr key={d._id}>
                        <td className="px-4 py-3 capitalize font-medium text-gray-800">{d.type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-gray-500">{d.label || '—'}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">
                          {d.amount ? `₹${d.amount.toLocaleString()}` : d.percentage ? `${d.percentage}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{d.applicableTo === 'all' ? 'All fees' : 'Specific bundle'}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteDiscount(d._id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {!discountStudent && <p className="text-sm text-gray-400 text-center py-8">Select a student to manage their discounts</p>}
        </div>
      )}

      {/* Bundle Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Bundle' : 'New Fee Bundle'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">{error}</div>}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Annual Tuition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.academicYear} onChange={e => setForm((f: any) => ({ ...f, academicYear: e.target.value }))} placeholder="2025-26" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
              </div>

              {/* Components */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Fee Components</p>
                  <button onClick={addComp} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Component</button>
                </div>
                <div className="space-y-3">
                  {form.components.map((c: Component, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-gray-500">Component {idx + 1}</p>
                        {form.components.length > 1 && (
                          <button onClick={() => removeComp(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                          <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={c.name} onChange={e => setComp(idx, 'name', e.target.value)} placeholder="e.g. Tuition Fee" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Amount (₹)</label>
                          <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={c.amount} onChange={e => setComp(idx, 'amount', Number(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <input type="checkbox" id={`tax-${idx}`} checked={c.taxable} onChange={e => setComp(idx, 'taxable', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                          <label htmlFor={`tax-${idx}`} className="text-xs text-gray-700">Taxable</label>
                          {c.taxable && (
                            <>
                              <select className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ml-3"
                                value={c.taxType} onChange={e => setComp(idx, 'taxType', e.target.value)}>
                                {TAX_TYPES.map(t => <option key={t}>{t}</option>)}
                              </select>
                              <input type="number" min={0} max={100} className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={c.taxRate} onChange={e => setComp(idx, 'taxRate', Number(e.target.value))} placeholder="%" />
                              <span className="text-xs text-gray-400">%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="bActive" checked={form.isActive} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="bActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner />}
                {editing ? 'Save Changes' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Form Modal */}
      {showDiscForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Add Discount</h3>
              <button onClick={() => setShowDiscForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={discForm.type} onChange={e => setDiscForm((f: any) => ({ ...f, type: e.target.value }))}>
                  {DISCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label / Note</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={discForm.label} onChange={e => setDiscForm((f: any) => ({ ...f, label: e.target.value }))} placeholder="e.g. Merit scholarship 2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat Amount (₹)</label>
                  <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={discForm.amount} onChange={e => setDiscForm((f: any) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OR Percentage (%)</label>
                  <input type="number" min={0} max={100} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={discForm.percentage} onChange={e => setDiscForm((f: any) => ({ ...f, percentage: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={discForm.applicableTo} onChange={e => setDiscForm((f: any) => ({ ...f, applicableTo: e.target.value }))}>
                  <option value="all">All fees</option>
                  <option value="bundle">Specific bundle</option>
                </select>
              </div>
              {discForm.applicableTo === 'bundle' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bundle</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={discForm.bundleId} onChange={e => setDiscForm((f: any) => ({ ...f, bundleId: e.target.value }))}>
                    <option value="">Select bundle...</option>
                    {bundles.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => setShowDiscForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveDiscount} disabled={savingDisc} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {savingDisc && <Spinner />}
                Add Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeBundlesSection;
