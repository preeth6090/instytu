import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const statusVariant: any = { present: 'green', absent: 'red', late: 'yellow', holiday: 'blue' };

const AdminAttendance = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'mark' | 'view'>('mark');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/classes').then(r => setClasses(r.data)); }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    Promise.all([api.get(`/students?classId=${selectedClass}`), api.get(`/attendance?classId=${selectedClass}`)])
      .then(([s, a]) => {
        setStudents(s.data); setRecords(a.data);
        const init: Record<string, string> = {};
        s.data.forEach((st: any) => { init[st._id] = 'present'; });
        (a.data as any[]).filter((r: any) => r.date?.slice(0,10) === date).forEach((r: any) => { if (r.student?._id) init[r.student._id] = r.status; });
        setAttendance(init);
      }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  const markAll = (status: string) => { const n: Record<string,string> = {}; students.forEach(s => { n[s._id] = status; }); setAttendance(n); };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await api.post('/attendance/bulk', { records: students.map(s => ({ studentId: s._id, classId: selectedClass, date, status: attendance[s._id] || 'absent' })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]">
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
        </div>
        <div className="flex gap-2">
          {(['mark','view'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {m === 'mark' ? 'Mark Attendance' : 'View Records'}
            </button>
          ))}
        </div>
        {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
      </div>

      {!selectedClass ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">Select a class to continue</div>
      ) : loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : mode === 'mark' ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-bold text-gray-900">Mark Attendance — {date}</h3>
            <div className="flex gap-2 flex-wrap">
              {['present','absent','late'].map(s => <button key={s} onClick={() => markAll(s)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 capitalize">All {s}</button>)}
              <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {students.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No students in this class</div>
              : students.map(s => (
              <div key={s._id} className="px-5 py-3 flex items-center justify-between">
                <div><div className="font-medium text-sm text-gray-900">{s.user?.name}</div><div className="text-xs text-gray-400">Roll {s.rollNumber}</div></div>
                <div className="flex gap-2">
                  {['present','absent','late'].map(st => (
                    <button key={st} onClick={() => setAttendance(p => ({...p, [s._id]: st}))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${attendance[s._id] === st ? (st === 'present' ? 'bg-green-500 text-white' : st === 'absent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{st}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {records.length === 0 ? <div className="py-12 text-center text-gray-400">No records found</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Student','Date','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.student?.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge label={r.status} variant={statusVariant[r.status] || 'gray'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const StudentAttendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');

  useEffect(() => {
    api.get('/students').then(async r => {
      const me = r.data.find((s: any) => s.user?._id === user._id || s.user === user._id);
      if (me) { const a = await api.get(`/attendance?studentId=${me._id}`); setRecords(a.data); }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const pct = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100"><div className="text-xs text-green-600 font-semibold mb-1">Present</div><div className="text-2xl font-bold text-green-700">{present}</div></div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100"><div className="text-xs text-red-600 font-semibold mb-1">Absent</div><div className="text-2xl font-bold text-red-700">{absent}</div></div>
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100"><div className="text-xs text-indigo-600 font-semibold mb-1">Attendance %</div><div className="text-2xl font-bold text-indigo-700">{pct}%</div></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {records.length === 0 ? <div className="py-16 text-center text-gray-400">No attendance records found</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Date','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge label={r.status} variant={statusVariant[r.status] || 'gray'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const AttendanceSection = ({ role }: { role: string }) => {
  if (role === 'student' || role === 'parent') return <StudentAttendance />;
  return <AdminAttendance />;
};
export default AttendanceSection;
