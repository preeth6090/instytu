import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

interface Widget {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'text';
  title: string;
  query: string;
  data?: any;
  loading?: boolean;
  error?: string;
  size?: 'small' | 'medium' | 'large';
}

interface SavedConfig {
  _id: string;
  name: string;
  widgets: Widget[];
}

const WIDGET_SIZES = [
  { value: 'small', label: 'Small (1 col)' },
  { value: 'medium', label: 'Medium (2 col)' },
  { value: 'large', label: 'Full width' },
];

const WidgetDashboard = ({ role }: { role: string }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [, setLoadingConfigs] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [saveConfigName, setSaveConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

  useEffect(() => {
    setLoadingConfigs(true);
    api.get('/widgets').then(r => {
      const configs = Array.isArray(r.data) ? r.data : [];
      setSavedConfigs(configs);
      // Auto-load first config if exists
      if (configs.length > 0) {
        loadConfig(configs[0]);
      }
    }).catch(() => {}).finally(() => setLoadingConfigs(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConfig = (config: SavedConfig) => {
    setWidgets(config.widgets.map(w => ({ ...w, data: undefined, loading: false, error: undefined })));
    // Fetch data for all widgets
    config.widgets.forEach(w => fetchWidgetData(w.id, w.query, config.widgets));
  };

  const fetchWidgetData = async (id: string, query: string, currentWidgets?: Widget[]) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, loading: true, error: undefined } : w));
    try {
      const r = await api.post('/ai/widget-data', { query });
      setWidgets(prev => prev.map(w => w.id === id ? { ...w, loading: false, data: r.data } : w));
    } catch (e: any) {
      setWidgets(prev => prev.map(w => w.id === id ? { ...w, loading: false, error: e.response?.data?.message || 'Failed to load data' } : w));
    }
  };

  const generateWidget = async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setGenError('');
    try {
      const r = await api.post('/ai/generate-widget', { prompt });
      const newWidget: Widget = {
        id: `w_${Date.now()}`,
        ...r.data,
        data: undefined,
        loading: true,
        size: r.data.size || 'medium',
      };
      setWidgets(prev => [...prev, newWidget]);
      setShowPrompt(false);
      setPrompt('');
      fetchWidgetData(newWidget.id, newWidget.query);
    } catch (e: any) {
      setGenError(e.response?.data?.message || 'Failed to generate widget');
    } finally {
      setGenerating(false);
    }
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const refreshWidget = (w: Widget) => {
    fetchWidgetData(w.id, w.query);
  };

  const saveConfig = async () => {
    if (!saveConfigName.trim()) return;
    setSaving(true);
    try {
      const payload = { name: saveConfigName, widgets: widgets.map(w => ({ id: w.id, type: w.type, title: w.title, query: w.query, size: w.size })) };
      const r = await api.post('/widgets', payload);
      setSavedConfigs(prev => [...prev.filter(c => c.name !== saveConfigName), r.data]);
      setShowSaveDialog(false);
      setSaveConfigName('');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      await api.delete(`/widgets/${id}`);
      setSavedConfigs(prev => prev.filter(c => c._id !== id));
    } catch { alert('Failed to delete config'); }
  };

  const renderWidgetContent = (w: Widget) => {
    if (w.loading) return <div className="flex justify-center py-8"><Spinner /></div>;
    if (w.error) return (
      <div className="text-center py-6 text-red-500 text-sm">
        <p>{w.error}</p>
        <button onClick={() => refreshWidget(w)} className="mt-2 text-xs text-indigo-600 hover:underline">Retry</button>
      </div>
    );
    if (!w.data) return <div className="text-center py-6 text-gray-400 text-sm">No data</div>;

    const d = w.data;

    if (w.type === 'stat') {
      return (
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-indigo-600">{d.value ?? d.total ?? '—'}</p>
          {d.label && <p className="text-sm text-gray-500 mt-1">{d.label}</p>}
          {d.change !== undefined && (
            <p className={`text-xs mt-1 font-medium ${d.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {d.change >= 0 ? '▲' : '▼'} {Math.abs(d.change)}%
            </p>
          )}
        </div>
      );
    }

    if (w.type === 'chart') {
      const entries: [string, number][] = Object.entries(d.byMode || d.byDay || d.byCampus || d.data || {});
      if (!entries.length) return <div className="text-center py-6 text-gray-400 text-sm">No chart data</div>;
      const max = Math.max(...entries.map(([, v]) => v as number), 1);
      return (
        <div className="space-y-2 py-2">
          {entries.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-24 text-xs text-gray-500 truncate capitalize">{label.replace(/_/g, ' ')}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div className="bg-indigo-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${Math.max(4, (value / max) * 100)}%` }}>
                  <span className="text-white text-xs font-medium">
                    {typeof value === 'number' && value > 999 ? `₹${(value/1000).toFixed(1)}k` : value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (w.type === 'table') {
      const rows: any[] = d.rows || d.items || d.data || [];
      if (!rows.length) return <div className="text-center py-6 text-gray-400 text-sm">No data</div>;
      const keys = Object.keys(rows[0]);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b">{keys.map(k => <th key={k} className="text-left px-2 py-1.5 text-gray-500 capitalize">{k}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i}>{keys.map(k => <td key={k} className="px-2 py-1.5 text-gray-700">{String(row[k] ?? '—')}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && <p className="text-xs text-gray-400 text-center mt-1">+{rows.length - 10} more rows</p>}
        </div>
      );
    }

    if (w.type === 'text') {
      return <p className="text-sm text-gray-700 whitespace-pre-wrap py-2">{d.text || d.message || JSON.stringify(d, null, 2)}</p>;
    }

    // Fallback: render as JSON
    return (
      <pre className="text-xs text-gray-600 overflow-x-auto bg-gray-50 rounded p-2 max-h-48">
        {JSON.stringify(d, null, 2)}
      </pre>
    );
  };

  const sizeClass: Record<string, string> = {
    small: 'col-span-1',
    medium: 'col-span-1 sm:col-span-2',
    large: 'col-span-1 sm:col-span-3',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Widget Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">AI-powered analytics — describe what you want to see</p>
        </div>
        <div className="flex gap-2">
          {widgets.length > 0 && (
            <button onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">
              Save Layout
            </button>
          )}
          <button onClick={() => setShowPrompt(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Add Widget
          </button>
        </div>
      </div>

      {/* Saved Configs */}
      {savedConfigs.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <span className="text-xs text-gray-500 self-center">Quick load:</span>
          {savedConfigs.map(cfg => (
            <div key={cfg._id} className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
              <button onClick={() => loadConfig(cfg)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                {cfg.name}
              </button>
              <button onClick={() => deleteConfig(cfg._id)} className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition">×</button>
            </div>
          ))}
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-medium text-gray-600">No widgets yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Describe what data you want to see and AI will create it</p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['Show fees collected today by mode', 'Top 5 defaulters this month', 'Campus-wise collection this week', 'Cash vs UPI comparison'].map(ex => (
              <button key={ex} onClick={() => { setPrompt(ex); setShowPrompt(true); }}
                className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition">
                {ex}
              </button>
            ))}
          </div>
          <button onClick={() => setShowPrompt(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
            Create First Widget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {widgets.map(w => (
            <div key={w.id} className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${sizeClass[w.size || 'medium']}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <p className="font-medium text-gray-800 text-sm truncate">{w.title}</p>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <button onClick={() => refreshWidget(w)} className="text-gray-400 hover:text-indigo-600 text-xs" title="Refresh">↻</button>
                  <button onClick={() => setEditingWidget(w)} className="text-gray-400 hover:text-indigo-600 text-xs" title="Edit">✎</button>
                  <button onClick={() => removeWidget(w.id)} className="text-gray-400 hover:text-red-500 text-xs" title="Remove">×</button>
                </div>
              </div>
              <div className="p-4">
                {renderWidgetContent(w)}
                <p className="text-xs text-gray-300 mt-2 italic truncate">{w.query}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Widget Modal */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Widget with AI</h3>
              <button onClick={() => { setShowPrompt(false); setGenError(''); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Describe what you want to see</label>
              <textarea
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Show me total fees collected today broken down by payment mode"
                autoFocus
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {['Today\'s collection by mode', 'Pending dues by campus', 'Monthly trend', 'Top defaulters'].map(s => (
                  <button key={s} onClick={() => setPrompt(s)}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                    {s}
                  </button>
                ))}
              </div>
              {genError && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm mt-3">{genError}</div>}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => { setShowPrompt(false); setGenError(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={generateWidget} disabled={generating || !prompt.trim()}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {generating && <Spinner />}
                {generating ? 'Generating...' : 'Generate Widget'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Widget Modal */}
      {editingWidget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Widget</h3>
              <button onClick={() => setEditingWidget(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={editingWidget.title} onChange={e => setEditingWidget(w => w ? { ...w, title: e.target.value } : w)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={editingWidget.size || 'medium'} onChange={e => setEditingWidget(w => w ? { ...w, size: e.target.value as any } : w)}>
                  {WIDGET_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Query</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  rows={2} value={editingWidget.query} onChange={e => setEditingWidget(w => w ? { ...w, query: e.target.value } : w)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t justify-end">
              <button onClick={() => setEditingWidget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                if (!editingWidget) return;
                setWidgets(prev => prev.map(w => w.id === editingWidget.id ? { ...editingWidget } : w));
                fetchWidgetData(editingWidget.id, editingWidget.query);
                setEditingWidget(null);
              }} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Save & Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Config Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Save Dashboard Layout</h3>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
              value={saveConfigName} onChange={e => setSaveConfigName(e.target.value)} placeholder="e.g. Daily Finance View, End-of-Day Report"
              autoFocus />
            <p className="text-xs text-gray-400 mb-4">This saves your current {widgets.length} widget(s) as a quick-load preset.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveConfig} disabled={saving || !saveConfigName.trim()} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner />} Save Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetDashboard;
