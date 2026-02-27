'use client';


import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/use-auth';

interface AttendanceLog {
  _id: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  dateKey: string;
  punchInAt: string;
  punchOutAt: string | null;
  durationMinutes: number;
  status: 'Present' | 'WFH' | 'Leave';
}

interface AttendanceSummary {
  totalDays: number;
  punchedInDays: number;
  completedDays: number;
  inProgressDays: number;
  totalMinutes: number;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const monthKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes: number) => {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const Attendance: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalDays: 0,
    punchedInDays: 0,
    completedDays: 0,
    inProgressDays: 0,
    totalMinutes: 0,
  });
  const [month, setMonth] = useState(monthKey(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const todayKey = useMemo(() => dateKey(new Date()), []);
  const todayRecord = useMemo(() => logs.find((log) => log.dateKey === todayKey), [logs, todayKey]);
  const canPunchIn = !todayRecord;
  const canPunchOut = !!todayRecord && !todayRecord.punchOutAt;

  const loadAttendance = async () => {
    if (!currentUser?.organizationId || !currentUser?.id) return;

    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        userId: currentUser.id,
        month,
      });
      if (currentUser.organizationDb) {
        params.set('organizationDb', currentUser.organizationDb);
      }
      const response = await fetch(`/api/attendance?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load attendance logs');
      }
      setLogs(data.records || []);
      setSummary(
        data.summary || {
          totalDays: 0,
          punchedInDays: 0,
          completedDays: 0,
          inProgressDays: 0,
          totalMinutes: 0,
        }
      );
    } catch (err: any) {
      setError(err.message || 'Unable to load attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendance();
  }, [currentUser?.organizationId, currentUser?.id, month]);

  const handlePunch = async () => {
    if (!currentUser?.organizationId || !currentUser?.id) return;
    setIsActionLoading(true);
    setError('');
    setMessage('');

    try {
      const endpoint = canPunchIn ? '/api/attendance/punch-in' : '/api/attendance/punch-out';
      const payload: Record<string, unknown> = {
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb,
        userId: currentUser.id,
      };

      if (canPunchIn) {
        payload.userName = currentUser.name;
        payload.userEmail = currentUser.email;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Attendance action failed');
      }
      setMessage(data.message || (canPunchIn ? 'Punch in successful' : 'Punch out successful'));
      await loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Attendance action failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const completion = summary.totalDays > 0 ? Math.round((summary.completedDays / summary.totalDays) * 100) : 0;
  const totalHours = (summary.totalMinutes / 60).toFixed(1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Tracker</h1>
          <p className="text-slate-500">Punch in, punch out, and review your attendance logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled
            className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
          >
            My Logs
          </button>
          <button
            onClick={handlePunch}
            disabled={isActionLoading || (!canPunchIn && !canPunchOut)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isActionLoading ? 'Please wait...' : canPunchIn ? 'Punch In' : canPunchOut ? 'Punch Out' : 'Completed'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Recent Logs</h3>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  className="text-sm border border-slate-200 rounded p-1"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Punch In</th>
                    <th className="px-6 py-4">Punch Out</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                        No attendance logs for this month.
                      </td>
                    </tr>
                  )}
                  {logs.map((record) => {
                    const recordStatus = record.punchOutAt ? record.status : 'In Progress';
                    return (
                      <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{record.dateKey}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatTime(record.punchInAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatTime(record.punchOutAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recordStatus === 'Present'
                                ? 'bg-green-50 text-green-600'
                                : recordStatus === 'In Progress'
                                  ? 'bg-blue-50 text-blue-600'
                                  : recordStatus === 'WFH'
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-orange-50 text-orange-600'
                            }`}
                          >
                            {recordStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {record.punchOutAt ? formatDuration(record.durationMinutes) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Summary this month</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Working Days</span>
                <span className="text-sm font-semibold text-slate-800">{summary.totalDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Punched In</span>
                <span className="text-sm font-semibold text-blue-600">{summary.punchedInDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed Days</span>
                <span className="text-sm font-semibold text-green-600">{summary.completedDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">In Progress</span>
                <span className="text-sm font-semibold text-orange-600">{summary.inProgressDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Hours</span>
                <span className="text-sm font-semibold text-slate-800">{totalHours}h</span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Completion</span>
                  <span className="text-sm font-bold text-blue-600">{completion}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completion}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl text-white shadow-lg">
            <h4 className="font-bold mb-2">Today's Status</h4>
            <p className="text-blue-100 text-sm mb-4">
              {canPunchOut
                ? `Punched in at ${formatTime(todayRecord?.punchInAt)}. Punch out when your shift ends.`
                : canPunchIn
                  ? 'You have not punched in yet for today.'
                  : `Completed with ${formatDuration(todayRecord?.durationMinutes || 0)}.`}
            </p>
            <button
              onClick={handlePunch}
              disabled={isActionLoading || (!canPunchIn && !canPunchOut)}
              className="bg-white text-blue-600 text-xs font-bold px-4 py-2 rounded uppercase tracking-wider disabled:opacity-60"
            >
              {canPunchIn ? 'Start Shift' : canPunchOut ? 'End Shift' : 'Shift Completed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
