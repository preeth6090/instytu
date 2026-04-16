import React, { useEffect, useRef, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';
import { gstin as validateGstin, email as validateEmail, phone as validatePhone } from '../../../utils/validate';

const TABS = ['General', 'Invoice', 'Appearance'];

const SchoolSettingsSection = ({ role }: { role: string }) => {
  const [tab, setTab] = useState('General');
  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/institutions/me')
      .then(r => setInst(r.data))
      .catch(() => setInst(null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    // Client-side validation
    const emailErr = validateEmail(inst.email || '');
    if (emailErr) { setError(`Email: ${emailErr}`); return; }
    const phoneErr = validatePhone(inst.phone || '');
    if (phoneErr) { setError(`Phone: ${phoneErr}`); return; }
    const gstinErr = validateGstin(inst.gstn || '');
    if (gstinErr) { setError(`GSTIN: ${gstinErr}`); return; }
    if (inst.gstPercentage !== undefined && (Number(inst.gstPercentage) < 0 || Number(inst.gstPercentage) > 28)) {
      setError('GST % must be between 0 and 28'); return;
    }
    setSaving(true); setSaved(false); setError('');
    try {
      const r = await api.put('/institutions/me', inst);
      setInst(r.data);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError('Logo must be under 500KB'); return; }
    const reader = new FileReader();
    reader.onload = ev => setInst((p: any) => ({ ...p, logo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const set = (key: string, val: any) => setInst((p: any) => ({ ...p, [key]: val }));
  const setInv = (key: string, val: any) => setInst((p: any) => ({ ...p, invoiceSettings: { ...p.invoiceSettings, [key]: val } }));

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!inst) return <div className="text-center py-20 text-gray-400">Settings not available</div>;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {tab === 'General' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-900 text-base">Institution Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Institution Name *</label>
              <input value={inst.name || ''} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
              <input value={inst.email || ''} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
              <input value={inst.phone || ''} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Address</label>
              <textarea value={inst.address || ''} onChange={e => set('address', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Website</label>
              <input value={inst.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tagline</label>
              <input value={inst.tagline || ''} onChange={e => set('tagline', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">GST Number (GSTIN)</label>
              <input value={inst.gstn || ''} onChange={e => set('gstn', e.target.value)} placeholder="27AAPFU0939F1ZV" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">GST %</label>
              <input type="number" value={inst.gstPercentage ?? 18} onChange={e => set('gstPercentage', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Details (for invoice)</label>
              <textarea value={inst.bankDetails || ''} onChange={e => set('bankDetails', e.target.value)} rows={2} placeholder="Account No, IFSC, Bank Name, Branch" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h4 className="font-semibold text-gray-700 text-sm mb-3">Logo</h4>
            <div className="flex items-center gap-4">
              {inst.logo ? (
                <div className="relative">
                  <img src={inst.logo} alt="Logo" className="w-20 h-20 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2" />
                  <button onClick={() => set('logo', '')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center">×</button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">No logo</div>
              )}
              <div>
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200">Upload Logo</button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG · Max 500KB · Used as watermark on invoices</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Invoice' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-900 text-base">Invoice & Receipt Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Invoice Prefix</label>
              <input value={inst.invoiceSettings?.prefix || 'INV'} onChange={e => setInv('prefix', e.target.value)} placeholder="INV" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Invoice Suffix (optional)</label>
              <input value={inst.invoiceSettings?.suffix || ''} onChange={e => setInv('suffix', e.target.value)} placeholder="KPS" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Separator</label>
              <input value={inst.invoiceSettings?.separator || '-'} onChange={e => setInv('separator', e.target.value)} placeholder="-" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Sequence Reset</label>
              <select value={inst.invoiceSettings?.resetYearly ? 'yearly' : 'never'} onChange={e => setInv('resetYearly', e.target.value === 'yearly')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                <option value="yearly">Reset every academic year</option>
                <option value="never">Never reset (sequential forever)</option>
              </select>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
            Preview: <span className="font-mono font-semibold text-indigo-600">
              {inst.invoiceSettings?.prefix || 'INV'}{inst.invoiceSettings?.separator || '-'}{inst.invoiceSettings?.resetYearly ? `2025-26${inst.invoiceSettings?.separator || '-'}` : ''}0001{inst.invoiceSettings?.suffix ? `${inst.invoiceSettings?.separator || '-'}${inst.invoiceSettings?.suffix}` : ''}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Show on Invoice</label>
              <div className="space-y-2">
                {[['showGST','GST Number & %'],['showAddress','Address'],['showPhone','Phone'],['showBankDetails','Bank Details'],['showWatermark','Logo Watermark']].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!inst.invoiceSettings?.[k]} onChange={e => setInv(k, e.target.checked)} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              {inst.invoiceSettings?.showWatermark && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Watermark Opacity ({Math.round((inst.invoiceSettings?.watermarkOpacity || 0.08) * 100)}%)</label>
                  <input type="range" min="2" max="20" value={Math.round((inst.invoiceSettings?.watermarkOpacity || 0.08) * 100)} onChange={e => setInv('watermarkOpacity', Number(e.target.value) / 100)} className="w-full" />
                </div>
              )}
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Logo Position</label>
                <div className="flex gap-2">
                  {['left','center','right'].map(pos => (
                    <button key={pos} onClick={() => setInv('logoPosition', pos)} className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${inst.invoiceSettings?.logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{pos}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Invoice Header Text</label>
              <input value={inst.invoiceSettings?.headerText || ''} onChange={e => setInv('headerText', e.target.value)} placeholder="e.g. FEE RECEIPT" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Footer Text</label>
              <input value={inst.invoiceSettings?.footerText || ''} onChange={e => setInv('footerText', e.target.value)} placeholder="Thank you for your payment." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Terms & Conditions</label>
              <textarea value={inst.invoiceSettings?.terms || ''} onChange={e => setInv('terms', e.target.value)} rows={3} placeholder="Fee once paid is non-refundable..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
          </div>
        </div>
      )}

      {tab === 'Appearance' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-900 text-base">Appearance</h3>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Brand / Invoice Theme Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={inst.invoiceSettings?.theme || inst.primaryColor || '#4F46E5'} onChange={e => setInv('theme', e.target.value)} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input value={inst.invoiceSettings?.theme || inst.primaryColor || '#4F46E5'} onChange={e => setInv('theme', e.target.value)} className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Portal Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={inst.primaryColor || '#4F46E5'} onChange={e => set('primaryColor', e.target.value)} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input value={inst.primaryColor || '#4F46E5'} onChange={e => set('primaryColor', e.target.value)} className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSettingsSection;
