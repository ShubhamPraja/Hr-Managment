'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';

type LeaveType = 'Sick' | 'Casual' | 'Annual' | 'Maternity';

interface LeaveBalanceItem {
  key: string;
  label: string;
  total: number;
  used: number;
  remaining: number;
}

interface LeaveRequestItem {
  _id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  userName: string;
  userId: string;
  createdAt: string;
}

const LeaveManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'Annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const canSeeAllRequests = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  const loadLeaveData = async () => {
    if (!currentUser?.organizationId || !currentUser?.id) return;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        userId: currentUser.id,
        role: currentUser.role,
      });
      if (currentUser.organizationDb) {
        params.set('organizationDb', currentUser.organizationDb);
      }
      const response = await fetch(`/api/leave?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load leave data');
      }
      setBalances(data.balances || []);
      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaveData();
  }, [currentUser?.organizationId, currentUser?.id, currentUser?.role]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser?.organizationId || !currentUser?.id) return;

    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit leave request');
      }

      setMessage(data.message || 'Leave request submitted');
      setShowForm(false);
      setForm({ type: 'Annual', startDate: '', endDate: '', reason: '' });
      await loadLeaveData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="text-slate-500">Manage leave balances and track application statuses.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void loadLeaveData()}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Application
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-semibold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {balances.map((item) => (
          <div key={item.key} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-4">{item.label}</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-slate-800">{item.remaining}</span>
                <span className="text-sm text-slate-400 font-medium ml-1">Days Left</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Used: {item.used}</p>
                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${item.total > 0 ? Math.min(100, (item.used / item.total) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && balances.length === 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-full text-sm text-slate-500">
            No leave policy configured yet.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {canSeeAllRequests ? 'Organization Leave Applications' : 'My Applications'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {canSeeAllRequests && <th className="px-6 py-4">User</th>}
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={canSeeAllRequests ? 6 : 5} className="px-6 py-8 text-center text-sm text-slate-500">
                    No leave requests yet.
                  </td>
                </tr>
              )}
              {requests.map((request) => (
                <tr key={request._id} className="hover:bg-slate-50">
                  {canSeeAllRequests && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{request.userName}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{request.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.endDate}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{request.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'Approved'
                          ? 'bg-green-50 text-green-600'
                          : request.status === 'Rejected'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-yellow-50 text-yellow-600'
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">New Leave Application</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitRequest} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Leave Type</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                >
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Casual">Casual</option>
                  <option value="Maternity">Maternity/Paternity</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Start Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">End Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Reason</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
