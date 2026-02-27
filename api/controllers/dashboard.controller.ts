import type { Request, Response } from 'express';
import { getAttendanceModel } from '../models/Attendance';
import { getLeaveRequestModel } from '../models/LeaveRequest';
import { getOrganizationSettingsModel } from '../models/OrganizationSettings';
import { getUserModel } from '../models/User';
import { toDateKey } from '../lib/date-utils';
import { resolveTenantOrFail } from './shared';

export const getDashboard = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;

  const User = getUserModel(tenantConnection);
  const Attendance = getAttendanceModel(tenantConnection);
  const LeaveRequest = getLeaveRequestModel(tenantConnection);
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);

  const users = await (User as any).find({ organizationId }).select('-password');
  const activeWorkforce = users.length;

  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const todayAttendanceCount = await (Attendance as any).countDocuments({
    organizationId,
    dateKey: todayKey,
  });
  const yesterdayAttendanceCount = await (Attendance as any).countDocuments({
    organizationId,
    dateKey: yesterdayKey,
  });

  const dailyAttendancePct = activeWorkforce > 0
    ? Math.round((todayAttendanceCount / activeWorkforce) * 1000) / 10
    : 0;
  const yesterdayAttendancePct = activeWorkforce > 0
    ? Math.round((yesterdayAttendanceCount / activeWorkforce) * 1000) / 10
    : 0;

  const pendingLeaves = await (LeaveRequest as any).countDocuments({
    organizationId,
    status: 'Pending',
  });
  const todayLeaveStarts = await (LeaveRequest as any).countDocuments({
    organizationId,
    startDate: todayKey,
  });
  const yesterdayLeaveStarts = await (LeaveRequest as any).countDocuments({
    organizationId,
    startDate: yesterdayKey,
  });

  const settingsDoc = await (OrganizationSettings as any).findOne({ organizationId });
  const openPositions = Number(settingsDoc?.openPositions || 0);

  const usersCreatedLast30 = await (User as any).countDocuments({
    organizationId,
    createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) },
  });
  const usersCreatedPrev30 = await (User as any).countDocuments({
    organizationId,
    createdAt: {
      $gte: new Date(now.getTime() - 60 * 86400000),
      $lt: new Date(now.getTime() - 30 * 86400000),
    },
  });

  const asTrend = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return '0%';
    if (previous === 0 && current > 0) return '+100%';
    const pct = Math.round(((current - previous) / previous) * 1000) / 10;
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  };

  const recentDateKeys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    recentDateKeys.push(toDateKey(date));
  }

  const recentAttendance = await (Attendance as any).find({
    organizationId,
    dateKey: { $in: recentDateKeys },
  });
  const attendanceCountByDate: Record<string, number> = {};
  recentAttendance.forEach((entry: any) => {
    attendanceCountByDate[entry.dateKey] = (attendanceCountByDate[entry.dateKey] || 0) + 1;
  });

  const recentLeaves = await (LeaveRequest as any).find({
    organizationId,
    startDate: { $in: recentDateKeys },
  });
  const leaveCountByDate: Record<string, number> = {};
  recentLeaves.forEach((entry: any) => {
    leaveCountByDate[entry.startDate] = (leaveCountByDate[entry.startDate] || 0) + 1;
  });

  const chart = recentDateKeys.map((key) => {
    const date = new Date(`${key}T00:00:00`);
    const count = attendanceCountByDate[key] || 0;
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      attendance: activeWorkforce > 0
        ? Math.round((count / activeWorkforce) * 1000) / 10
        : 0,
      leaves: leaveCountByDate[key] || 0,
    };
  });

  const departmentsMap: Record<string, number> = {};
  users.forEach((user: any) => {
    const dept = user.department || 'General';
    departmentsMap[dept] = (departmentsMap[dept] || 0) + 1;
  });

  const departments = Object.entries(departmentsMap)
    .map(([name, count]) => ({
      name,
      value: activeWorkforce > 0 ? Math.round((count / activeWorkforce) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  res.status(200).json({
    kpis: {
      activeWorkforce,
      activeWorkforceTrend: asTrend(usersCreatedLast30, usersCreatedPrev30),
      dailyAttendance: dailyAttendancePct,
      dailyAttendanceTrend: asTrend(dailyAttendancePct, yesterdayAttendancePct),
      leavesToday: todayLeaveStarts,
      leavesTodayTrend: asTrend(todayLeaveStarts, yesterdayLeaveStarts),
      openPositions,
      openPositionsTrend: '0%',
      pendingLeaves,
    },
    chart,
    departments,
  });
};

