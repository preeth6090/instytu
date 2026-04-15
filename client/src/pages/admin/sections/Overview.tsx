import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Spinner from '../../../components/Spinner';

const StatCard = ({ icon, label, value, sub, color }: any) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const Overview = () => {
  const [stats, setStats] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/students'),
      api.get('/classes'),
      api.get('/users?role=teacher'),
      api.get('/notices?limit=5'),
      api.get('/leaves?status=pending'),
      api.get('/fees'),
    ]).then(([students, classes, teachers, noticesRes, leavesRes, fees]) => {
      const feeData = fees.data || [];
      const collected = feeData.filter((f: any) => f.status === 'paid').reduce((s: number, f: any) => s + f.amount, 0);
      const pending = feeData.filter((f: any) => f.status !== 'paid').reduce((s: number, f: any) => s + f.amount, 0);
      setStats({
        students: students.data?.length ?? 0,
        classes: classes.data?.length ?? 0,
        teachers: teachers.data?.length ?? 0,
        pendingLeaves: leavesRes.data?.length ?? 0,
        collected,
        pending,
      });
      setNotices(noticesRes.data?.slice(0, 5) || []);
      setLeaves(leavesRes.data?.slice(0, 5) || []);
    }).catch(() => setStats({})).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon="🎒" label="Students" value={stats?.students} color="bg-blue-50" />
        <StatCard icon="🏫" label="Classes" value={stats?.classes} color="bg-indigo-50" />
        <StatCard icon="👩‍🏫" label="Teachers" value={stats?.teachers} color="bg-purple-50" />
        <StatCard icon="🏖️" label="Pending Leaves" value={stats?.pendingLeaves} color="bg-yellow-50" />
        <StatCard icon="✅" label="Fees Collected" value={`₹${(stats?.collected || 0).toLocaleString()}`} color="bg-green-50" />
        <StatCard icon="⏳" label="Fees Pending" value={`₹${(stats?.pending || 0).toLocaleString()}`} color="bg-red-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent notices */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Recent Notices</h2>
          {notices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notices posted yet</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n: any) => (
                <div key={n._id} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📢</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                    <div className="text-xs text-gray-400">{n.type} · {new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending leaves */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Pending Leave Requests</h2>
          {leaves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((l: any) => (
                <div key={l._id} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📋</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{l.student?.user?.name || 'Student'}</div>
                    <div className="text-xs text-gray-400">{l.type} · {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
