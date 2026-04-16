import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const PERIODS = [1,2,3,4,5,6,7,8];

// ── Admin: Edit timetable ─────────────────────────────────────────────────────
const AdminTimetable = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [schedule, setSchedule] = useState<Record<string, Record<number, { subject: string; teacher: string; time: string }>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timetableId, setTimetableId] = useState<string | null>(null);

  useEffect(() => { api.get('/classes').then(r => setClasses(r.data)); }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    api.get(`/timetable?classId=${selectedClass}`).then(r => {
      const tt = r.data?.[0];
      const init: any = {};
      DAYS.forEach(d => { init[d] = {}; PERIODS.forEach(p => { init[d][p] = { subject: '', teacher: '', time: '' }; }); });
      if (tt) {
        setTimetableId(tt._id);
        tt.schedule?.forEach((day: any) => { day.periods?.forEach((period: any) => { if (!init[day.day]) init[day.day] = {}; init[day.day][period.period] = { subject: period.subject || '', teacher: period.teacher || '', time: period.time || '' }; }); });
      } else { setTimetableId(null); }
      setSchedule(init);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  const update = (day: string, period: number, key: string, value: string) => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [period]: { ...prev[day]?.[period], [key]: value } } }));

  const save = async () => {
    if (!selectedClass) return;
    setSaving(true); setSaved(false);
    try {
      const schedulePayload = DAYS.map(day => ({ day, periods: PERIODS.filter(p => schedule[day]?.[p]?.subject).map(p => ({ period: p, subject: schedule[day][p].subject, teacher: schedule[day][p].teacher, time: schedule[day][p].time })) })).filter(d => d.periods.length > 0);
      if (timetableId) await api.put(`/timetable/${timetableId}`, { classId: selectedClass, schedule: schedulePayload });
      else { const res = await api.post('/timetable', { classId: selectedClass, schedule: schedulePayload }); setTimetableId(res.data._id); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const cls = classes.find(c => c._id === selectedClass);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]">
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {selectedClass && <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Timetable'}</button>}
        {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
      </div>
      {!selectedClass ? <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">Select a class to edit its timetable</div>
        : loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-900">Timetable — {cls?.name}</h3><p className="text-xs text-gray-400 mt-0.5">Fill subject, teacher and time for each period. Leave blank to skip.</p></div>
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase w-28">Period</th>{DAYS.map(d => <th key={d} className="px-3 py-3 text-left text-gray-500 font-semibold uppercase">{d}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {PERIODS.map(period => (
                <tr key={period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-700">Period {period}</td>
                  {DAYS.map(day => (
                    <td key={day} className="px-2 py-2">
                      <div className="space-y-1">
                        <input value={schedule[day]?.[period]?.subject || ''} onChange={e => update(day, period, 'subject', e.target.value)} placeholder="Subject" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400" />
                        <input value={schedule[day]?.[period]?.teacher || ''} onChange={e => update(day, period, 'teacher', e.target.value)} placeholder="Teacher" className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs outline-none focus:border-indigo-300 bg-gray-50" />
                        <input value={schedule[day]?.[period]?.time || ''} onChange={e => update(day, period, 'time', e.target.value)} placeholder="9:00-9:45" className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs outline-none focus:border-indigo-300 bg-gray-50" />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Student / Teacher / Parent: View timetable ────────────────────────────────
const ViewTimetable = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');

  useEffect(() => {
    api.get('/classes').then(r => { setClasses(r.data); });
    // Auto-select class for students
    api.get('/students').then(r => {
      const me = r.data.find((s: any) => s.user?._id === user._id || s.user === user._id);
      if (me?.class?._id) setSelectedClass(me.class._id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    api.get(`/timetable?classId=${selectedClass}`).then(r => { setSchedule(r.data?.[0]?.schedule || []); }).finally(() => setLoading(false));
  }, [selectedClass]);

  const getCell = (day: string, period: number) => schedule.find((d: any) => d.day === day)?.periods?.find((p: any) => p.period === period);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]">
          <option value="">Select class</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      {!selectedClass ? <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">Select a class to view its timetable</div>
        : loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase w-24">Period</th>{DAYS.map(d => <th key={d} className="px-3 py-3 text-left text-gray-500 font-semibold uppercase">{d}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {PERIODS.map(period => (
                <tr key={period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-700">P{period}</td>
                  {DAYS.map(day => {
                    const cell = getCell(day, period);
                    return (
                      <td key={day} className="px-3 py-2">
                        {cell ? (<div><div className="font-semibold text-gray-800 text-xs">{cell.subject}</div><div className="text-gray-400 text-xs">{cell.teacher}</div>{cell.time && <div className="text-gray-400 text-xs">{cell.time}</div>}</div>) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const TimetableSection = ({ role }: { role: string }) => {
  if (role === 'admin' || role === 'superadmin') return <AdminTimetable />;
  return <ViewTimetable />;
};
export default TimetableSection;
