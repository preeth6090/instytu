import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const PERIODS = [1,2,3,4,5,6,7,8];

const TimetableSection = () => {
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
      if (tt) {
        setTimetableId(tt._id);
        const init: any = {};
        DAYS.forEach(d => { init[d] = {}; PERIODS.forEach(p => { init[d][p] = { subject: '', teacher: '', time: '' }; }); });
        tt.schedule?.forEach((day: any) => {
          day.periods?.forEach((period: any) => {
            if (!init[day.day]) init[day.day] = {};
            init[day.day][period.period] = { subject: period.subject || '', teacher: period.teacher || '', time: period.time || '' };
          });
        });
        setSchedule(init);
      } else {
        setTimetableId(null);
        const init: any = {};
        DAYS.forEach(d => { init[d] = {}; PERIODS.forEach(p => { init[d][p] = { subject: '', teacher: '', time: '' }; }); });
        setSchedule(init);
      }
    }).finally(() => setLoading(false));
  }, [selectedClass]);

  const update = (day: string, period: number, key: string, value: string) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [period]: { ...prev[day]?.[period], [key]: value } } }));
  };

  const save = async () => {
    if (!selectedClass) return;
    setSaving(true); setSaved(false);
    try {
      const schedulePayload = DAYS.map(day => ({
        day,
        periods: PERIODS.filter(p => schedule[day]?.[p]?.subject).map(p => ({
          period: p,
          subject: schedule[day][p].subject,
          teacher: schedule[day][p].teacher,
          time: schedule[day][p].time,
        })),
      })).filter(d => d.periods.length > 0);

      if (timetableId) {
        await api.put(`/timetable/${timetableId}`, { classId: selectedClass, schedule: schedulePayload });
      } else {
        const res = await api.post('/timetable', { classId: selectedClass, schedule: schedulePayload });
        setTimetableId(res.data._id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const cls = classes.find(c => c._id === selectedClass);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]">
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {selectedClass && (
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Timetable'}
          </button>
        )}
        {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
      </div>

      {!selectedClass ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">Select a class to edit its timetable</div>
      ) : loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Timetable — {cls?.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Fill in subject name, teacher name and time for each period. Leave blank to skip.</p>
          </div>
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase w-28">Period</th>
                {DAYS.map(d => <th key={d} className="px-3 py-3 text-left text-gray-500 font-semibold uppercase">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {PERIODS.map(period => (
                <tr key={period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-700">Period {period}</td>
                  {DAYS.map(day => (
                    <td key={day} className="px-2 py-2">
                      <div className="space-y-1">
                        <input value={schedule[day]?.[period]?.subject || ''} onChange={e => update(day, period, 'subject', e.target.value)}
                          placeholder="Subject" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400" />
                        <input value={schedule[day]?.[period]?.teacher || ''} onChange={e => update(day, period, 'teacher', e.target.value)}
                          placeholder="Teacher" className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs outline-none focus:border-indigo-300 bg-gray-50" />
                        <input value={schedule[day]?.[period]?.time || ''} onChange={e => update(day, period, 'time', e.target.value)}
                          placeholder="9:00-9:45" className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs outline-none focus:border-indigo-300 bg-gray-50" />
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

export default TimetableSection;
