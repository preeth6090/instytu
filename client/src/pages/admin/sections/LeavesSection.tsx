import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import Spinner from '../../../components/Spinner';
import Badge from '../../../components/Badge';

const statusVariant: any = { pending: 'yellow', approved: 'green', rejected: 'red' };

const LeavesSection = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  const load = () => api.get(`/leaves${filterStatus ? `?status=${filterStatus}` : ''}`).then(r => setLeaves(r.data)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filterStatus]);

  const review = async (status: 'approved' | 'rejected') => {
    if (!reviewModal) return;
    setSaving(true);
    try {
      await api.put(`/leaves/${reviewModal._id}/review`, { status, reviewNote });
      setReviewModal(null); setReviewNote(''); load();
    } finally { setSaving(false); }
  };

  const days = (from: string, to: string) => {
    const d = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    return `${d} day${d !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {['pending','approved','rejected',''].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {leaves.length === 0 ? <div className="text-center py-16 text-gray-400">No leave requests found</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Student', 'Type', 'Duration', 'Reason', 'Applied By', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaves.map(l => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.student?.user?.name || '—'}</td>
                    <td className="px-4 py-3"><span className="capitalize text-gray-600">{l.type}</span></td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600">{new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{days(l.fromDate, l.toDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{l.reason}</td>
                    <td className="px-4 py-3 text-gray-600">{l.appliedBy?.name || '—'}</td>
                    <td className="px-4 py-3"><Badge label={l.status} variant={statusVariant[l.status] || 'gray'} /></td>
                    <td className="px-4 py-3">
                      {l.status === 'pending' ? (
                        <button onClick={() => { setReviewModal(l); setReviewNote(''); }}
                          className="text-indigo-600 hover:underline text-xs font-medium">Review</button>
                      ) : (
                        <span className="text-xs text-gray-400">{l.reviewNote || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {reviewModal && (
        <Modal title="Review Leave Request" onClose={() => setReviewModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student</span>
                <span className="font-semibold text-gray-900">{reviewModal.student?.user?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className="capitalize text-gray-700">{reviewModal.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-700">{new Date(reviewModal.fromDate).toLocaleDateString()} – {new Date(reviewModal.toDate).toLocaleDateString()} ({days(reviewModal.fromDate, reviewModal.toDate)})</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Reason: </span>
                <span className="text-gray-700">{reviewModal.reason}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Review Note (optional)</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} placeholder="Add a note..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => review('rejected')} disabled={saving}
                className="px-5 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-200 disabled:opacity-60">
                Reject
              </button>
              <button onClick={() => review('approved')} disabled={saving}
                className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Approve'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeavesSection;
