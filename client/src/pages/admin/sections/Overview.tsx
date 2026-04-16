import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const StatCard = ({ label, value, color }: { label: string; value: any; color: string }) => (
  <div className={`rounded-2xl p-4 border ${color}`}>
    <div className="text-xs font-semibold mb-1 opacity-70 uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-bold">{value ?? '—'}</div>
  </div>
);

// ── Admin / SuperAdmin Overview ───────────────────────────────────────────────
const AdminOverview = () => {
  const [stats, setStats] = useState<any>({});
  const [notices, setNotices] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/students'), api.get('/classes'), api.get('/users?role=teacher'),
      api.get('/leaves?status=pending'), api.get('/fees'), api.get('/notices'),
    ]).then(([s, c, t, l, f, n]) => {
      const fees = f.data as any[];
      setStats({
        students: s.data.length, classes: c.data.length, teachers: t.data.length,
        pendingLeaves: l.data.length,
        collected: fees.filter(x => x.status === 'paid').reduce((a: number, x: any) => a + x.amount, 0),
        pending: fees.filter(x => x.status !== 'paid').reduce((a: number, x: any) => a + x.amount, 0),
      });
      setNotices((n.data as any[]).slice(0, 5));
      setLeaves((l.data as any[]).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Students" value={stats.students} color="bg-blue-50 border-blue-100 text-blue-700" />
        <StatCard label="Classes" value={stats.classes} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
        <StatCard label="Teachers" value={stats.teachers} color="bg-purple-50 border-purple-100 text-purple-700" />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves} color="bg-yellow-50 border-yellow-100 text-yellow-700" />
        <StatCard label="Fees Collected" value={`₹${stats.collected?.toLocaleString()}`} color="bg-green-50 border-green-100 text-green-700" />
        <StatCard label="Fees Pending" value={`₹${stats.pending?.toLocaleString()}`} color="bg-red-50 border-red-100 text-red-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Recent Notices</h3>
          {notices.length === 0 ? <p className="text-sm text-gray-400">No notices</p> : notices.map(n => (
            <div key={n._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{n.title}</div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Pending Leave Requests</h3>
          {leaves.length === 0 ? <p className="text-sm text-gray-400">No pending leaves</p> : leaves.map(l => (
            <div key={l._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{l.student?.user?.name || '—'}</div>
              <div className="text-xs text-gray-400">{l.type} · {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Teacher Overview ──────────────────────────────────────────────────────────
const TeacherOverview = () => {
  const [stats, setStats] = useState<any>({});
  const [notices, setNotices] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/classes'), api.get('/homework'), api.get('/notices')])
      .then(([s, c, h, n]) => {
        setStats({ students: s.data.length, classes: c.data.length, homework: h.data.length });
        setNotices((n.data as any[]).slice(0, 4));
        setHomework((h.data as any[]).filter((x: any) => new Date(x.dueDate) >= new Date()).slice(0, 4));
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Students" value={stats.students} color="bg-blue-50 border-blue-100 text-blue-700" />
        <StatCard label="Classes" value={stats.classes} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
        <StatCard label="Homework Assigned" value={stats.homework} color="bg-purple-50 border-purple-100 text-purple-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Upcoming Homework Due</h3>
          {homework.length === 0 ? <p className="text-sm text-gray-400">No upcoming homework</p> : homework.map(h => (
            <div key={h._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{h.title}</div>
              <div className="text-xs text-gray-400">{h.subject} · {h.class?.name} · Due {new Date(h.dueDate).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Recent Notices</h3>
          {notices.length === 0 ? <p className="text-sm text-gray-400">No notices</p> : notices.map(n => (
            <div key={n._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{n.title}</div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Student Overview ──────────────────────────────────────────────────────────
const StudentOverview = () => {
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('instytu_user') || '{}');

  useEffect(() => {
    api.get('/students').then(async r => {
      const me = r.data.find((s: any) => s.user?._id === user._id || s.user === user._id);
      setProfile(me);
      if (me) {
        const [a, g, h, n] = await Promise.all([
          api.get(`/attendance?studentId=${me._id}`),
          api.get(`/grades?studentId=${me._id}`),
          api.get(me.class?._id ? `/homework?classId=${me.class._id}` : '/homework'),
          api.get('/notices'),
        ]);
        setAttendance(a.data);
        setGrades(g.data);
        setHomework((h.data as any[]).filter((x: any) => new Date(x.dueDate) >= new Date()).slice(0, 4));
        setNotices((n.data as any[]).slice(0, 4));
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const present = attendance.filter((a: any) => a.status === 'present').length;
  const attPct = attendance.length ? Math.round((present / attendance.length) * 100) : null;
  const avgMarks = grades.length
    ? Math.round(grades.reduce((s: number, g: any) => s + (g.marksObtained / g.totalMarks) * 100, 0) / grades.length)
    : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={attPct !== null ? `${attPct}%` : '—'} color="bg-green-50 border-green-100 text-green-700" />
        <StatCard label="Avg Score" value={avgMarks !== null ? `${avgMarks}%` : '—'} color="bg-blue-50 border-blue-100 text-blue-700" />
        <StatCard label="Class" value={profile?.class?.name || '—'} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
        <StatCard label="Roll No" value={profile?.rollNumber || '—'} color="bg-purple-50 border-purple-100 text-purple-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Pending Homework</h3>
          {homework.length === 0 ? <p className="text-sm text-gray-400">No pending homework</p> : homework.map(h => (
            <div key={h._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{h.title}</div>
              <div className="text-xs text-gray-400">{h.subject} · Due {new Date(h.dueDate).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Notices</h3>
          {notices.length === 0 ? <p className="text-sm text-gray-400">No notices</p> : notices.map(n => (
            <div key={n._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{n.title}</div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Parent Overview ───────────────────────────────────────────────────────────
const ParentOverview = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [childCount, setChildCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/fees'), api.get('/notices')])
      .then(([s, f, n]) => {
        setChildCount(s.data.length);
        setFees((f.data as any[]).filter((x: any) => x.status !== 'paid').slice(0, 5));
        setNotices((n.data as any[]).slice(0, 4));
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const totalDue = fees.reduce((s: number, f: any) => s + f.amount, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Children" value={childCount} color="bg-blue-50 border-blue-100 text-blue-700" />
        <StatCard label="Fees Due" value={`₹${totalDue.toLocaleString()}`} color="bg-red-50 border-red-100 text-red-700" />
        <StatCard label="Notices" value={notices.length} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Pending Fees</h3>
          {fees.length === 0 ? <p className="text-sm text-gray-400">No pending fees</p> : fees.map(f => (
            <div key={f._id} className="py-2 border-b border-gray-50 last:border-0 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm text-gray-800">{f.title}</div>
                <div className="text-xs text-gray-400">{f.student?.user?.name} · Due {new Date(f.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="font-bold text-red-600 text-sm">₹{f.amount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Notices</h3>
          {notices.length === 0 ? <p className="text-sm text-gray-400">No notices</p> : notices.map(n => (
            <div key={n._id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="font-medium text-sm text-gray-800">{n.title}</div>
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Router ────────────────────────────────────────────────────────────────────
const Overview = ({ role }: { role: string }) => {
  if (role === 'student') return <StudentOverview />;
  if (role === 'parent') return <ParentOverview />;
  if (role === 'teacher') return <TeacherOverview />;
  return <AdminOverview />;
};

export default Overview;
