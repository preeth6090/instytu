import React, { useState, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'attendance' | 'grades' | 'homework' | 'fees' | 'leave' | 'timetable' | 'notices' | 'messages' | 'ptm' | 'bus';

interface Child {
  id: number;
  name: string;
  class: string;
  roll: number;
  school: string;
  dob: string;
  busRoute: string;
}

interface AttendanceDay {
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
}

interface Subject {
  name: string;
  marks: number;
  total: number;
}

interface FeeItem {
  id: number;
  childId: number;
  title: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  receiptId?: string;
}

interface Homework {
  id: number;
  childId: number;
  subject: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted';
}

interface LeaveApp {
  id: number;
  childId: number;
  from: string;
  to: string;
  type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  appliedOn: string;
}

interface Notice {
  id: number;
  title: string;
  body: string;
  date: string;
  type: 'general' | 'exam' | 'fee' | 'event' | 'holiday';
  priority: 'high' | 'normal';
  read: boolean;
}

interface Message {
  id: number;
  childId: number;
  body: string;
  time: string;
  fromParent: boolean;
  senderName: string;
}

interface PTMSlot {
  id: number;
  date: string;
  time: string;
  teacher: string;
  subject: string;
  available: boolean;
  bookedByChildId?: number;
}

interface AppNotification {
  id: number;
  type: 'attendance' | 'fee' | 'grade' | 'notice' | 'leave' | 'message' | 'ptm' | 'bus' | 'homework' | 'exam';
  title: string;
  body: string;
  time: string;
  read: boolean;
  childId?: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ── Constants ──────────────────────────────────────────────────────────────
const BUS_STOPS = ['City Centre', 'MG Road', 'Koramangala', 'HSR Layout', 'Silk Board', 'School'];
const LEAVE_TYPES = ['Sick Leave', 'Family Function', 'Emergency', 'Medical Appointment', 'Travel', 'Other'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science'];
const CLASS_OPTIONS = ['8-A', '9-A', '9-B', '10-A', '10-B', '11-A', '11-B', '12-A'];
const NOTICE_TYPES = ['all', 'general', 'exam', 'fee', 'event', 'holiday'] as const;

const INITIAL_PTM_SLOTS: PTMSlot[] = [
  { id: 1, date: 'Apr 22', time: '10:00 AM', teacher: 'Mrs. Radha Krishnan', subject: 'Mathematics', available: true },
  { id: 2, date: 'Apr 22', time: '11:00 AM', teacher: 'Mr. Suresh Kumar', subject: 'Science', available: true },
  { id: 3, date: 'Apr 22', time: '12:00 PM', teacher: 'Mrs. Anitha Rao', subject: 'English', available: true },
  { id: 4, date: 'Apr 23', time: '10:00 AM', teacher: 'Mrs. Radha Krishnan', subject: 'Mathematics', available: true },
  { id: 5, date: 'Apr 23', time: '11:00 AM', teacher: 'Mr. Suresh Kumar', subject: 'Science', available: true },
  { id: 6, date: 'Apr 23', time: '2:00 PM', teacher: 'Mrs. Anitha Rao', subject: 'English', available: true },
];

// ── Razorpay loader ────────────────────────────────────────────────────────
const loadRazorpay = (): Promise<boolean> =>
  new Promise(resolve => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ══════════════════════════════════════════════════════════════════════════
const ParentDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const printRef = useRef<HTMLDivElement>(null);

  // ── Children ─────────────────────────────────────────────────────────────
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', class: '10-A', roll: '', school: '', dob: '', busRoute: '' });
  const [confirmDeleteChild, setConfirmDeleteChild] = useState<number | null>(null);
  const activeChild = children.find(c => c.id === activeChildId) || null;

  // ── Attendance ────────────────────────────────────────────────────────────
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [attMonth, setAttMonth] = useState(new Date().getMonth());
  const [attYear] = useState(new Date().getFullYear());

  // ── Grades ────────────────────────────────────────────────────────────────
  const [gradesMap, setGradesMap] = useState<Record<number, Record<string, Subject[]>>>({});
  const [activeTerm, setActiveTerm] = useState('Term 1');

  // ── Homework ──────────────────────────────────────────────────────────────
  const [homework, setHomework] = useState<Homework[]>([]);
  const [hwFilter, setHwFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // ── Fees ─────────────────────────────────────────────────────────────────
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [payingFeeId, setPayingFeeId] = useState<number | null>(null);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const [leaveApps, setLeaveApps] = useState<LeaveApp[]>([]);
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [confirmCancelLeave, setConfirmCancelLeave] = useState<number | null>(null);

  // ── Notices ───────────────────────────────────────────────────────────────
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeFilter, setNoticeFilter] = useState<typeof NOTICE_TYPES[number]>('all');

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');

  // ── PTM ───────────────────────────────────────────────────────────────────
  const [ptmSlots, setPtmSlots] = useState<PTMSlot[]>(INITIAL_PTM_SLOTS);
  const [confirmCancelPTM, setConfirmCancelPTM] = useState<number | null>(null);

  // ── Bus ───────────────────────────────────────────────────────────────────
  const [busStop, setBusStop] = useState(2);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const unreadCount = appNotifications.filter(n => !n.read).length;

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const t = {
    bg: dark ? 'bg-gray-950' : 'bg-slate-50',
    card: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    text: dark ? 'text-gray-100' : 'text-gray-900',
    sub: dark ? 'text-gray-400' : 'text-gray-500',
    input: dark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500',
    sidebar: dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
    hover: dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    border: dark ? 'border-gray-800' : 'border-gray-100',
    section: dark ? 'bg-gray-800' : 'bg-gray-50',
    thead: dark ? 'bg-gray-800/60' : 'bg-gray-50',
    badge: dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAvatar = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const todayISO = new Date().toISOString().split('T')[0];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const addNotification = (n: Omit<AppNotification, 'id' | 'read' | 'time'>) => {
    setAppNotifications(p => [{
      ...n, id: Date.now(), read: false,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }, ...p]);
  };

  const markAllNotifsRead = () => setAppNotifications(p => p.map(n => ({ ...n, read: true })));

  const getGrade = (pct: number) => pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : pct >= 35 ? 'C' : 'F';
  const gradeColor = (pct: number) => pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
  const gradeBg = (pct: number) => pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';

  const childAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === attMonth && d.getFullYear() === attYear;
  });
  const presentDays = childAttendance.filter(a => a.status === 'present').length;
  const absentDays = childAttendance.filter(a => a.status === 'absent').length;
  const leaveDays = childAttendance.filter(a => a.status === 'leave').length;
  const workingDays = presentDays + absentDays + leaveDays;
  const attPct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  const childGrades = activeChildId ? (gradesMap[activeChildId]?.[activeTerm] || []) : [];
  const totalMarks = childGrades.reduce((s, g) => s + g.marks, 0);
  const totalMax = childGrades.reduce((s, g) => s + g.total, 0);
  const overallPct = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

  const childFees = fees.filter(f => f.childId === activeChildId);
  const pendingFees = childFees.filter(f => f.status !== 'paid');
  const paidFees = childFees.filter(f => f.status === 'paid');
  const totalDue = pendingFees.reduce((s, f) => s + f.amount, 0);

  const childHomework = homework.filter(h => h.childId === activeChildId);
  const childLeave = leaveApps.filter(l => l.childId === activeChildId);
  const childMessages = messages.filter(m => m.childId === activeChildId);
  const myPTMBookings = ptmSlots.filter(s => s.bookedByChildId === activeChildId);
  const filteredNotices = noticeFilter === 'all' ? notices : notices.filter(n => n.type === noticeFilter);
  const filteredHW = hwFilter === 'all' ? childHomework : childHomework.filter(h => h.status === hwFilter);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const addChild = () => {
    if (!newChild.name.trim() || !newChild.roll || !newChild.school.trim()) {
      showToast('Name, roll number and school are required', 'error'); return;
    }
    const child: Child = {
      id: Date.now(), name: newChild.name.trim(), class: newChild.class,
      roll: Number(newChild.roll), school: newChild.school.trim(),
      dob: newChild.dob, busRoute: newChild.busRoute,
    };
    setChildren(p => [...p, child]);
    if (!activeChildId) setActiveChildId(child.id);
    setNewChild({ name: '', class: '10-A', roll: '', school: '', dob: '', busRoute: '' });
    setShowAddChild(false);
    showToast(`${child.name} added`);
    addNotification({ type: 'notice', title: 'Child added', body: `${child.name} linked to your account`, childId: child.id });
  };

  const deleteChild = (id: number) => {
    setChildren(p => p.filter(c => c.id !== id));
    if (activeChildId === id) setActiveChildId(children.find(c => c.id !== id)?.id || null);
    setConfirmDeleteChild(null);
    showToast('Child removed');
  };

  const markAttendance = (date: string, status: AttendanceDay['status']) => {
    setAttendance(p => {
      const existing = p.findIndex(a => a.date === date);
      if (existing >= 0) return p.map((a, i) => i === existing ? { ...a, status } : a);
      return [...p, { date, status }];
    });
  };

  const addGrade = (subject: string, marks: number, total: number) => {
    if (!activeChildId) return;
    setGradesMap(p => ({
      ...p,
      [activeChildId]: {
        ...p[activeChildId],
        [activeTerm]: [
          ...(p[activeChildId]?.[activeTerm]?.filter(g => g.name !== subject) || []),
          { name: subject, marks, total },
        ],
      },
    }));
  };

  const addFee = (title: string, amount: number, dueDate: string) => {
    if (!activeChildId) return;
    const fee: FeeItem = { id: Date.now(), childId: activeChildId, title, amount, dueDate, status: 'pending' };
    setFees(p => [...p, fee]);
    addNotification({ type: 'fee', title: 'New fee added', body: `${title} — ₹${amount.toLocaleString('en-IN')} due ${dueDate}`, childId: activeChildId });
  };

  const handlePayment = async (fee: FeeItem) => {
    setPayingFeeId(fee.id);
    const loaded = await loadRazorpay();
    if (!loaded) { showToast('Payment gateway failed to load', 'error'); setPayingFeeId(null); return; }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_add_your_key_here',
      amount: fee.amount * 100,
      currency: 'INR',
      name: activeChild?.school || 'Instytu School',
      description: fee.title,
      handler: (response: any) => {
        const receiptId = response.razorpay_payment_id || `RCP${Date.now()}`;
        setFees(p => p.map(f => f.id === fee.id ? { ...f, status: 'paid', paidDate: today, receiptId } : f));
        showToast('Payment successful!');
        addNotification({ type: 'fee', title: 'Payment confirmed', body: `₹${fee.amount.toLocaleString('en-IN')} paid for ${fee.title}`, childId: fee.childId });
        setPayingFeeId(null);
      },
      prefill: { name: user.name || '', email: user.email || '' },
      theme: { color: '#3B82F6' },
      modal: { ondismiss: () => { showToast('Payment cancelled', 'error'); setPayingFeeId(null); } },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const addHomework = (subject: string, title: string, dueDate: string) => {
    if (!activeChildId) return;
    setHomework(p => [...p, { id: Date.now(), childId: activeChildId, subject, title, dueDate, status: 'pending' }]);
  };

  const markHomeworkSubmitted = (id: number) => {
    setHomework(p => p.map(h => h.id === id ? { ...h, status: 'submitted' } : h));
    showToast('Marked as submitted');
  };

  const applyLeave = () => {
    if (!activeChildId || !leaveFrom || !leaveTo || !leaveReason.trim()) {
      showToast('All fields are required', 'error'); return;
    }
    if (new Date(leaveTo) < new Date(leaveFrom)) {
      showToast('End date must be after start date', 'error'); return;
    }
    const app: LeaveApp = {
      id: Date.now(), childId: activeChildId, from: leaveFrom, to: leaveTo,
      type: leaveType, reason: leaveReason.trim(), status: 'pending', appliedOn: today,
    };
    setLeaveApps(p => [app, ...p]);
    setLeaveFrom(''); setLeaveTo(''); setLeaveReason('');
    showToast('Leave request submitted');
    addNotification({ type: 'leave', title: 'Leave applied', body: `${leaveType} for ${activeChild?.name} from ${leaveFrom} to ${leaveTo}`, childId: activeChildId });
  };

  const cancelLeave = (id: number) => {
    setLeaveApps(p => p.filter(l => l.id !== id));
    setConfirmCancelLeave(null);
    showToast('Leave request cancelled');
  };

  const sendMessage = () => {
    if (!activeChildId || !msgInput.trim()) return;
    const msg: Message = {
      id: Date.now(), childId: activeChildId, body: msgInput.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      fromParent: true, senderName: user.name || 'Parent',
    };
    setMessages(p => [...p, msg]);
    setMsgInput('');
    showToast('Message sent', 'info');
  };

  const bookPTM = (slotId: number) => {
    if (!activeChildId) return;
    setPtmSlots(p => p.map(s => s.id === slotId ? { ...s, available: false, bookedByChildId: activeChildId } : s));
    const slot = ptmSlots.find(s => s.id === slotId);
    showToast(`PTM booked with ${slot?.teacher}`);
    addNotification({ type: 'ptm', title: 'PTM Booked', body: `Meeting with ${slot?.teacher} on ${slot?.date} at ${slot?.time}`, childId: activeChildId });
  };

  const cancelPTM = (slotId: number) => {
    setPtmSlots(p => p.map(s => s.id === slotId ? { ...s, available: true, bookedByChildId: undefined } : s));
    setConfirmCancelPTM(null);
    showToast('PTM booking cancelled');
  };

  const addNotice = (title: string, body: string, type: Notice['type'], priority: Notice['priority']) => {
    const n: Notice = { id: Date.now(), title, body, date: today, type, priority, read: false };
    setNotices(p => [n, ...p]);
    addNotification({ type: 'notice', title, body, });
  };

  const markNoticeRead = (id: number) => setNotices(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  const printReport = () => window.print();

  // ── Calendar builder ──────────────────────────────────────────────────────
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

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyState = ({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="text-5xl mb-4 opacity-30">{icon}</div>
      <div className={`text-sm font-bold ${t.text} mb-1`}>{title}</div>
      <div className={`text-xs ${t.sub} mb-4 max-w-xs`}>{desc}</div>
      {action}
    </div>
  );

  // ── No child guard ────────────────────────────────────────────────────────
  const NoChildGuard = () => (
    <EmptyState icon="👶" title="No child linked yet" desc="Add your child's details to get started"
      action={<button onClick={() => setShowAddChild(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all active:scale-95">+ Add Child</button>} />
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER: DASHBOARD ─────────────────────────────────────────────────────
  const renderDashboard = () => {
    if (!activeChild) return <NoChildGuard />;
    const pendingHW = childHomework.filter(h => h.status === 'pending').length;
    const pendingLeave = childLeave.filter(l => l.status === 'pending').length;

    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Attendance', value: `${attPct}%`, icon: '📅', bg: 'bg-blue-50', fg: 'text-blue-600', ring: 'bg-blue-100' },
            { label: 'Overall Grade', value: totalMax > 0 ? `${overallPct}%` : '—', icon: '📊', bg: 'bg-emerald-50', fg: 'text-emerald-600', ring: 'bg-emerald-100' },
            { label: 'Fees Due', value: totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : '✓ Clear', icon: '💰', bg: totalDue > 0 ? 'bg-red-50' : 'bg-emerald-50', fg: totalDue > 0 ? 'text-red-600' : 'text-emerald-600', ring: totalDue > 0 ? 'bg-red-100' : 'bg-emerald-100' },
            { label: 'Pending Items', value: pendingHW + pendingLeave, icon: '📋', bg: 'bg-violet-50', fg: 'text-violet-600', ring: 'bg-violet-100' },
          ].map((s, i) => (
            <div key={i} className={`border rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${t.card}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${s.ring}`}>{s.icon}</div>
              <div className={`text-2xl font-extrabold tracking-tight ${s.fg}`}>{s.value}</div>
              <div className={`text-xs mt-1 font-medium ${t.sub}`}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Recent notices */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
              <span className={`font-bold text-sm ${t.text}`}>Recent Notices</span>
              <button onClick={() => setTab('notices')} className="text-xs text-blue-500 font-semibold hover:text-blue-700">View all →</button>
            </div>
            <div className="p-4 space-y-2.5">
              {notices.length === 0 ? <div className={`text-xs text-center py-8 ${t.sub}`}>No notices yet</div>
                : notices.slice(0, 4).map(n => (
                  <div key={n.id} onClick={() => markNoticeRead(n.id)}
                    className={`p-3 rounded-xl border-l-4 cursor-pointer transition-all hover:opacity-90 ${
                      n.type === 'exam' ? 'border-violet-500 bg-violet-50' :
                      n.type === 'fee' ? 'border-red-400 bg-red-50' :
                      n.type === 'event' ? 'border-emerald-500 bg-emerald-50' :
                      n.type === 'holiday' ? 'border-amber-400 bg-amber-50' : 'border-blue-500 bg-blue-50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${t.text}`}>{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2"></span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${t.sub}`}>{n.date}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Pending fees */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
              <span className={`font-bold text-sm ${t.text}`}>Pending Fees</span>
              <button onClick={() => setTab('fees')} className="text-xs text-blue-500 font-semibold hover:text-blue-700">Pay →</button>
            </div>
            <div className="p-4 space-y-2.5">
              {pendingFees.length === 0
                ? <div className={`text-xs text-center py-8 ${t.sub}`}>All fees cleared ✓</div>
                : pendingFees.slice(0, 3).map(f => (
                  <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl ${t.section}`}>
                    <div>
                      <div className={`text-xs font-semibold ${t.text}`}>{f.title}</div>
                      <div className={`text-xs ${t.sub}`}>Due: {f.dueDate}</div>
                    </div>
                    <span className={`text-sm font-bold ${f.status === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>₹{f.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Homework */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
              <span className={`font-bold text-sm ${t.text}`}>Pending Homework</span>
              <button onClick={() => setTab('homework')} className="text-xs text-blue-500 font-semibold hover:text-blue-700">View all →</button>
            </div>
            <div className="p-4 space-y-2.5">
              {childHomework.filter(h => h.status === 'pending').length === 0
                ? <div className={`text-xs text-center py-8 ${t.sub}`}>No pending homework</div>
                : childHomework.filter(h => h.status === 'pending').slice(0, 3).map(h => (
                  <div key={h.id} className={`p-3 rounded-xl ${t.section}`}>
                    <div className={`text-xs font-semibold ${t.text}`}>{h.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${t.sub}`}>{h.subject}</span>
                      <span className={`text-xs font-semibold ${new Date(h.dueDate) < new Date() ? 'text-red-500' : t.sub}`}>Due: {h.dueDate}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Bus status */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>🚌 Live Bus Tracking — {activeChild.name}</span>
            <button onClick={() => setTab('bus')} className="text-xs text-blue-500 font-semibold hover:text-blue-700">Full view →</button>
          </div>
          <div className="p-4 flex items-center gap-3 overflow-x-auto">
            {BUS_STOPS.map((stop, i) => (
              <React.Fragment key={stop}>
                <div className={`flex flex-col items-center gap-1.5 flex-shrink-0`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < busStop ? 'bg-emerald-500 text-white border-emerald-500' :
                    i === busStop ? 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100 scale-110' :
                    `${t.section} ${t.sub} border-gray-200`
                  }`}>{i === busStop ? '🚌' : i < busStop ? '✓' : i + 1}</div>
                  <span className={`text-xs font-medium text-center w-16 ${i === busStop ? 'text-blue-600 font-bold' : t.sub}`}>{stop}</span>
                </div>
                {i < BUS_STOPS.length - 1 && (
                  <div className={`flex-1 h-1 rounded-full min-w-8 ${i < busStop ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: ATTENDANCE ────────────────────────────────────────────────────
  const renderAttendance = () => {
    if (!activeChild) return <NoChildGuard />;
    const calendar = buildCalendar();
    const monthName = new Date(attYear, attMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    return (
      <div className="grid grid-cols-3 gap-4">
        {/* Calendar */}
        <div className={`col-span-2 border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>{monthName}</span>
            <div className="flex gap-2">
              <button onClick={() => setAttMonth(p => p === 0 ? 11 : p - 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${t.input} hover:border-blue-400`}>‹</button>
              <button onClick={() => setAttMonth(p => p === 11 ? 0 : p + 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${t.input} hover:border-blue-400`}>›</button>
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
                <div key={i} className={`aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                  !cell ? '' :
                  cell.status === 'present' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer' :
                  cell.status === 'absent' ? 'bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer' :
                  cell.status === 'leave' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer' :
                  cell.status === 'holiday' ? 'bg-purple-100 text-purple-600' :
                  `${t.section} ${t.sub} hover:bg-blue-50 cursor-pointer`
                }`}
                  onClick={() => cell && cell.dateStr <= todayISO && markAttendance(cell.dateStr,
                    !cell.status ? 'present' : cell.status === 'present' ? 'absent' : cell.status === 'absent' ? 'leave' : 'present'
                  )}>
                  {cell?.day}
                </div>
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
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className={`border rounded-2xl p-5 shadow-sm ${t.card}`}>
            <div className={`font-bold text-sm ${t.text} mb-4`}>Monthly Summary</div>
            <div className="space-y-3">
              {[
                { label: 'Present', value: presentDays, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Absent', value: absentDays, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
                { label: 'On Leave', value: leaveDays, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              ].map(s => (
                <div key={s.label} className={`flex items-center justify-between p-3 rounded-xl border ${s.bg}`}>
                  <span className={`text-xs font-semibold ${t.sub}`}>{s.label}</span>
                  <span className={`text-lg font-extrabold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`border rounded-2xl p-5 shadow-sm ${t.card}`}>
            <div className={`font-bold text-sm ${t.text} mb-2`}>Attendance %</div>
            <div className={`text-4xl font-extrabold ${attPct >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>{attPct}%</div>
            <div className={`text-xs mt-1 ${t.sub}`}>{workingDays} working days this month</div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${attPct >= 75 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${attPct}%` }}></div>
            </div>
            {attPct < 75 && <div className="text-xs text-red-500 font-semibold mt-2">⚠ Below 75% — attendance required</div>}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: GRADES ────────────────────────────────────────────────────────
  const renderGrades = () => {
    if (!activeChild) return <NoChildGuard />;
    const terms = ['Term 1', 'Term 2', 'Final'];

    return (
      <div className="space-y-4">
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
            <span className={`font-bold text-sm ${t.text}`}>Report Card — {activeChild.name}</span>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                {terms.map(term => (
                  <button key={term} onClick={() => setActiveTerm(term)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${activeTerm === term ? 'bg-blue-600 text-white' : `${t.section} ${t.sub} hover:border-blue-300`}`}>
                    {term}
                  </button>
                ))}
              </div>
              <button onClick={printReport}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5">
                🖨 Print Report
              </button>
            </div>
          </div>

          {childGrades.length === 0 ? (
            <div className="p-5">
              <div className={`text-sm font-semibold ${t.text} mb-3`}>Enter marks for {activeTerm}</div>
              <div className="space-y-2">
                {SUBJECTS.map(subject => {
                  const existing = childGrades.find(g => g.name === subject);
                  return (
                    <div key={subject} className={`flex items-center gap-3 p-3 rounded-xl ${t.section}`}>
                      <span className={`text-sm font-semibold flex-1 ${t.text}`}>{subject}</span>
                      <span className={`text-xs ${t.sub}`}>/100</span>
                      <input type="number" min={0} max={100} placeholder="Marks"
                        defaultValue={existing?.marks}
                        onBlur={e => { if (e.target.value) addGrade(subject, Number(e.target.value), 100); }}
                        className={`w-20 text-sm border-2 rounded-xl px-3 py-1.5 outline-none text-center font-mono font-bold transition-colors ${t.input}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div ref={printRef}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={t.thead}>
                      {['Subject', 'Marks Obtained', 'Total Marks', 'Percentage', 'Grade', 'Status'].map(h => (
                        <th key={h} className={`text-left px-5 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {childGrades.map(g => {
                      const pct = Math.round((g.marks / g.total) * 100);
                      return (
                        <tr key={g.name} className={`border-t ${t.border} ${t.hover} transition-colors`}>
                          <td className={`px-5 py-3 text-sm font-semibold ${t.text}`}>{g.name}</td>
                          <td className={`px-5 py-3 text-sm font-bold font-mono ${gradeColor(pct)}`}>{g.marks}</td>
                          <td className={`px-5 py-3 text-sm ${t.sub}`}>{g.total}</td>
                          <td className={`px-5 py-3 text-sm font-bold font-mono ${gradeColor(pct)}`}>{pct}%</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeBg(pct)}`}>{getGrade(pct)}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold ${pct >= 35 ? 'text-emerald-600' : 'text-red-500'}`}>{pct >= 35 ? 'Pass' : 'Fail'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${t.border} ${t.section}`}>
                      <td className={`px-5 py-3 text-sm font-bold ${t.text}`}>Overall</td>
                      <td className={`px-5 py-3 text-sm font-extrabold font-mono ${gradeColor(overallPct)}`}>{totalMarks}</td>
                      <td className={`px-5 py-3 text-sm ${t.sub}`}>{totalMax}</td>
                      <td className={`px-5 py-3 text-sm font-extrabold font-mono ${gradeColor(overallPct)}`}>{overallPct}%</td>
                      <td className="px-5 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeBg(overallPct)}`}>{getGrade(overallPct)}</span></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER: HOMEWORK ──────────────────────────────────────────────────────
  const renderHomework = () => {
    if (!activeChild) return <NoChildGuard />;
    return (
      <div className="space-y-4">
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
            <span className={`font-bold text-sm ${t.text}`}>Homework & Assignments</span>
            <div className="flex gap-1">
              {(['all', 'pending', 'submitted'] as const).map(f => (
                <button key={f} onClick={() => setHwFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${hwFilter === f ? 'bg-blue-600 text-white' : `${t.section} ${t.sub}`}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filteredHW.length === 0 ? (
            <EmptyState icon="📝" title="No homework found" desc="Homework assigned by teachers will appear here" />
          ) : (
            <div className="p-4 space-y-3">
              {filteredHW.map(h => {
                const overdue = h.status === 'pending' && new Date(h.dueDate) < new Date();
                return (
                  <div key={h.id} className={`flex items-center gap-4 p-4 rounded-2xl border-l-4 transition-all group ${
                    h.status === 'submitted' ? `border-emerald-400 ${t.section}` :
                    overdue ? 'border-red-400 bg-red-50' : `border-blue-400 ${t.section}`
                  }`}>
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${t.text}`}>{h.title}</div>
                      <div className={`text-xs mt-0.5 ${t.sub}`}>{h.subject}</div>
                      <div className={`text-xs mt-1 font-semibold ${overdue ? 'text-red-500' : t.sub}`}>
                        {overdue ? '⚠ Overdue — ' : ''}Due: {h.dueDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${h.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : overdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                        {h.status === 'submitted' ? '✓ Submitted' : overdue ? 'Overdue' : 'Pending'}
                      </span>
                      {h.status === 'pending' && (
                        <button onClick={() => markHomeworkSubmitted(h.id)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95">
                          Mark Submitted
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER: FEES ──────────────────────────────────────────────────────────
  const renderFees = () => {
    if (!activeChild) return <NoChildGuard />;
    const [newFeeTitle, setNewFeeTitle] = useState('');
    const [newFeeAmount, setNewFeeAmount] = useState('');
    const [newFeeDue, setNewFeeDue] = useState('');

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Due', value: `₹${totalDue.toLocaleString('en-IN')}`, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
            { label: 'Paid This Year', value: `₹${paidFees.reduce((s, f) => s + f.amount, 0).toLocaleString('en-IN')}`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Overdue', value: childFees.filter(f => f.status === 'overdue').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          ].map(s => (
            <div key={s.label} className={`border rounded-2xl p-4 shadow-sm ${s.bg} hover:shadow-md transition-all`}>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className={`text-xs mt-1 font-medium ${t.sub}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pending fees */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
            <span className={`font-bold text-sm ${t.text}`}>Pending Payments</span>
            <div className="flex gap-2 items-center">
              <input placeholder="Fee title" value={newFeeTitle} onChange={e => setNewFeeTitle(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-1.5 outline-none w-32 transition-colors ${t.input}`} />
              <input type="number" placeholder="₹ Amount" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-1.5 outline-none w-24 transition-colors ${t.input}`} />
              <input type="date" value={newFeeDue} onChange={e => setNewFeeDue(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-colors ${t.input}`} />
              <button onClick={() => { if (newFeeTitle && newFeeAmount && newFeeDue) { addFee(newFeeTitle, Number(newFeeAmount), newFeeDue); setNewFeeTitle(''); setNewFeeAmount(''); setNewFeeDue(''); } else showToast('Fill all fields', 'error'); }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95">+ Add Fee</button>
            </div>
          </div>
          {pendingFees.length === 0 ? (
            <EmptyState icon="✅" title="All fees paid" desc="No pending or overdue fees" />
          ) : (
            <table className="w-full">
              <thead><tr className={t.thead}>
                {['Fee', 'Amount', 'Due Date', 'Status', 'Action'].map(h => (
                  <th key={h} className={`text-left px-5 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pendingFees.map(f => (
                  <tr key={f.id} className={`border-t ${t.border} ${t.hover} transition-colors`}>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${t.text}`}>{f.title}</td>
                    <td className={`px-5 py-3.5 text-sm font-bold ${t.text}`}>₹{f.amount.toLocaleString('en-IN')}</td>
                    <td className={`px-5 py-3.5 text-xs ${f.status === 'overdue' ? 'text-red-500 font-bold' : t.sub}`}>{f.dueDate}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{f.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handlePayment(f)} disabled={payingFeeId === f.id}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 ${payingFeeId === f.id ? 'bg-gray-300 text-gray-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                        {payingFeeId === f.id ? 'Opening…' : '💳 Pay Now'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment history */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>Payment History</span>
          </div>
          {paidFees.length === 0 ? (
            <EmptyState icon="🧾" title="No payments yet" desc="Paid fees will appear here with receipts" />
          ) : (
            <table className="w-full">
              <thead><tr className={t.thead}>
                {['Fee', 'Amount', 'Paid On', 'Receipt ID', 'Download'].map(h => (
                  <th key={h} className={`text-left px-5 py-2.5 text-xs font-semibold ${t.sub}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {paidFees.map(f => (
                  <tr key={f.id} className={`border-t ${t.border} ${t.hover} transition-colors`}>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${t.text}`}>{f.title}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">₹{f.amount.toLocaleString('en-IN')}</td>
                    <td className={`px-5 py-3.5 text-xs ${t.sub}`}>{f.paidDate}</td>
                    <td className={`px-5 py-3.5 text-xs font-mono ${t.sub}`}>{f.receiptId || '—'}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => { showToast('Receipt download coming soon', 'info'); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">⬇ Receipt</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER: LEAVE ─────────────────────────────────────────────────────────
  const renderLeave = () => {
    if (!activeChild) return <NoChildGuard />;
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>Apply Leave for {activeChild.name}</span>
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
              <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>Leave Type</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
                className={`w-full text-xs border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`}>
                {LEAVE_TYPES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>Reason *</label>
              <textarea rows={4} value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                placeholder="Briefly explain the reason…"
                className={`w-full text-sm border rounded-xl px-3 py-2 outline-none resize-none transition-colors ${t.input}`} />
            </div>
            <div className={`p-3 rounded-xl ${t.section} text-xs ${t.sub}`}>
              ℹ Leave requires approval from the class teacher, principal, or admin before it takes effect.
            </div>
            <button onClick={applyLeave}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold transition-all">
              Submit Leave Request
            </button>
          </div>
        </div>

        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>Leave History ({childLeave.length})</span>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {childLeave.length === 0 ? (
              <EmptyState icon="📅" title="No leave requests" desc="Submit your first leave request" />
            ) : childLeave.map(l => (
              <div key={l.id} className={`p-4 rounded-2xl border ${t.border} group hover:shadow-sm transition-all`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-sm font-bold ${t.text}`}>{l.type}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      l.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}>{l.status}</span>
                    {l.status === 'pending' && (
                      confirmCancelLeave === l.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => cancelLeave(l.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg font-semibold">Cancel</button>
                          <button onClick={() => setConfirmCancelLeave(null)} className={`text-xs px-2 py-0.5 rounded-lg ${t.sub}`}>×</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmCancelLeave(l.id)} className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                      )
                    )}
                  </div>
                </div>
                <div className={`text-xs ${t.sub}`}>{l.from} → {l.to}</div>
                <div className={`text-xs mt-1 ${t.sub}`}>{l.reason}</div>
                {l.approvedBy && <div className="text-xs text-emerald-600 mt-1 font-semibold">Approved by: {l.approvedBy}</div>}
                <div className={`text-xs mt-1 ${t.sub}`}>Applied: {l.appliedOn}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: NOTICES ───────────────────────────────────────────────────────
  const renderNotices = () => (
    <div className="space-y-4">
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <span className={`font-bold text-sm ${t.text}`}>School Notices</span>
          <div className="flex gap-1 flex-wrap">
            {NOTICE_TYPES.map(f => (
              <button key={f} onClick={() => setNoticeFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${noticeFilter === f ? 'bg-blue-600 text-white' : `${t.section} ${t.sub}`}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {filteredNotices.length === 0 ? (
            <EmptyState icon="📢" title="No notices" desc="School notices will appear here" />
          ) : filteredNotices.map(n => (
            <div key={n.id} onClick={() => markNoticeRead(n.id)}
              className={`p-4 rounded-2xl border-l-4 cursor-pointer transition-all hover:shadow-sm group ${
                n.type === 'exam' ? 'border-violet-500 bg-violet-50' :
                n.type === 'fee' ? 'border-red-400 bg-red-50' :
                n.type === 'event' ? 'border-emerald-500 bg-emerald-50' :
                n.type === 'holiday' ? 'border-amber-400 bg-amber-50' : 'border-blue-500 bg-blue-50'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {n.priority === 'high' && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">Urgent</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      n.type === 'exam' ? 'bg-violet-100 text-violet-700' :
                      n.type === 'fee' ? 'bg-red-100 text-red-600' :
                      n.type === 'event' ? 'bg-emerald-100 text-emerald-700' :
                      n.type === 'holiday' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'
                    }`}>{n.type}</span>
                  </div>
                  <div className={`text-sm font-bold ${t.text}`}>{n.title}</div>
                  <p className={`text-xs mt-1 leading-relaxed ${t.sub}`}>{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs ${t.sub} font-mono`}>{n.date}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── RENDER: MESSAGES ──────────────────────────────────────────────────────
  const renderMessages = () => {
    if (!activeChild) return <NoChildGuard />;
    return (
      <div className={`border rounded-2xl overflow-hidden shadow-sm flex flex-col ${t.card}`} style={{ height: '70vh' }}>
        <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
          <div>
            <span className={`font-bold text-sm ${t.text}`}>Class Teacher — {activeChild.name}</span>
            <div className={`text-xs ${t.sub}`}>Mrs. Radha Krishnan · Mathematics</div>
          </div>
          <button onClick={() => setTab('ptm')}
            className="text-xs bg-violet-100 text-violet-700 hover:bg-violet-200 px-3 py-1.5 rounded-xl font-semibold transition-all">
            📅 Book PTM
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {childMessages.length === 0 && (
            <div className={`text-xs text-center py-10 ${t.sub}`}>No messages yet — start the conversation</div>
          )}
          {childMessages.map(m => (
            <div key={m.id} className={`flex ${m.fromParent ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                m.fromParent ? 'bg-blue-600 text-white rounded-br-md' : `${t.section} ${t.text} rounded-bl-md`
              }`}>
                <div className="leading-relaxed">{m.body}</div>
                <div className={`text-xs mt-1 ${m.fromParent ? 'text-blue-200' : t.sub}`}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={`border-t ${t.border} p-4 flex gap-3`}>
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message to the teacher…"
            className={`flex-1 text-sm border rounded-xl px-4 py-2.5 outline-none transition-colors ${t.input}`} />
          <button onClick={sendMessage}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all">Send</button>
        </div>
      </div>
    );
  };

  // ── RENDER: PTM ───────────────────────────────────────────────────────────
  const renderPTM = () => {
    if (!activeChild) return <NoChildGuard />;
    const availableSlots = ptmSlots.filter(s => s.available);

    return (
      <div className="space-y-4">
        {myPTMBookings.length > 0 && (
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
            <div className={`px-5 py-3.5 border-b ${t.border}`}>
              <span className={`font-bold text-sm ${t.text}`}>My Bookings ({myPTMBookings.length})</span>
            </div>
            <div className="p-4 space-y-2.5">
              {myPTMBookings.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-100 group">
                  <div>
                    <div className="text-sm font-bold text-emerald-800">{s.teacher}</div>
                    <div className="text-xs text-emerald-600">{s.subject} · {s.date} at {s.time}</div>
                  </div>
                  {confirmCancelPTM === s.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => cancelPTM(s.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl font-semibold">Cancel Meeting</button>
                      <button onClick={() => setConfirmCancelPTM(null)} className={`text-xs px-3 py-1.5 rounded-xl ${t.section} ${t.sub}`}>Keep</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmCancelPTM(s.id)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all font-semibold">Cancel</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border}`}>
            <span className={`font-bold text-sm ${t.text}`}>Available Slots</span>
          </div>
          {availableSlots.length === 0 ? (
            <EmptyState icon="📅" title="No available slots" desc="All slots are booked. Check back later." />
          ) : (
            <div className="p-4 grid grid-cols-2 gap-3">
              {availableSlots.map(s => (
                <div key={s.id} className={`border rounded-2xl p-4 ${t.border} hover:border-blue-400 hover:shadow-md transition-all group`}>
                  <div className={`text-sm font-bold ${t.text} mb-1`}>{s.teacher}</div>
                  <div className={`text-xs ${t.sub} mb-0.5`}>{s.subject}</div>
                  <div className="text-xs text-blue-600 font-semibold mb-3">{s.date} · {s.time}</div>
                  <button onClick={() => bookPTM(s.id)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all">
                    Book This Slot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER: BUS ───────────────────────────────────────────────────────────
  const renderBus = () => {
    if (!activeChild) return <NoChildGuard />;
    return (
      <div className="space-y-4">
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
          <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
            <span className={`font-bold text-sm ${t.text}`}>Live Bus Tracking</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-emerald-600 font-semibold">Live</span>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className={`text-xs px-3 py-1.5 rounded-xl ${t.section} ${t.sub} font-semibold`}>Bus No: KA-01-B-2345</div>
              <div className={`text-xs px-3 py-1.5 rounded-xl ${t.section} ${t.sub} font-semibold`}>Driver: Raju Kumar · +91 98765 43210</div>
              <div className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-semibold">ETA to School: ~12 mins</div>
            </div>

            <div className="space-y-0">
              {BUS_STOPS.map((stop, i) => (
                <div key={stop} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      i < busStop ? 'bg-emerald-500 text-white border-emerald-500' :
                      i === busStop ? 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100' :
                      `${t.section} ${t.sub} border-gray-200 dark:border-gray-700`
                    }`}>
                      {i === busStop ? '🚌' : i < busStop ? '✓' : i + 1}
                    </div>
                    {i < BUS_STOPS.length - 1 && (
                      <div className={`w-0.5 h-10 ${i < busStop ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className={`text-sm font-bold ${i === busStop ? 'text-blue-600' : i < busStop ? 'text-emerald-600' : t.sub}`}>
                      {stop}
                      {i === busStop && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold animate-pulse">Bus is here</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${t.sub}`}>
                      {i < busStop ? 'Departed' : i === busStop ? 'Currently here' : `ETA ~${(i - busStop) * 4} mins`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={() => setBusStop(p => Math.max(0, p - 1))} disabled={busStop === 0}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${busStop === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'}`}>
                ← Previous Stop
              </button>
              <button onClick={() => setBusStop(p => Math.min(BUS_STOPS.length - 1, p + 1))} disabled={busStop === BUS_STOPS.length - 1}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${busStop === BUS_STOPS.length - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'}`}>
                Next Stop →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: TIMETABLE ─────────────────────────────────────────────────────
  const renderTimetable = () => {
    if (!activeChild) return <NoChildGuard />;
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const PERIODS = ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00'];
    return (
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${t.card}`}>
        <div className={`px-5 py-3.5 border-b ${t.border} flex items-center justify-between`}>
          <span className={`font-bold text-sm ${t.text}`}>Class Timetable — {activeChild.class}</span>
          <span className={`text-xs px-3 py-1 rounded-full bg-gray-100 ${t.sub} font-semibold`}>View Only</span>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full">
            <thead><tr>
              <th className={`text-left px-3 py-2 text-xs font-semibold ${t.sub} w-16`}>Period</th>
              {DAYS.map(d => <th key={d} className={`text-center px-3 py-2 text-xs font-bold ${t.sub}`}>{d}</th>)}
            </tr></thead>
            <tbody>
              {PERIODS.map((p, pi) => (
                <tr key={p} className={`border-t ${t.border}`}>
                  <td className={`px-3 py-3 text-xs font-mono ${t.sub}`}>{p}</td>
                  {DAYS.map(d => (
                    <td key={d} className="px-2 py-2">
                      <div className={`text-center text-xs py-2.5 px-2 rounded-xl font-medium ${t.section} ${t.sub}`}>—</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`text-xs text-center mt-3 ${t.sub}`}>Timetable is set by the school admin and will appear here once published</div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return renderDashboard();
      case 'attendance': return renderAttendance();
      case 'grades': return renderGrades();
      case 'homework': return renderHomework();
      case 'fees': return renderFees();
      case 'leave': return renderLeave();
      case 'timetable': return renderTimetable();
      case 'notices': return renderNotices();
      case 'messages': return renderMessages();
      case 'ptm': return renderPTM();
      case 'bus': return renderBus();
      default: return renderDashboard();
    }
  };

  // ── Nav groups ────────────────────────────────────────────────────────────
  const navGroups = [
    {
      label: 'Overview', items: [
        { id: 'dashboard' as Tab, icon: '⊞', label: 'Dashboard' },
      ]
    },
    {
      label: 'Academics', items: [
        { id: 'attendance' as Tab, icon: '📅', label: 'Attendance' },
        { id: 'grades' as Tab, icon: '📊', label: 'Grades & Report' },
        { id: 'homework' as Tab, icon: '📝', label: 'Homework' },
        { id: 'timetable' as Tab, icon: '🗓', label: 'Timetable' },
      ]
    },
    {
      label: 'Finance', items: [
        { id: 'fees' as Tab, icon: '💳', label: 'Fees & Payments' },
      ]
    },
    {
      label: 'Communication', items: [
        { id: 'notices' as Tab, icon: '📢', label: 'Notices' },
        { id: 'messages' as Tab, icon: '💬', label: 'Messages' },
        { id: 'ptm' as Tab, icon: '🤝', label: 'PTM Booking' },
      ]
    },
    {
      label: 'Other', items: [
        { id: 'leave' as Tab, icon: '🏖', label: 'Leave' },
        { id: 'bus' as Tab, icon: '🚌', label: 'Bus Tracking' },
      ]
    },
  ];

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen transition-colors duration-300 ${t.bg}`}>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-auto ${
            toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '⚠ ' : 'ℹ '}{toast.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className={`w-56 border-r flex flex-col h-screen flex-shrink-0 ${t.sidebar}`}>
        <div className={`px-4 py-4 border-b ${t.border} flex items-center gap-2.5`}>
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-base shadow-sm">🏫</div>
          <div>
            <div className={`font-extrabold text-sm tracking-tight ${t.text}`}>Instytu</div>
            <div className={`text-xs ${t.sub}`}>Parent Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navGroups.map(group => (
            <div key={group.label} className="mb-1">
              <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${t.sub} opacity-60`}>{group.label}</div>
              {group.items.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all duration-150
                    ${tab === item.id ? 'bg-violet-50 text-violet-600 font-semibold shadow-sm' : `${t.sub} ${t.hover} hover:translate-x-0.5`}`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {tab === item.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500"></span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className={`p-3 border-t ${t.border}`}>
          <div className={`flex items-center gap-2 p-2.5 rounded-xl cursor-default group ${t.hover}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {(user.name?.charAt(0) || 'P').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold truncate ${t.text}`}>{user.name || 'Parent'}</div>
              <div className={`text-xs ${t.sub}`}>{children.length} child{children.length !== 1 ? 'ren' : ''}</div>
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
        {/* Header */}
        <header className={`border-b px-6 h-14 flex items-center justify-between flex-shrink-0 ${t.sidebar}`}>
          <div>
            <div className={`font-bold text-sm ${t.text}`}>
              {navGroups.flatMap(g => g.items).find(n => n.id === tab)?.label}
            </div>
            <div className={`text-xs ${t.sub}`}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Child selector */}
            {children.length > 0 ? (
              <div className="flex items-center gap-2">
                <select value={activeChildId || ''} onChange={e => setActiveChildId(Number(e.target.value))}
                  className={`text-xs border rounded-xl px-3 py-1.5 outline-none font-semibold transition-colors ${t.input}`}>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name} · {c.class}</option>)}
                </select>
                <button onClick={() => setShowAddChild(true)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold border transition-all ${t.input} hover:border-violet-400`}>+ Child</button>
              </div>
            ) : (
              <button onClick={() => setShowAddChild(true)}
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95">+ Add Child</button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifPanel(p => !p)}
                className={`w-8 h-8 border rounded-xl flex items-center justify-center text-sm transition-all hover:shadow-sm active:scale-95 relative ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                🔔
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>
              {showNotifPanel && (
                <div className={`absolute right-0 top-10 w-80 border rounded-2xl shadow-xl z-40 overflow-hidden ${t.card}`}>
                  <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
                    <span className={`font-bold text-sm ${t.text}`}>Notifications</span>
                    <button onClick={markAllNotifsRead} className="text-xs text-blue-500 font-semibold hover:text-blue-700">Mark all read</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {appNotifications.length === 0 ? (
                      <div className={`text-xs text-center py-8 ${t.sub}`}>No notifications yet</div>
                    ) : appNotifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b ${t.border} ${!n.read ? (dark ? 'bg-gray-800' : 'bg-blue-50/60') : ''} ${t.hover} transition-colors`}>
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>}
                          <div className="flex-1">
                            <div className={`text-xs font-bold ${t.text}`}>{n.title}</div>
                            <div className={`text-xs mt-0.5 ${t.sub}`}>{n.body}</div>
                            <div className={`text-xs mt-0.5 ${t.sub} opacity-60`}>{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button onClick={() => setDark(!dark)}
              className={`w-8 h-8 border rounded-xl flex items-center justify-center text-sm transition-all hover:shadow-sm active:scale-95 ${dark ? 'bg-gray-800 border-gray-700 text-yellow-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5" onClick={() => showNotifPanel && setShowNotifPanel(false)}>
          {renderContent()}
        </main>
      </div>

      {/* Add child modal */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddChild(false)}>
          <div className={`border rounded-2xl p-6 w-[480px] shadow-2xl ${t.card}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className={`font-bold text-sm ${t.text}`}>Add Child</span>
              <button onClick={() => setShowAddChild(false)} className={`text-xl leading-none ${t.sub} hover:text-red-500 transition-colors`}>×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Full Name *', key: 'name', placeholder: "Child's full name", type: 'text' },
                { label: 'Roll No *', key: 'roll', placeholder: 'e.g. 14', type: 'number' },
                { label: 'School Name *', key: 'school', placeholder: 'School / institution name', type: 'text' },
                { label: 'Date of Birth', key: 'dob', placeholder: '', type: 'date' },
                { label: 'Bus Route', key: 'busRoute', placeholder: 'e.g. Route 4 - HSR Layout', type: 'text' },
              ].map(f => (
                <div key={f.key} className={f.key === 'school' ? 'col-span-2' : ''}>
                  <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(newChild as any)[f.key]}
                    onChange={e => setNewChild(p => ({ ...p, [f.key]: e.target.value }))}
                    className={`w-full text-sm border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`} />
                </div>
              ))}
              <div>
                <label className={`text-xs font-semibold ${t.sub} block mb-1.5`}>Class</label>
                <select value={newChild.class} onChange={e => setNewChild(p => ({ ...p, class: e.target.value }))}
                  className={`w-full text-sm border rounded-xl px-3 py-2 outline-none transition-colors ${t.input}`}>
                  {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddChild(false)}
                className={`px-4 py-2 text-sm rounded-xl font-semibold border transition-all ${t.input}`}>Cancel</button>
              <button onClick={addChild}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all">
                Add Child
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
