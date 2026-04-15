import React, { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'attendance' | 'grades' | 'timetable' | 'leaves' | 'notices' | 'resources' | 'payslips' | 'students';

interface Student {
  id: number;
  name: string;
  avatar: string;
  roll: number;
  class: string;
  attendance: number;
  grade: number;
  status: 'good' | 'average' | 'attention';
}

interface Notice {
  id: number;
  title: string;
  body: string;
  recipients: string;
  date: string;
  type: 'notice' | 'notification';
}

interface LeaveRequest {
  id: number;
  from: string;
  to: string;
  type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  substitute?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const STUDENTS: Student[] = [
  { id: 1, name: 'Arjun Kumar', avatar: 'AK', roll: 1, class: '10-A', attendance: 94, grade: 82, status: 'good' },
  { id: 2, name: 'Priya Sharma', avatar: 'PS', roll: 2, class: '10-A', attendance: 78, grade: 53, status: 'average' },
  { id: 3, name: 'Rohan Verma', avatar: 'RV', roll: 3, class: '10-A', attendance: 62, grade: 23, status: 'attention' },
  { id: 4, name: 'Meera Nair', avatar: 'MN', roll: 4, class: '10-A', attendance: 98, grade: 91, status: 'good' },
  { id: 5, name: 'Siddharth K', avatar: 'SK', roll: 5, class: '10-A', attendance: 85, grade: 67, status: 'average' },
  { id: 6, name: 'Ananya Rao', avatar: 'AR', roll: 6, class: '10-A', attendance: 91, grade: 88, status: 'good' },
  { id: 7, name: 'Vivek Singh', avatar: 'VS', roll: 7, class: '10-A', attendance: 55, grade: 35, status: 'attention' },
  { id: 8, name: 'Kavya Menon', avatar: 'KM', roll: 8, class: '10-A', attendance: 96, grade: 79, status: 'good' },
];

const TIMETABLE = [
  { day: 'Mon', slots: ['10-A Math', 'Free', '9-B Math', 'Free', '11-A Math', 'Free'] },
  { day: 'Tue', slots: ['9-B Math', '10-A Math', 'Free', '8-C Math', 'Free', 'Staff Mtg'] },
  { day: 'Wed', slots: ['Free', '10-A Math', '9-B Math', 'Free', '11-A Math', '8-C Math'] },
  { day: 'Thu', slots: ['8-C Math', 'Free', '10-A Math', '9-B Math', 'Free', 'Free'] },
  { day: 'Fri', slots: ['11-A Math', '10-A Math', 'Free', 'Free', '9-B Math', 'Free'] },
];

const TIME_SLOTS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00'];

const HOLIDAYS = [
  { date: 'Apr 14', name: 'Dr. Ambedkar Jayanti', type: 'national' },
  { date: 'Apr 21', name: 'Ram Navami', type: 'festival' },
  { date: 'May 1', name: 'Labour Day', type: 'national' },
  { date: 'May 23', name: 'Buddha Purnima', type: 'festival' },
  { date: 'Jun 6', name: 'Eid ul-Adha', type: 'festival' },
  { date: 'Aug 15', name: 'Independence Day', type: 'national' },
  { date: 'Oct 2', name: 'Gandhi Jayanti', type: 'national' },
  { date: 'Oct 2', name: 'Dussehra', type: 'festival' },
  { date: 'Nov 1', name: 'Diwali', type: 'festival' },
  { date: 'Dec 25', name: 'Christmas', type: 'festival' },
];

const PAYSLIPS = [
  { month: 'March 2026', gross: '₹65,000', net: '₹58,200', status: 'paid', file: 'payslip_mar26.pdf' },
  { month: 'February 2026', gross: '₹65,000', net: '₹58,200', status: 'paid', file: 'payslip_feb26.pdf' },
  { month: 'January 2026', gross: '₹65,000', net: '₹57,800', status: 'paid', file: 'payslip_jan26.pdf' },
  { month: 'December 2025', gross: '₹65,000', net: '₹58,200', status: 'paid', file: 'payslip_dec25.pdf' },
];

const RESOURCES = [
  { id: 1, name: 'Chapter 5 - Quadratic Equations.pdf', size: '2.4 MB', type: 'pdf', class: '10-A', visibleToParents: true, date: 'Apr 12' },
  { id: 2, name: 'Practice Problems - Algebra.xlsx', size: '1.1 MB', type: 'excel', class: '9-B', visibleToParents: false, date: 'Apr 10' },
  { id: 3, name: 'Mid-term Syllabus.pdf', size: '0.8 MB', type: 'pdf', class: 'All Classes', visibleToParents: true, date: 'Apr 8' },
  { id: 4, name: 'Formula Sheet.pdf', size: '0.5 MB', type: 'pdf', class: '11-A', visibleToParents: false, date: 'Apr 5' },
];

const GROUPS = ['10-A Students', '9-B Students', '8-C Students', '11-A Students', '10-A Parents', 'All Students', 'All Parents', 'Class Teachers'];

// ══════════════════════════════════════════════════════════════════════════
const TeacherDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');

  // Attendance state
  const [selClass, setSelClass] = useState('10-A');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [attSaved, setAttSaved] = useState(false);

  // Grades state
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [gradesSaved, setGradesSaved] = useState(false);
  const [examName, setExamName] = useState('Mid-Term Test');

  // Leave state
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [needSub, setNeedSub] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    { id: 1, from: 'Apr 10', to: 'Apr 11', type: 'Sick Leave', reason: 'Fever', status: 'approved', substitute: 'Mr. Sharma' },
    { id: 2, from: 'Apr 20', to: 'Apr 20', type: 'Personal Leave', reason: 'Family function', status: 'pending' },
  ]);

  // Notice state
  const [notices, setNotices] = useState<Notice[]>([
    { id: 1, title: 'Mid-term exam schedule', body: 'Mid-term exams will be held from May 1st. Please prepare accordingly.', recipients: '10-A Students', date: 'Apr 12', type: 'notice' },
    { id: 2, title: 'Assignment submission reminder', body: 'Please submit Chapter 4 assignments by April 16th.', recipients: '9-B Students', date: 'Apr 11', type: 'notification' },
  ]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeGroup, setNoticeGroup] = useState('10-A Students');
  const [noticeType, setNoticeType] = useState<'notice' | 'notification'>('notice');
  const [noticeSent, setNoticeSent] = useState(false);

  // Resource state
  const [resources, setResources] = useState(RESOURCES);
  const [resName, setResName] = useState('');
  const [resClass, setResClass] = useState('10-A');
  const [resParents, setResParents] = useState(false);

  // Reimbursement state
  const [reimbTitle, setReimbTitle] = useState('');
  const [reimbAmount, setReimbAmount] = useState('');
  const [reimbSubmitted, setReimbSubmitted] = useState(false);

  // Theme classes
  const t = {
    bg: dark ? 'bg-gray-950' : 'bg-gray-50',
    card: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    text: dark ? 'text-gray-100' : 'text-gray-900',
    sub: dark ? 'text-gray-400' : 'text-gray-500',
    input: dark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400',
    sidebar: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    hover: dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    border: dark ? 'border-gray-800' : 'border-gray-100',
    section: dark ? 'bg-gray-800' : 'bg-gray-50',
    thead: dark ? 'bg-gray-800' : 'bg-gray-50',
  };

  const isPresent = (id: number) => attendance[id] ?? true;
  const toggleAtt = (id: number) => setAttendance(p => ({ ...p, [id]: !isPresent(id) }));

  const saveAttendance = () => { setAttSaved(true); setTimeout(() => setAttSaved(false), 2000); };
  const saveGrades = () => { setGradesSaved(true); setTimeout(() => setGradesSaved(false), 2000); };

  const submitLeave = () => {
    if (!leaveFrom || !leaveTo || !leaveReason) return;
    const newLeave: LeaveRequest = {
      id: leaveRequests.length + 1,
      from: leaveFrom, to: leaveTo,
      type: leaveType, reason: leaveReason,
      status: 'pending',
      substitute: needSub ? 'Requested' : undefined,
    };
    setLeaveRequests(p => [newLeave, ...p]);
    setLeaveFrom(''); setLeaveTo(''); setLeaveReason(''); setNeedSub(false);
  };

  const sendNotice = () => {
    if (!noticeTitle || !noticeBody) return;
    const n: Notice = {
      id: notices.length + 1,
      title: noticeTitle, body: noticeBody,
      recipients: noticeGroup, date: 'Today',
      type: noticeType,
    };
    setNotices(p => [n, ...p]);
    setNoticeTitle(''); setNoticeBody('');
    setNoticeSent(true); setTimeout(() => setNoticeSent(false), 2000);
  };

  const addResource = () => {
    if (!resName) return;
    setResources(p => [{
      id: p.length + 1, name: resName, size: '—', type: 'pdf',
      class: resClass, visibleToParents: resParents, date: 'Today'
    }, ...p]);
    setResName('');
  };

  const submitReimbursement = () => {
    if (!reimbTitle || !reimbAmount) return;
    setReimbSubmitted(true);
    setTimeout(() => setReimbSubmitted(false), 2000);
    setReimbTitle(''); setReimbAmount('');
  };

  const statusColor = (s: Student['status']) =>
    s === 'good' ? 'bg-green-100 text-green-700' : s === 'average' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';

  const gradeColor = (g: number) =>
    g >= 75 ? 'text-green-600' : g >= 50 ? 'text-yellow-600' : 'text-red-500';

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'students', icon: '👥', label: 'My Students' },
    { id: 'attendance', icon: '📋', label: 'Attendance' },
    { id: 'grades', icon: '📊', label: 'Grades & Marks' },
    { id: 'timetable', icon: '🗓️', label: 'Timetable' },
    { id: 'notices', icon: '📢', label: 'Notices & Alerts' },
    { id: 'resources', icon: '📚', label: 'Resources' },
    { id: 'leaves', icon: '🏖️', label: 'Leave & Payslips' },
  ];

  // ── DASHBOARD TAB ────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: STUDENTS.length, icon: '👥', color: 'bg-blue-50 text-blue-600' },
          { label: 'Doing Well', value: STUDENTS.filter(s => s.status === 'good').length, icon: '✅', color: 'bg-green-50 text-green-600' },
          { label: 'Need Attention', value: STUDENTS.filter(s => s.status === 'attention').length, icon: '⚠️', color: 'bg-red-50 text-red-600' },
          { label: 'Avg Attendance', value: `${Math.round(STUDENTS.reduce((a, s) => a + s.attendance, 0) / STUDENTS.length)}%`, icon: '📅', color: 'bg-purple-50 text-purple-600' },
        ].map((s, i) => (
          <div key={i} className={`border rounded-2xl p-4 shadow-sm ${t.card}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${s.color}`}>{s.icon}</div>
            <div className={`text-2xl font-extrabold ${t.text}`}>{s.value}</div>
            <div className={`text-xs mt-1 ${t.sub}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Today's schedule */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>📅 Today's Schedule</span>
            <span className={`text-xs ${t.sub}`}>Tuesday</span>
          </div>
          <div className="p-4 space-y-2">
            {TIMETABLE[1].slots.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${s === 'Free' ? t.section : s.includes('Staff') ? 'bg-purple-50' : 'bg-blue-50'}`}>
                <span className={`text-xs font-mono w-10 ${t.sub}`}>{TIME_SLOTS[i]}</span>
                <span className={`text-sm font-medium ${s === 'Free' ? t.sub : s.includes('Staff') ? 'text-purple-700' : 'text-blue-700'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notices ticker */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>📢 Recent Notices</span>
          </div>
          <div className="p-4 space-y-3">
            {notices.slice(0, 4).map(n => (
              <div key={n.id} className={`p-3 rounded-xl border-l-4 ${n.type === 'notice' ? 'border-blue-500 bg-blue-50' : 'border-orange-400 bg-orange-50'}`}>
                <div className="text-xs font-bold text-gray-800">{n.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">To: {n.recipients} · {n.date}</div>
              </div>
            ))}
            <button onClick={() => setTab('notices')} className="text-xs text-blue-500 hover:underline w-full text-center mt-1">View all →</button>
          </div>
        </div>

        {/* Holidays */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>🗓️ Upcoming Holidays</span>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {HOLIDAYS.map((h, i) => (
              <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${t.hover}`}>
                <div>
                  <div className={`text-xs font-semibold ${t.text}`}>{h.name}</div>
                  <div className={`text-xs ${t.sub}`}>{h.date}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.type === 'national' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {h.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student overview */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
          <span className={`font-bold text-sm ${t.text}`}>👥 Class Overview — 10-A</span>
          <button onClick={() => setTab('students')} className="text-xs text-blue-500 hover:underline">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={t.thead}>
                <th className={`text-left px-5 py-2.5 text-xs font-semibold ${t.sub}`}>Student</th>
                <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>Attendance</th>
                <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>Grade</th>
                <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.slice(0, 5).map(s => (
                <tr key={s.id} className={`border-t ${t.border} ${t.hover}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">{s.avatar}</div>
                      <span className={`text-sm font-semibold ${t.text}`}>{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.attendance >= 75 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${s.attendance}%` }}></div>
                      </div>
                      <span className={`text-xs font-mono ${t.sub}`}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold font-mono ${gradeColor(s.grade)}`}>{s.grade}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(s.status)}`}>
                      {s.status === 'good' ? '✓ Good' : s.status === 'average' ? '~ Average' : '! Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── STUDENTS TAB ─────────────────────────────────────────────────────────
  const renderStudents = () => (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
      <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
        <span className={`font-bold text-sm ${t.text}`}>👥 All Students — 10-A</span>
        <div className="flex gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${t.input} text-xs`}>
            <span>🔍</span><input placeholder="Search student…" className="bg-transparent outline-none w-28 text-xs" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={t.thead}>
              {['Roll', 'Student', 'Attendance', 'Grade', 'Status', 'Action'].map(h => (
                <th key={h} className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map(s => (
              <tr key={s.id} className={`border-t ${t.border} ${t.hover}`}>
                <td className={`px-4 py-3 text-xs font-mono ${t.sub}`}>{s.roll}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xs font-bold">{s.avatar}</div>
                    <span className={`text-sm font-semibold ${t.text}`}>{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.attendance >= 75 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${s.attendance}%` }}></div>
                    </div>
                    <span className={`text-xs font-mono ${t.sub}`}>{s.attendance}%</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-sm font-bold font-mono ${gradeColor(s.grade)}`}>{s.grade}%</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(s.status)}`}>
                    {s.status === 'good' ? '✓ Good' : s.status === 'average' ? '~ Average' : '! Attention'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-500 hover:underline">View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── ATTENDANCE TAB ────────────────────────────────────────────────────────
  const renderAttendance = () => (
    <div className="space-y-4">
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <span className={`font-bold text-sm ${t.text}`}>📋 Mark Attendance</span>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={selClass} onChange={e => setSelClass(e.target.value)}
              className={`text-xs border rounded-lg px-2 py-1.5 outline-none ${t.input}`}>
              {['10-A', '9-B', '8-C', '11-A'].map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              className={`text-xs border rounded-lg px-2 py-1.5 outline-none ${t.input}`} />
            <button onClick={() => {
              const allPresent: Record<number, boolean> = {};
              STUDENTS.forEach(s => allPresent[s.id] = true);
              setAttendance(allPresent);
            }} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 transition-all">
              Mark All Present
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-extrabold text-green-600">
                {STUDENTS.filter(s => isPresent(s.id)).length}
              </div>
              <div className="text-xs text-green-600 font-semibold">Present</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-extrabold text-red-500">
                {STUDENTS.filter(s => !isPresent(s.id)).length}
              </div>
              <div className="text-xs text-red-500 font-semibold">Absent</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STUDENTS.map(s => (
              <div key={s.id} onClick={() => toggleAtt(s.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isPresent(s.id) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">{s.avatar}</div>
                  <div>
                    <div className={`text-sm font-semibold ${t.text}`}>{s.name}</div>
                    <div className={`text-xs ${t.sub}`}>Roll {s.roll}</div>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isPresent(s.id) ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500 border-2 border-red-300'}`}>
                  {isPresent(s.id) ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveAttendance}
            className={`w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all ${attSaved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {attSaved ? '✓ Attendance Saved!' : 'Submit Attendance'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── GRADES TAB ────────────────────────────────────────────────────────────
  const renderGrades = () => (
    <div className="space-y-4">
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <span className={`font-bold text-sm ${t.text}`}>📊 Enter Marks</span>
          <div className="flex gap-2 flex-wrap">
            <input value={examName} onChange={e => setExamName(e.target.value)}
              placeholder="Exam name"
              className={`text-xs border rounded-lg px-2 py-1.5 outline-none w-40 ${t.input}`} />
            <select className={`text-xs border rounded-lg px-2 py-1.5 outline-none ${t.input}`}>
              {['10-A', '9-B', '8-C', '11-A'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select className={`text-xs border rounded-lg px-2 py-1.5 outline-none ${t.input}`}>
              {['Mathematics', 'Science', 'English', 'Hindi'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {STUDENTS.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${t.section}`}>
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{s.avatar}</div>
                <span className={`text-sm font-semibold flex-1 ${t.text}`}>{s.name}</span>
                <span className={`text-xs ${t.sub} w-8`}>/{100}</span>
                <input
                  type="number" min={0} max={100}
                  placeholder={String(s.grade)}
                  value={grades[s.id] || ''}
                  onChange={e => setGrades(p => ({ ...p, [s.id]: e.target.value }))}
                  className={`w-20 text-sm border rounded-xl px-3 py-1.5 outline-none text-center font-mono font-bold focus:border-blue-500 ${t.input}`}
                />
                {grades[s.id] && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(grades[s.id]) >= 75 ? 'bg-green-100 text-green-600' : Number(grades[s.id]) >= 50 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-500'}`}>
                    {Number(grades[s.id]) >= 75 ? 'A' : Number(grades[s.id]) >= 50 ? 'B' : 'C'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button onClick={saveGrades}
            className={`w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all ${gradesSaved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {gradesSaved ? '✓ Grades Saved!' : 'Save Grades'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── TIMETABLE TAB ─────────────────────────────────────────────────────────
  const renderTimetable = () => (
    <div className="space-y-4">
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between`}>
          <span className={`font-bold text-sm ${t.text}`}>🗓️ Weekly Timetable</span>
          <span className={`text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold`}>Read Only — Request substitution via Leave</span>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={`text-left px-3 py-2 text-xs font-semibold ${t.sub} w-16`}>Time</th>
                {TIMETABLE.map(d => (
                  <th key={d.day} className={`text-center px-3 py-2 text-xs font-semibold ${t.sub}`}>{d.day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((time, i) => (
                <tr key={time} className={`border-t ${t.border}`}>
                  <td className={`px-3 py-3 text-xs font-mono ${t.sub}`}>{time}</td>
                  {TIMETABLE.map(d => (
                    <td key={d.day} className="px-2 py-2">
                      <div className={`text-center text-xs py-2 px-1 rounded-xl font-medium
                        ${d.slots[i] === 'Free' ? `${t.section} ${t.sub}` :
                          d.slots[i].includes('Staff') ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'}`}>
                        {d.slots[i]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── NOTICES TAB ───────────────────────────────────────────────────────────
  const renderNotices = () => (
    <div className="grid grid-cols-2 gap-4">
      {/* Send notice */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>📢 Send Notice / Alert</span>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Type</label>
              <select value={noticeType} onChange={e => setNoticeType(e.target.value as any)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`}>
                <option value="notice">📋 Notice</option>
                <option value="notification">🔔 Notification</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Send To</label>
              <select value={noticeGroup} onChange={e => setNoticeGroup(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`}>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Title</label>
            <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)}
              placeholder="Notice title…"
              className={`w-full text-sm border rounded-xl px-3 py-2 outline-none ${t.input}`} />
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Message</label>
            <textarea rows={4} value={noticeBody} onChange={e => setNoticeBody(e.target.value)}
              placeholder="Write your message here…"
              className={`w-full text-sm border rounded-xl px-3 py-2 outline-none resize-none ${t.input}`} />
          </div>
          <button onClick={sendNotice}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${noticeSent ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {noticeSent ? '✓ Sent!' : 'Send Notice →'}
          </button>
        </div>
      </div>

      {/* Notice history */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>📜 Sent Notices</span>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {notices.map(n => (
            <div key={n.id} className={`p-3 rounded-xl border-l-4 ${n.type === 'notice' ? 'border-blue-500 bg-blue-50' : 'border-orange-400 bg-orange-50'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-gray-800">{n.title}</span>
                <span className="text-xs text-gray-400 font-mono">{n.date}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-1">{n.body}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${n.type === 'notice' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {n.type}
                </span>
                <span className="text-xs text-gray-400">→ {n.recipients}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── RESOURCES TAB ─────────────────────────────────────────────────────────
  const renderResources = () => (
    <div className="space-y-4">
      {/* Upload */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>📤 Upload Resource</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>File name / title</label>
              <input value={resName} onChange={e => setResName(e.target.value)}
                placeholder="e.g. Chapter 5 Notes.pdf"
                className={`w-full text-sm border rounded-xl px-3 py-2 outline-none ${t.input}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Class</label>
              <select value={resClass} onChange={e => setResClass(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`}>
                {['10-A', '9-B', '8-C', '11-A', 'All Classes'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Visible to Parents?</label>
              <div className="flex gap-2 mt-1">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setResParents(v)}
                    className={`flex-1 py-2 text-xs rounded-xl font-semibold transition-all border ${resParents === v ? 'bg-blue-600 text-white border-blue-600' : `${t.input}`}`}>
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`border-2 border-dashed rounded-xl p-6 text-center mb-3 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-3xl mb-2">📁</div>
            <div className={`text-sm font-semibold ${t.text}`}>Click to upload or drag & drop</div>
            <div className={`text-xs mt-1 ${t.sub}`}>PDF, Word, Excel, Images — any format accepted</div>
          </div>
          <button onClick={addResource}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all">
            Upload Resource
          </button>
        </div>
      </div>

      {/* Resource list */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>📚 Uploaded Resources</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className={t.thead}>
              {['File', 'Class', 'Size', 'Parents', 'Date', 'Action'].map(h => (
                <th key={h} className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map(r => (
              <tr key={r.id} className={`border-t ${t.border} ${t.hover}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{r.type === 'pdf' ? '📄' : '📊'}</span>
                    <span className={`text-sm font-medium ${t.text}`}>{r.name}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-xs ${t.sub}`}>{r.class}</td>
                <td className={`px-4 py-3 text-xs font-mono ${t.sub}`}>{r.size}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.visibleToParents ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {r.visibleToParents ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs ${t.sub}`}>{r.date}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── LEAVES & PAYSLIPS TAB ─────────────────────────────────────────────────
  const renderLeaves = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Apply leave */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>🏖️ Apply for Leave</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-xs font-semibold ${t.sub} block mb-1`}>From</label>
                <input type="date" value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)}
                  className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.sub} block mb-1`}>To</label>
                <input type="date" value={leaveTo} onChange={e => setLeaveTo(e.target.value)}
                  className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Leave Type</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none ${t.input}`}>
                {['Sick Leave', 'Casual Leave', 'Emergency Leave', 'Personal Leave', 'Maternity/Paternity'].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Reason</label>
              <textarea rows={3} value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                placeholder="Briefly describe your reason…"
                className={`w-full text-sm border rounded-xl px-3 py-2 outline-none resize-none ${t.input}`} />
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-xl ${t.section}`}>
              <input type="checkbox" id="sub" checked={needSub} onChange={e => setNeedSub(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="sub" className={`text-xs font-medium ${t.text} cursor-pointer`}>Request a substitution teacher</label>
            </div>
            <button onClick={submitLeave}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all">
              Submit Leave Request
            </button>
          </div>
        </div>

        {/* Leave history */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>📋 Leave History</span>
          </div>
          <div className="p-4 space-y-3">
            {leaveRequests.map(l => (
              <div key={l.id} className={`p-3 rounded-xl border ${t.border}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold ${t.text}`}>{l.type}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.status === 'approved' ? 'bg-green-100 text-green-600' : l.status === 'rejected' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600'}`}>
                    {l.status}
                  </span>
                </div>
                <div className={`text-xs ${t.sub}`}>{l.from} → {l.to}</div>
                <div className={`text-xs mt-1 ${t.sub}`}>{l.reason}</div>
                {l.substitute && <div className="text-xs text-blue-500 mt-1">Sub: {l.substitute}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payslips */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>💰 Payslips</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className={t.thead}>
              {['Month', 'Gross', 'Net Pay', 'Status', 'Download'].map(h => (
                <th key={h} className={`text-left px-4 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYSLIPS.map((p, i) => (
              <tr key={i} className={`border-t ${t.border} ${t.hover}`}>
                <td className={`px-4 py-3 text-sm font-semibold ${t.text}`}>{p.month}</td>
                <td className={`px-4 py-3 text-sm ${t.sub}`}>{p.gross}</td>
                <td className={`px-4 py-3 text-sm font-bold text-green-600`}>{p.net}</td>
                <td className="px-4 py-3"><span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">Paid</span></td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                    ⬇️ Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reimbursements */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <span className={`font-bold text-sm ${t.text}`}>🧾 Submit Reimbursement</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-1">
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Description</label>
              <input value={reimbTitle} onChange={e => setReimbTitle(e.target.value)}
                placeholder="e.g. Travel to seminar"
                className={`w-full text-sm border rounded-xl px-3 py-2 outline-none ${t.input}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Amount (₹)</label>
              <input type="number" value={reimbAmount} onChange={e => setReimbAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full text-sm border rounded-xl px-3 py-2 outline-none ${t.input}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1`}>Upload Receipt</label>
              <div className={`border-2 border-dashed rounded-xl px-3 py-2 text-center text-xs ${dark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'} cursor-pointer`}>
                📎 Click to attach
              </div>
            </div>
          </div>
          <button onClick={submitReimbursement}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${reimbSubmitted ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {reimbSubmitted ? '✓ Submitted!' : 'Submit Reimbursement'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return renderDashboard();
      case 'students': return renderStudents();
      case 'attendance': return renderAttendance();
      case 'grades': return renderGrades();
      case 'timetable': return renderTimetable();
      case 'notices': return renderNotices();
      case 'resources': return renderResources();
      case 'leaves': return renderLeaves();
      default: return renderDashboard();
    }
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${t.bg}`}>

      {/* SIDEBAR */}
      <aside className={`w-56 border-r flex flex-col h-screen flex-shrink-0 ${t.sidebar}`}>
        <div className={`px-4 py-4 border-b ${t.border} flex items-center gap-2`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🎓</div>
          <div>
            <div className={`font-bold text-sm ${t.text}`}>Instytu</div>
            <div className={`text-xs font-mono ${t.sub}`}>Teacher Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 mx-0.5 rounded-xl text-sm font-medium transition-all
                ${tab === item.id ? 'bg-blue-50 text-blue-600' : `${t.sub} ${t.hover}`}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className={`p-3 border-t ${t.border}`}>
          <div className={`flex items-center gap-2 p-2 rounded-xl ${t.hover} cursor-pointer`}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold truncate ${t.text}`}>{user.name || 'Teacher'}</div>
              <div className={`text-xs ${t.sub}`}>Mathematics</div>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50">Exit</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b px-6 h-14 flex items-center justify-between flex-shrink-0 ${t.sidebar}`}>
          <div>
            <div className={`font-bold text-sm ${t.text}`}>
              {navItems.find(n => n.id === tab)?.icon} {navItems.find(n => n.id === tab)?.label}
            </div>
            <div className={`text-xs font-mono ${t.sub}`}>Instytu / Teacher / {navItems.find(n => n.id === tab)?.label}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)}
              className={`w-8 h-8 border rounded-lg flex items-center justify-center text-sm transition-all ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button className={`w-8 h-8 border rounded-lg flex items-center justify-center text-sm relative ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              🔔<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
