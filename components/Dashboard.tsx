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
        userId: currentUser.id,
        role: currentUser.role,
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
  }, [currentUser?.organizationId, currentUser?.organizationDb, currentUser?.id, currentUser?.role]);

  const topDepartments = useMemo(() => departments.slice(0, 5), [departments]);

  return (
    <div className="space-y-7 motion-fade">
      <section className="panel-surface rounded-[1.6rem] p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="ui-overline text-[var(--color-text-soft)] mb-2">Control Center</p>
            <h1 className="ui-page-title font-heading text-[var(--color-text)] tracking-tight">Executive Dashboard</h1>
            <p className="ui-subtitle text-[var(--color-text-soft)] mt-1">Insights and activity across your enterprise.</p>
          </div>
          <button
            onClick={() => void loadDashboard()}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent-600)] text-white text-sm font-semibold hover:bg-[var(--accent-700)] transition-colors"
          >
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl border text-sm font-semibold bg-[color:color-mix(in_srgb,var(--danger-500)_12%,transparent)] border-[color:color-mix(in_srgb,var(--danger-500)_25%,transparent)] text-[var(--danger-500)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPIItem label="Active Workforce" value={String(kpis.activeWorkforce)} trend={kpis.activeWorkforceTrend} color="blue" />
        <KPIItem label="Daily Attendance" value={`${kpis.dailyAttendance}%`} trend={kpis.dailyAttendanceTrend} color="green" />
        <KPIItem label="Leaves Today" value={String(kpis.leavesToday)} trend={kpis.leavesTodayTrend} color="orange" />
        <KPIItem label="Open Positions" value={String(kpis.openPositions)} trend={kpis.openPositionsTrend} color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 panel-surface p-6 rounded-[1.5rem]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="ui-section-title font-heading text-[var(--color-text)]">Workforce Attendance Flow</h3>
            <span className="ui-label text-[var(--color-text-soft)]">
              Pending Leaves: {kpis.pendingLeaves}
            </span>
          </div>
          <div className="h-[340px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-soft)] text-sm font-medium">
                Loading chart...
              </div>
            ) : chart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-soft)] text-sm font-medium">
                No attendance data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-600)" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="var(--accent-600)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-soft)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-soft)', fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--border-soft)',
                      backgroundColor: 'var(--surface-1)',
                      boxShadow: '0 10px 24px -16px rgba(var(--shadow-color),0.46)',
                    }}
                    cursor={{ stroke: 'var(--accent-600)', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="attendance" stroke="var(--accent-600)" strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel-surface p-6 rounded-[1.5rem]">
          <h3 className="ui-section-title font-heading text-[var(--color-text)] mb-8">Department Metrics</h3>
          <div className="space-y-6">
            {topDepartments.length === 0 && !isLoading && (
              <p className="ui-subtitle text-[var(--color-text-soft)]">No department data available.</p>
            )}
            {topDepartments.map((dept) => (
              <DeptStat key={dept.name} name={dept.name} value={dept.value} />
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border-soft)]">
            <button
              onClick={() => void loadDashboard()}
              className="w-full py-3 text-sm font-bold text-[var(--accent-600)] hover:bg-[var(--accent-50)] rounded-xl transition-colors"
            >
              Refresh Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPIItem = ({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) => {
  const colors: any = {
    blue: 'bg-[var(--accent-50)] text-[var(--accent-600)]',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-amber-50 text-amber-600',
    purple: 'bg-rose-50 text-rose-600',
  };

  const trendPositive = String(trend).startsWith('+') || String(trend) === '0%';

  return (
    <div className="panel-surface rounded-[1.35rem] p-5 md:p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <p className="ui-label text-[var(--color-text-soft)]">{label}</p>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${
            trendPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {trend}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <h3 className="font-heading ui-metric text-[var(--color-text)]">{value}</h3>
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
    <div className="flex justify-between text-[0.86rem] font-semibold">
      <span className="text-[var(--color-text-soft)] leading-6">{name}</span>
      <span className="text-[var(--color-text)] leading-6">{value}%</span>
    </div>
    <div className="w-full bg-[var(--surface-3)] rounded-full h-2">
      <div className="bg-[var(--accent-600)] h-2 rounded-full" style={{ width: `${value}%` }} />
    </div>
  </div>
);

export default Dashboard;
