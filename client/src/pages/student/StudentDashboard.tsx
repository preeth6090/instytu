import React, { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'attendance' | 'grades' | 'homework' | 'timetable' | 'notices' | 'leave';

interface Subject { name: string; marks: number; total: number; }
interface AttendanceDay { date: string; status: 'present' | 'absent' | 'leave' | 'holiday'; }
interface Homework { id: number; subject: string; title: string; dueDate: string; status: 'pending' | 'submitted'; }
interface Notice { id: number; title: string; body: string; date: string; type: 'general' | 'exam' | 'event' | 'holiday' | 'fee'; read: boolean; }
interface LeaveApp { id: number; from: string; to: string; type: string; reason: string; status: 'pending' | 'approved' | 'rejected'; appliedOn: string; }
interface Toast { id: number; message: string; type: 'success' | 'error'; }

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science'];
const LEAVE_TYPES = ['Sick Leave', 'Family Function', 'Emergency', 'Medical Appointment', 'Travel', 'Other'];
const TERMS = ['Term 1', 'Term 2', 'Final'];

// ══════════════════════════════════════════════════════════════════════════
const StudentDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');

  // Attendance
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [attMonth, setAttMonth] = useState(new Date().getMonth());
  const [attYear] = useState(new Date().getFullYear());

  // Grades
  const [gradesMap, setGradesMap] = useState<Record<string, Subject[]>>({});
  const [activeTerm, setActiveTerm] = useState('Term 1');

  // Homework
  const [homework, setHomework] = useState<Homework[]>([]);
  const [hwFilter, setHwFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // Timetable — 5 days × 6 periods, all editable
  const [timetable, setTimetable] = useState<string[][]>(DAYS.map(() => Array(PERIODS.length).fill('')));
  const [editCell, setEditCell] = useState<{ d: number; p: number } | null>(null);
  const [editVal, setEditVal] = useState('');

  // Notices
  const [notices, setNotices] = useState<Notice[]>([]);

  // Leave
  const [leaveApps, setLeaveApps] = useState<LeaveApp[]>([]);
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const t = {
    bg: dark ? 'bg-gray-950' : 'bg-slate-50',
    card: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    text: dark ? 'text-gray-100' : 'text-gray-900',
    sub: dark ? 'text-gray-400' : 'text-gray-500',
    input: dark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-teal-500'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500',
    sidebar: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    hover: dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    border: dark ? 'border-gray-800' : 'border-gray-100',
    section: dark ? 'bg-gray-800' : 'bg-gray-50',
    thead: dark ? 'bg-gray-800/60' : 'bg-gray-50',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split('T')[0];
  const todayDayIdx = (() => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d - 1 : 0; })();

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const grades = gradesMap[activeTerm] || [];
  const totalMarks = grades.reduce((s, g) => s + g.marks, 0);
  const totalMax = grades.reduce((s, g) => s + g.total, 0);
  const overallPct = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

  const monthAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === attMonth && d.getFullYear() === attYear;
  });
  const present = monthAttendance.filter(a => a.status === 'present').length;
  const absent = monthAttendance.filter(a => a.status === 'absent').length;
  const onLeave = monthAttendance.filter(a => a.status === 'leave').length;
  const working = present + absent + onLeave;
  const attPct = working > 0 ? Math.round((present / working) * 100) : 0;

  const pendingHW = homework.filter(h => h.status === 'pending');
  const filteredHW = hwFilter === 'all' ? homework : homework.filter(h => h.status === hwFilter);

  const getGrade = (pct: number) => pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : pct >= 35 ? 'C' : 'F';
  const gradeColor = (pct: number) => pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
  const gradeBg = (pct: number) => pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';

  const buildCalendar = () => {
    const firstDay = new Date(attYear, attMonth, 1).getDay();
    const daysInMonth = new Date(attYear, attMonth + 1, 0).getDate();
    const cells: Array<{ day: number; dateStr: string; status?: AttendanceDay['status'] } | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${attYear}-${String(attMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = attendance.find(a => a.date === dateStr);
      cells.push({ day: d, dateStr, status: rec?.status });
    }
    return cells;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleAttendance = (dateStr: string, current?: AttendanceDay['status']) => {
    if (dateStr > todayISO) return;
    const next: AttendanceDay['status'] = !current ? 'present' : current === 'present' ? 'absent' : current === 'absent' ? 'leave' : 'present';
    setAttendance(p => {
      const idx = p.findIndex(a => a.date === dateStr);
      if (idx >= 0) return p.map((a, i) => i === idx ? { ...a, status: next } : a);
      return [...p, { date: dateStr, status: next }];
    });
  };

  const saveGrade = (subject: string, marks: number) => {
    setGradesMap(p => ({
      ...p,
      [activeTerm]: [
        ...(p[activeTerm]?.filter(g => g.name !== subject) || []),
        { name: subject, marks, total: 100 },
      ],
    }));
  };

  const markSubmitted = (id: number) => {
    setHomework(p => p.map(h => h.id === id ? { ...h, status: 'submitted' } : h));
    showToast('Marked as submitted');
  };

  const addHomework = () => {
    showToast('Homework is assigned by your teacher', 'error');
  };

  const saveCell = () => {
    if (!editCell) return;
    setTimetable(p => p.map((row, d) => d === editCell.d ? row.map((c, p) => p === editCell.p ? editVal : c) : row));
    setEditCell(null);
  };

  const applyLeave = () => {
    if (!leaveFrom || !leaveTo || !leaveReason.trim()) { showToast('All fields are required', 'error'); return; }
    if (new Date(leaveTo) < new Date(leaveFrom)) { showToast('End date must be after start date', 'error'); return; }
    const app: LeaveApp = {
      id: Date.now(), from: leaveFrom, to: leaveTo,
      type: leaveType, reason: leaveReason.trim(),
      status: 'pending', appliedOn: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
    setLeaveApps(p => [app, ...p]);
    setLeaveFrom(''); setLeaveTo(''); setLeaveReason('');
    showToast('Leave request submitted');
  };

  const cancelLeave = (id: number) => {
    setLeaveApps(p => p.filter(l => l.id !== id));
    setConfirmCancel(null);
    showToast('Leave cancelled');
  };

  const markNoticeRead = (id: number) => setNotices(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  // ── Empty state ───────────────────────────────────────────────────────────
  const Empty = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <div className="flex flex-col items-center justify-center py-14">
      <div className="text-5xl mb-3 opacity-30">{icon}</div>
      <div className={`text-sm font-bold ${t.text} mb-1`}>{title}</div>
      <div className={`text-xs ${t.sub}`}>{desc}</div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Attendance', value: working > 0 ? `${attPct}%` : '—', icon: '📅', ring: 'bg-teal-100', fg: 'text-teal-600' },
          { label: 'Overall Grade', value: totalMax > 0 ? `${overallPct}%` : '—', icon: '📊', ring: 'bg-blue-100', fg: 'text-blue-600' },
          { label: 'Pending Homework', value: pendingHW.length, icon: '📝', ring: 'bg-amber-100', fg: 'text-amber-600' },
          { label: 'Unread Notices', value: notices.filter(n => !n.read).length, icon: '📢', ring: 'bg-violet-100', fg: 'text-violet-600' },
        ].map((s, i) => (
          <div key={i} className={`border rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${t.card}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${s.ring}`}>{s.icon}</div>
            <div className={`text-2xl font-extrabold tracking-tight ${s.fg}`}>{s.value}</div>
            <div className={`text-xs mt-1 font-medium ${t.sub}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Today's classes */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>Today's Classes</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${t.section} ${t.sub}`}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="p-4 space-y-2">
            {PERIODS.map((period, pi) => {
              const slot = timetable[todayDayIdx]?.[pi] || '';
              return (
                <div key={pi} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${slot ? 'bg-teal-50' : t.section}`}>
                  <span className={`text-xs font-mono w-10 flex-shrink-0 ${t.sub}`}>{period}</span>
                  <span className={`text-xs font-semibold ${slot ? 'text-teal-700' : t.sub}`}>{slot || 'Free'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending homework + recent notices */}
        <div className="space-y-4">
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
              <span className={`font-bold text-sm ${t.text}`}>Pending Homework</span>
              <button onClick={() => setTab('homework')} className="text-xs text-teal-500 font-semibold hover:text-teal-700">View all →</button>
            </div>
            <div className="p-4 space-y-2">
              {pendingHW.length === 0
                ? <div className={`text-xs text-center py-5 ${t.sub}`}>All caught up! ✓</div>
                : pendingHW.slice(0, 3).map(h => (
                  <div key={h.id} className={`flex items-center justify-between p-3 rounded-xl ${t.section}`}>
                    <div>
                      <div className={`text-xs font-semibold ${t.text}`}>{h.title}</div>
                      <div className={`text-xs ${t.sub}`}>{h.subject} · Due {h.dueDate}</div>
                    </div>
                    {new Date(h.dueDate) < new Date() && <span className="text-xs text-red-500 font-bold">Overdue</span>}
                  </div>
                ))}
            </div>
          </div>

          <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
              <span className={`font-bold text-sm ${t.text}`}>Latest Notices</span>
              <button onClick={() => setTab('notices')} className="text-xs text-teal-500 font-semibold hover:text-teal-700">View all →</button>
            </div>
            <div className="p-4 space-y-2">
              {notices.length === 0
                ? <div className={`text-xs text-center py-5 ${t.sub}`}>No notices yet</div>
                : notices.slice(0, 3).map(n => (
                  <div key={n.id} onClick={() => markNoticeRead(n.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all hover:opacity-90 border-l-4 ${
                      n.type === 'exam' ? 'border-violet-400 bg-violet-50' :
                      n.type === 'event' ? 'border-emerald-400 bg-emerald-50' :
                      n.type === 'holiday' ? 'border-amber-400 bg-amber-50' : 'border-teal-400 bg-teal-50'
                    }`}>
                    <div className="flex-1">
                      <div className={`text-xs font-bold ${t.text} truncate`}>{n.title}</div>
                      <div className={`text-xs ${t.sub}`}>{n.date}</div>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0"></span>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  const renderAttendance = () => {
    const calendar = buildCalendar();
    const monthName = new Date(attYear, attMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className={`col-span-2 border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>{monthName}</span>
            <div className="flex gap-2">
              <button onClick={() => setAttMonth(p => p === 0 ? 11 : p - 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${t.input}`}>‹</button>
              <button onClick={() => setAttMonth(p => p === 11 ? 0 : p + 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${t.input}`}>›</button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className={`text-center text-xs font-bold py-1 ${t.sub}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((cell, i) => (
                <button key={i} onClick={() => cell && toggleAttendance(cell.dateStr, cell.status)}
                  disabled={!cell || cell.dateStr > todayISO}
                  className={`aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    !cell ? 'invisible' :
                    cell.status === 'present' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                    cell.status === 'absent' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                    cell.status === 'leave' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                    cell.status === 'holiday' ? 'bg-purple-100 text-purple-600 cursor-default' :
                    cell.dateStr > todayISO ? `${t.section} ${t.sub} opacity-40 cursor-not-allowed` :
                    `${t.section} ${t.sub} hover:bg-teal-50`
                  }`}>
                  {cell?.day}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-4 flex-wrap">
              {[{ label: 'Present', color: 'bg-emerald-400' }, { label: 'Absent', color: 'bg-red-400' }, { label: 'Leave', color: 'bg-blue-400' }, { label: 'Holiday', color: 'bg-purple-400' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${l.color}`}></div>
                  <span className={`text-xs ${t.sub}`}>{l.label}</span>
                </div>
              ))}
            </div>
            <div className={`text-xs mt-3 ${t.sub} italic`}>Click a past date to cycle: Present → Absent → Leave</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`border rounded-2xl p-5 shadow-sm ${t.card}`}>
            <div className={`font-bold text-sm ${t.text} mb-4`}>This Month</div>
            <div className="space-y-2.5">
              {[
                { label: 'Present', value: present, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Absent', value: absent, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
                { label: 'On Leave', value: onLeave, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              ].map(s => (
                <div key={s.label} className={`flex items-center justify-between p-3 rounded-xl border ${s.bg}`}>
                  <span className={`text-xs font-semibold ${t.sub}`}>{s.label}</span>
                  <span className={`text-xl font-extrabold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`border rounded-2xl p-5 shadow-sm ${t.card}`}>
            <div className={`font-bold text-sm ${t.text} mb-2`}>Attendance %</div>
            <div className={`text-4xl font-extrabold ${attPct >= 75 ? 'text-emerald-600' : attPct > 0 ? 'text-red-500' : t.sub}`}>
              {working > 0 ? `${attPct}%` : '—'}
            </div>
            {working > 0 && (
              <>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${attPct >= 75 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${attPct}%` }} />
                </div>
                {attPct < 75 && <div className="text-xs text-red-500 font-semibold mt-2">⚠ Below minimum 75%</div>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── GRADES ────────────────────────────────────────────────────────────────
  const renderGrades = () => (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
      <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
        <span className={`font-bold text-sm ${t.text}`}>My Grades</span>
        <div className="flex gap-1">
          {TERMS.map(term => (
            <button key={term} onClick={() => setActiveTerm(term)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${activeTerm === term ? 'bg-teal-600 text-white' : `${t.section} ${t.sub}`}`}>
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-3">
        {SUBJECTS.map(subject => {
          const g = grades.find(g => g.name === subject);
          const pct = g ? Math.round((g.marks / g.total) * 100) : null;
          return (
            <div key={subject} className={`flex items-center gap-4 p-3.5 rounded-2xl ${t.section} group hover:opacity-90 transition-opacity`}>
              <span className={`text-sm font-semibold flex-1 ${t.text}`}>{subject}</span>
              {pct !== null ? (
                <>
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-sm font-bold font-mono w-12 text-right ${gradeColor(pct)}`}>{g!.marks}/{g!.total}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-10 text-center ${gradeBg(pct)}`}>{getGrade(pct)}</span>
                </>
              ) : (
                <>
                  <input type="number" min={0} max={100} placeholder="—"
                    onBlur={e => { if (e.target.value) { saveGrade(subject, Number(e.target.value)); e.target.value = ''; } }}
                    className={`w-20 text-sm border-2 rounded-xl px-3 py-1.5 outline-none text-center font-mono font-bold transition-colors ${t.input}`} />
                  <span className={`text-xs ${t.sub} w-24`}>Enter marks /100</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {grades.length > 0 && (
        <div className={`px-5 py-4 border-t ${t.border} flex items-center justify-between`}>
          <span className={`text-sm font-bold ${t.text}`}>Overall</span>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-extrabold font-mono ${gradeColor(overallPct)}`}>{totalMarks}/{totalMax}</span>
            <span className={`text-sm font-extrabold ${gradeColor(overallPct)}`}>{overallPct}%</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${gradeBg(overallPct)}`}>{getGrade(overallPct)}</span>
            <button onClick={() => window.print()}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${t.input}`}>
              🖨 Print
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── HOMEWORK ──────────────────────────────────────────────────────────────
  const renderHomework = () => (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
      <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
        <span className={`font-bold text-sm ${t.text}`}>Homework & Assignments</span>
        <div className="flex gap-1">
          {(['all', 'pending', 'submitted'] as const).map(f => (
            <button key={f} onClick={() => setHwFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${hwFilter === f ? 'bg-teal-600 text-white' : `${t.section} ${t.sub}`}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredHW.length === 0 ? (
          <Empty icon="📝" title={hwFilter === 'pending' ? 'No pending homework' : hwFilter === 'submitted' ? 'Nothing submitted yet' : 'No homework assigned yet'}
            desc="Assignments from your teachers will appear here" />
        ) : filteredHW.map(h => {
          const overdue = h.status === 'pending' && new Date(h.dueDate) < new Date();
          return (
            <div key={h.id} className={`flex items-center gap-4 p-4 rounded-2xl border-l-4 transition-all ${
              h.status === 'submitted' ? `border-emerald-400 ${t.section}` :
              overdue ? 'border-red-400 bg-red-50' : `border-teal-400 ${t.section}`
            }`}>
              <div className="flex-1">
                <div className={`text-sm font-bold ${t.text}`}>{h.title}</div>
                <div className={`text-xs mt-0.5 ${t.sub}`}>{h.subject}</div>
                <div className={`text-xs mt-1 font-semibold ${overdue ? 'text-red-500' : t.sub}`}>
                  {overdue ? '⚠ Overdue · ' : ''}Due: {h.dueDate}
                </div>
              </div>
              {h.status === 'pending' ? (
                <button onClick={() => markSubmitted(h.id)}
                  className="text-xs bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-4 py-2 rounded-xl font-bold transition-all">
                  Mark Submitted
                </button>
              ) : (
                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-full">✓ Submitted</span>
              )}
            </div>
          );
        })}
      </div>

      <div className={`px-5 py-3 border-t ${t.border}`}>
        <button onClick={addHomework} className={`text-xs ${t.sub} hover:text-teal-500 transition-colors`}>
          + Homework is assigned by teachers — check back regularly
        </button>
      </div>
    </div>
  );

  // ── TIMETABLE ─────────────────────────────────────────────────────────────
  const renderTimetable = () => (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
      <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
        <span className={`font-bold text-sm ${t.text}`}>My Timetable</span>
        <span className={`text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold`}>Click any cell to edit</span>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className={`text-left px-3 py-2 text-xs font-semibold ${t.sub} w-16`}>Period</th>
              {DAYS.map((day, di) => (
                <th key={day} className={`text-center px-3 py-2.5 text-xs font-bold ${di === todayDayIdx ? 'text-teal-600' : t.sub}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    {day}
                    {di === todayDayIdx && <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pi) => (
              <tr key={period} className={`border-t ${t.border}`}>
                <td className={`px-3 py-2 text-xs font-mono ${t.sub}`}>{period}</td>
                {DAYS.map((_, di) => {
                  const val = timetable[di][pi];
                  const isEditing = editCell?.d === di && editCell?.p === pi;
                  return (
                    <td key={di} className={`px-2 py-2 ${di === todayDayIdx ? 'bg-teal-50/40' : ''}`}>
                      {isEditing ? (
                        <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                          onBlur={saveCell}
                          onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditCell(null); }}
                          placeholder="Subject…"
                          className={`w-full text-center text-xs rounded-xl px-2 py-2 border-2 border-teal-500 outline-none ${t.input}`} />
                      ) : (
                        <button onClick={() => { setEditCell({ d: di, p: pi }); setEditVal(val); }}
                          className={`w-full text-center text-xs py-2.5 px-1 rounded-xl font-medium transition-all hover:opacity-80 active:scale-95 ${
                            !val ? `${t.section} ${t.sub} hover:bg-teal-50` : 'bg-teal-100 text-teal-700'
                          }`}>
                          {val || '+ Add'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── NOTICES ───────────────────────────────────────────────────────────────
  const renderNotices = () => (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
      <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
        <span className={`font-bold text-sm ${t.text}`}>Notice Board</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${t.section} ${t.sub}`}>{notices.filter(n => !n.read).length} unread</span>
      </div>
      <div className="p-4 space-y-3">
        {notices.length === 0 ? (
          <Empty icon="📢" title="No notices yet" desc="School announcements will appear here" />
        ) : notices.map(n => (
          <div key={n.id} onClick={() => markNoticeRead(n.id)}
            className={`p-4 rounded-2xl border-l-4 cursor-pointer transition-all hover:shadow-sm ${
              n.type === 'exam' ? 'border-violet-400 bg-violet-50' :
              n.type === 'event' ? 'border-emerald-400 bg-emerald-50' :
              n.type === 'holiday' ? 'border-amber-400 bg-amber-50' :
              n.type === 'fee' ? 'border-red-400 bg-red-50' : 'border-teal-400 bg-teal-50'
            }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                    n.type === 'exam' ? 'bg-violet-100 text-violet-700' :
                    n.type === 'event' ? 'bg-emerald-100 text-emerald-700' :
                    n.type === 'holiday' ? 'bg-amber-100 text-amber-700' :
                    n.type === 'fee' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'
                  }`}>{n.type}</span>
                </div>
                <div className={`text-sm font-bold ${t.text}`}>{n.title}</div>
                <p className={`text-xs mt-1 leading-relaxed ${t.sub}`}>{n.body}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-xs font-mono ${t.sub}`}>{n.date}</span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── LEAVE ─────────────────────────────────────────────────────────────────
  const renderLeave = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3.5 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>Apply for Leave</span>
        </div>
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>From *</label>
              <input type="date" value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>To *</label>
              <input type="date" value={leaveTo} onChange={e => setLeaveTo(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>Type</label>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
              className={`w-full text-xs border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`}>
              {LEAVE_TYPES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>Reason *</label>
            <textarea rows={4} value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
              placeholder="Briefly describe your reason…"
              className={`w-full text-sm border rounded-xl px-3 py-2 outline-none resize-none transition-colors ${t.input}`} />
          </div>
          <div className={`p-3 rounded-xl text-xs ${t.section} ${t.sub}`}>
            ℹ Requires approval from your class teacher or principal.
          </div>
          <button onClick={applyLeave}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold transition-all">
            Submit Leave Request
          </button>
        </div>
      </div>

      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3.5 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>Leave History ({leaveApps.length})</span>
        </div>
        <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
          {leaveApps.length === 0 ? (
            <Empty icon="📅" title="No leave requests" desc="Your submitted leave requests will appear here" />
          ) : leaveApps.map(l => (
            <div key={l.id} className={`p-4 rounded-2xl border ${t.border} group hover:shadow-sm transition-all`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-sm font-bold ${t.text}`}>{l.type}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    l.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                  }`}>{l.status}</span>
                  {l.status === 'pending' && (
                    confirmCancel === l.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => cancelLeave(l.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg font-semibold">Cancel</button>
                        <button onClick={() => setConfirmCancel(null)} className={`text-xs px-2 py-0.5 rounded-lg ${t.sub}`}>×</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmCancel(l.id)} className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                    )
                  )}
                </div>
              </div>
              <div className={`text-xs ${t.sub}`}>{l.from} → {l.to}</div>
              <div className={`text-xs mt-1 ${t.sub}`}>{l.reason}</div>
              <div className={`text-xs mt-1 opacity-60 ${t.sub}`}>Applied: {l.appliedOn}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return renderDashboard();
      case 'attendance': return renderAttendance();
      case 'grades': return renderGrades();
      case 'homework': return renderHomework();
      case 'timetable': return renderTimetable();
      case 'notices': return renderNotices();
      case 'leave': return renderLeave();
      default: return renderDashboard();
    }
  };

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    { id: 'attendance', icon: '📅', label: 'Attendance' },
    { id: 'grades', icon: '📊', label: 'Grades' },
    { id: 'homework', icon: '📝', label: 'Homework' },
    { id: 'timetable', icon: '🗓', label: 'Timetable' },
    { id: 'notices', icon: '📢', label: 'Notices' },
    { id: 'leave', icon: '🏖', label: 'Leave' },
  ];

  const getAvatar = (name: string) => name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'S';

  return (
    <div className={`flex h-screen transition-colors duration-300 ${t.bg}`}>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
            {toast.type === 'success' ? '✓ ' : '⚠ '}{toast.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className={`w-52 border-r flex flex-col h-screen flex-shrink-0 ${t.sidebar}`}>
        <div className={`px-4 py-4 border-b ${t.border} flex items-center gap-2.5`}>
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-base shadow-sm">🎒</div>
          <div>
            <div className={`font-extrabold text-sm tracking-tight ${t.text}`}>Instytu</div>
            <div className={`text-xs ${t.sub}`}>Student Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all duration-150
                ${tab === item.id ? 'bg-teal-50 text-teal-600 font-semibold shadow-sm' : `${t.sub} ${t.hover} hover:translate-x-0.5`}`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {tab === item.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500"></span>}
            </button>
          ))}
        </nav>

        <div className={`p-3 border-t ${t.border}`}>
          <div className={`flex items-center gap-2 p-2.5 rounded-xl cursor-default group ${t.hover}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {getAvatar(user.name || 'Student')}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold truncate ${t.text}`}>{user.name || 'Student'}</div>
              <div className={`text-xs ${t.sub}`}>Student</div>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b px-6 h-14 flex items-center justify-between flex-shrink-0 ${t.sidebar}`}>
          <div>
            <div className={`font-bold text-sm ${t.text}`}>{navItems.find(n => n.id === tab)?.label}</div>
            <div className={`text-xs ${t.sub}`}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <button onClick={() => setDark(!dark)}
            className={`w-8 h-8 border rounded-xl flex items-center justify-center text-sm transition-all hover:shadow-sm active:scale-95 ${dark ? 'bg-gray-800 border-gray-700 text-yellow-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
            {dark ? '☀️' : '🌙'}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-5">{renderContent()}</main>
      </div>
    </div>
  );
};

export default StudentDashboard;
