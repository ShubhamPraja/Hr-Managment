import type { Request, Response } from 'express';
import { getAttendanceModel } from '../models/Attendance';
import { getLeaveRequestModel } from '../models/LeaveRequest';
import { getOrganizationSettingsModel } from '../models/OrganizationSettings';
import { getRecruitmentRequisitionModel } from '../models/RecruitmentRequisition';
import { getUserModel } from '../models/User';
import { toDateKey } from '../lib/date-utils';
import { resolveTenantOrFail } from './shared';

const TARGET_SHIFT_MINUTES = 9 * 60;

const toAttendancePercent = (durationMinutes: number) => {
  const safeMinutes = Math.max(0, Number(durationMinutes || 0));
  return Math.min(100, Math.round((safeMinutes / TARGET_SHIFT_MINUTES) * 1000) / 10);
};

export const getDashboard = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const role = String(req.query.role || 'Employee').trim();
  const userId = String(req.query.userId || '').trim();
  const isAdmin = role === 'Admin';

  if (!isAdmin && !userId) {
    res.status(400).json({ message: 'userId is required for non-admin dashboard scope' });
    return;
  }

  const { tenantConnection } = tenantScope;

  const User = getUserModel(tenantConnection);
  const Attendance = getAttendanceModel(tenantConnection);
  const LeaveRequest = getLeaveRequestModel(tenantConnection);
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const userQuery: Record<string, unknown> = { organizationId };
  if (!isAdmin) {
    userQuery._id = userId;
  }

  const users = await (User as any).find(userQuery).select('-password');
  const activeWorkforce = users.length;

  const scopedAttendanceQuery: Record<string, unknown> = { organizationId };
  const scopedLeaveQuery: Record<string, unknown> = { organizationId };
  if (!isAdmin) {
    scopedAttendanceQuery.userId = userId;
    scopedLeaveQuery.userId = userId;
  }

  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const todayAttendanceRecords = await (Attendance as any).find({
    ...scopedAttendanceQuery,
    dateKey: todayKey,
  });
  const yesterdayAttendanceRecords = await (Attendance as any).find({
    ...scopedAttendanceQuery,
    dateKey: yesterdayKey,
  });

  const getDayAttendancePct = (records: any[]) => {
    if (activeWorkforce <= 0) return 0;
    const totalPct = records.reduce(
      (sum, record) => sum + toAttendancePercent(Number(record?.durationMinutes || 0)),
      0
    );
    return Math.round((totalPct / activeWorkforce) * 10) / 10;
  };

  const dailyAttendancePct = getDayAttendancePct(todayAttendanceRecords);
  const yesterdayAttendancePct = getDayAttendancePct(yesterdayAttendanceRecords);

  const pendingLeaves = await (LeaveRequest as any).countDocuments({
    ...scopedLeaveQuery,
    status: 'Pending',
  });
  const todayLeaveStarts = await (LeaveRequest as any).countDocuments({
    ...scopedLeaveQuery,
    startDate: todayKey,
  });
  const yesterdayLeaveStarts = await (LeaveRequest as any).countDocuments({
    ...scopedLeaveQuery,
    startDate: yesterdayKey,
  });

  const settingsDoc = await (OrganizationSettings as any).findOne({ organizationId });
  const openRequisitions = await (RecruitmentRequisition as any)
    .find({ organizationId, status: 'Open' })
    .select('openings candidates.stage');
  const openPositionsFromRecruitment = openRequisitions.reduce((sum: number, requisition: any) => {
    const openings = Math.max(1, Number(requisition?.openings || 1));
    const hiredCount = Array.isArray(requisition?.candidates)
      ? requisition.candidates.filter((candidate: any) => String(candidate?.stage || '') === 'Hired').length
      : 0;
    return sum + Math.max(0, openings - hiredCount);
  }, 0);
  const openPositionsFromSettings = Math.max(0, Number(settingsDoc?.openPositions || 0));
  const openPositions = openRequisitions.length > 0
    ? openPositionsFromRecruitment
    : openPositionsFromSettings;

  const usersCreatedLast30 = isAdmin
    ? await (User as any).countDocuments({
      organizationId,
      createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) },
    })
    : 0;
  const usersCreatedPrev30 = isAdmin
    ? await (User as any).countDocuments({
      organizationId,
      createdAt: {
        $gte: new Date(now.getTime() - 60 * 86400000),
        $lt: new Date(now.getTime() - 30 * 86400000),
      },
    })
    : 0;

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
    ...scopedAttendanceQuery,
    dateKey: { $in: recentDateKeys },
  });
  const attendancePctByDate: Record<string, number> = {};
  recentAttendance.forEach((entry: any) => {
    attendancePctByDate[entry.dateKey] = (attendancePctByDate[entry.dateKey] || 0)
      + toAttendancePercent(Number(entry?.durationMinutes || 0));
  });

  const recentLeaves = await (LeaveRequest as any).find({
    ...scopedLeaveQuery,
    startDate: { $in: recentDateKeys },
  });
  const leaveCountByDate: Record<string, number> = {};
  recentLeaves.forEach((entry: any) => {
    leaveCountByDate[entry.startDate] = (leaveCountByDate[entry.startDate] || 0) + 1;
  });

  const chart = recentDateKeys.map((key) => {
    const date = new Date(`${key}T00:00:00`);
    const dayTotalPct = attendancePctByDate[key] || 0;
    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      attendance: activeWorkforce > 0
        ? Math.round((dayTotalPct / activeWorkforce) * 10) / 10
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
      activeWorkforceTrend: isAdmin ? asTrend(usersCreatedLast30, usersCreatedPrev30) : '0%',
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
