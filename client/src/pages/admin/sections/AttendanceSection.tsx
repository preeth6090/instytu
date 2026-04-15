import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const today = () => new Date().toISOString().slice(0, 10);

const statusVariant: any = { present: 'green', absent: 'red', leave: 'yellow', holiday: 'blue' };

const AttendanceSection = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'mark' | 'view'>('mark');

  useEffect(() => { api.get('/classes').then(r => setClasses(r.data)); }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    Promise.all([
      api.get(`/students?classId=${selectedClass}`),
      api.get(`/attendance?classId=${selectedClass}&date=${date}`),
    ]).then(([s, a]) => {
      setStudents(s.data);
      const init: Record<string, string> = {};
      s.data.forEach((st: any) => { init[st._id] = 'present'; });
      a.data.forEach((r: any) => { init[r.student?._id || r.student] = r.status; });
      setAttendance(init);
      setRecords(a.data);
    }).finally(() => setLoading(false));
  }, [selectedClass, date]);

  const markAll = (status: string) => {
    const all: Record<string, string> = {};
    students.forEach(s => { all[s._id] = status; });
    setAttendance(all);
  };

  const save = async () => {
    if (!selectedClass) return;
    setSaving(true); setSaved(false);
    try {
      const recordsPayload = students.map(s => ({
        studentId: s._id,
        status: attendance[s._id] || 'present',
      }));
      await api.post('/attendance/bulk', { classId: selectedClass, date, records: recordsPayload });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]">
              <option value="">Select class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('mark')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'mark' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Mark</button>
            <button onClick={() => setViewMode('view')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'view' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>View</button>
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : !selectedClass ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">Select a class to view attendance</div>
      ) : viewMode === 'mark' ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-900">{students.length} Students</span>
            <div className="flex gap-2">
              {['present','absent','leave','holiday'].map(s => (
                <button key={s} onClick={() => markAll(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  s === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                  s === 'absent' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                  s === 'leave' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                  'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}>All {s}</button>
              ))}
            </div>
          </div>
          {students.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No students in this class</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map(s => (
                <div key={s._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{s.user?.name}</div>
                    <div className="text-xs text-gray-400">Roll {s.rollNumber}</div>
                  </div>
                  <div className="flex gap-2">
                    {['present','absent','leave','holiday'].map(status => (
                      <button key={status} onClick={() => setAttendance(p => ({...p, [s._id]: status}))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                          attendance[s._id] === status
                            ? status === 'present' ? 'bg-green-500 text-white' :
                              status === 'absent' ? 'bg-red-500 text-white' :
                              status === 'leave' ? 'bg-yellow-500 text-white' :
                              'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
            {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
            <div className="ml-auto">
              <button onClick={save} disabled={saving || students.length === 0}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No attendance records for this date</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Student', 'Roll No.', 'Status', 'Remarks', 'Marked By'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.student?.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.student?.rollNumber || '—'}</td>
                    <td className="px-4 py-3"><Badge label={r.status} variant={statusVariant[r.status] || 'gray'} /></td>
                    <td className="px-4 py-3 text-gray-600">{r.remarks || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.markedBy?.name || '—'}</td>
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

export default AttendanceSection;
