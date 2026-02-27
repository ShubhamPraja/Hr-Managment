'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../hooks/use-auth';

interface DashboardKpis {
  activeWorkforce: number;
  activeWorkforceTrend: string;
  dailyAttendance: number;
  dailyAttendanceTrend: string;
  leavesToday: number;
  leavesTodayTrend: string;
  openPositions: number;
  openPositionsTrend: string;
  pendingLeaves: number;
}

interface ChartPoint {
  name: string;
  attendance: number;
  leaves: number;
}

interface DepartmentMetric {
  key?: string;
  name: string;
  value: number;
}

const Dashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis>({
    activeWorkforce: 0,
    activeWorkforceTrend: '0%',
    dailyAttendance: 0,
    dailyAttendanceTrend: '0%',
    leavesToday: 0,
    leavesTodayTrend: '0%',
    openPositions: 0,
    openPositionsTrend: '0%',
    pendingLeaves: 0,
  });
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [departments, setDepartments] = useState<DepartmentMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    if (!currentUser?.organizationId) return;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
      });
      if (currentUser.organizationDb) {
        params.set('organizationDb', currentUser.organizationDb);
      }
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load dashboard');
      }
      setKpis(data.kpis || kpis);
      setChart(data.chart || []);
      setDepartments(data.departments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [currentUser?.organizationId]);

  const topDepartments = useMemo(() => departments.slice(0, 5), [departments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 font-medium">Insights and activity across your enterprise.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void loadDashboard()}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIItem label="Active Workforce" value={String(kpis.activeWorkforce)} trend={kpis.activeWorkforceTrend} color="blue" />
        <KPIItem label="Daily Attendance" value={`${kpis.dailyAttendance}%`} trend={kpis.dailyAttendanceTrend} color="green" />
        <KPIItem label="Leaves Today" value={String(kpis.leavesToday)} trend={kpis.leavesTodayTrend} color="orange" />
        <KPIItem label="Open Positions" value={String(kpis.openPositions)} trend={kpis.openPositionsTrend} color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 text-lg">Workforce Attendance Flow</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Leaves: {kpis.pendingLeaves}
            </span>
          </div>
          <div className="h-[340px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Loading chart...</div>
            ) : chart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">No attendance data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-8">Department Metrics</h3>
          <div className="space-y-6">
            {topDepartments.length === 0 && !isLoading && (
              <p className="text-sm text-slate-500">No department data available.</p>
            )}
            {topDepartments.map((dept) => (
              <DeptStat key={dept.name} name={dept.name} value={dept.value} />
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => void loadDashboard()}
              className="w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            >
              Refresh Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPIItem = ({ label, value, trend, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const trendPositive = String(trend).startsWith('+') || String(trend) === '0%';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">{label}</p>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trendPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const DeptStat = ({ name, value }: { name: string; value: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm font-semibold">
      <span className="text-slate-600">{name}</span>
      <span className="text-slate-900">{value}%</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

export default Dashboard;
