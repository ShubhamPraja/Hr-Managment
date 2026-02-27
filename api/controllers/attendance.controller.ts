import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { getAttendanceModel } from '../models/Attendance';
import { toDateKey } from '../lib/date-utils';
import { resolveTenantOrFail, toNumber } from './shared';

export const getAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const userId = String(req.query.userId || '').trim();
  const month = String(req.query.month || '').trim();

  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const query: any = { organizationId };
  if (userId) query.userId = userId;
  if (month) query.dateKey = { $regex: `^${month}` };

  const records = await (Attendance as any).find(query).sort({ dateKey: -1, createdAt: -1 });

  const summary = records.reduce(
    (acc: any, record: any) => {
      acc.totalDays += 1;
      if (record.punchInAt) acc.punchedInDays += 1;
      if (record.punchOutAt) acc.completedDays += 1;
      if (record.punchInAt && !record.punchOutAt) acc.inProgressDays += 1;
      acc.totalMinutes += Number(record.durationMinutes || 0);
      return acc;
    },
    { totalDays: 0, punchedInDays: 0, completedDays: 0, inProgressDays: 0, totalMinutes: 0 }
  );

  res.status(200).json({ records, summary });
};

export const punchInAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const {
    userId,
    userName,
    userEmail,
    status,
  } = (req.body || {}) as Record<string, unknown>;

  if (!userId || !userName || !userEmail) {
    res.status(400).json({ message: 'organizationId, userId, userName, and userEmail are required' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const now = new Date();
  const dateKey = toDateKey(now);
  const existing = await (Attendance as any).findOne({ organizationId, userId, dateKey });

  if (existing && !existing.punchOutAt) {
    res.status(409).json({ message: 'You are already punched in for today' });
    return;
  }

  if (existing && existing.punchOutAt) {
    res.status(409).json({ message: 'You have already completed punch out for today' });
    return;
  }

  const created = await (Attendance as any).create({
    organizationId,
    userId,
    userName,
    userEmail: String(userEmail).toLowerCase().trim(),
    dateKey,
    punchInAt: now,
    status: status || 'Present',
  });

  res.status(201).json({
    record: created,
    message: `Punch in successful at ${now.toLocaleTimeString()}`,
  });
};

export const punchOutAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const { userId } = (req.body || {}) as Record<string, unknown>;

  if (!userId) {
    res.status(400).json({ message: 'organizationId and userId are required' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const now = new Date();
  const dateKey = toDateKey(now);
  const todayRecord = await (Attendance as any).findOne({ organizationId, userId, dateKey });

  if (!todayRecord) {
    res.status(404).json({ message: 'No punch in found for today. Please punch in first.' });
    return;
  }

  if (todayRecord.punchOutAt) {
    res.status(409).json({ message: 'You have already punched out for today' });
    return;
  }

  todayRecord.punchOutAt = now;
  todayRecord.durationMinutes = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(todayRecord.punchInAt).getTime()) / 60000)
  );
  await todayRecord.save();

  res.status(200).json({
    record: todayRecord,
    message: `Punch out successful at ${now.toLocaleTimeString()}`,
  });
};

export const createAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const {
    userId,
    userName,
    userEmail,
    status,
    punchInAt,
    punchOutAt,
    dateKey,
    durationMinutes,
  } = (req.body || {}) as Record<string, unknown>;

  if (!userId || !userName || !userEmail) {
    res.status(400).json({
      message: 'organizationId, userId, userName, and userEmail are required',
    });
    return;
  }

  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const punchInDate = punchInAt ? new Date(String(punchInAt)) : new Date();
  const resolvedDateKey = String(dateKey || toDateKey(punchInDate));

  const existing = await (Attendance as any).findOne({
    organizationId,
    userId,
    dateKey: resolvedDateKey,
  });
  if (existing) {
    res.status(409).json({ message: 'Attendance record already exists for this user and date' });
    return;
  }

  const punchOutDate = punchOutAt ? new Date(String(punchOutAt)) : null;
  const computedDuration = punchOutDate
    ? Math.max(0, Math.round((punchOutDate.getTime() - punchInDate.getTime()) / 60000))
    : toNumber(durationMinutes, 0);

  const created = await (Attendance as any).create({
    organizationId,
    userId,
    userName,
    userEmail: String(userEmail).toLowerCase().trim(),
    dateKey: resolvedDateKey,
    punchInAt: punchInDate,
    punchOutAt: punchOutDate,
    durationMinutes: computedDuration,
    status: status || 'Present',
  });

  res.status(201).json({ record: created, message: 'Attendance record created successfully' });
};

export const updateAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = String(req.params.recordId || '').trim();
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid attendance record id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const record = await (Attendance as any).findOne({ _id: recordId, organizationId });
  if (!record) {
    res.status(404).json({ message: 'Attendance record not found' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;

  if (typeof body.userName === 'string') record.userName = body.userName;
  if (typeof body.userEmail === 'string') record.userEmail = body.userEmail.toLowerCase().trim();
  if (typeof body.status === 'string') record.status = body.status;
  if (typeof body.dateKey === 'string') record.dateKey = body.dateKey;
  if (typeof body.punchInAt === 'string') record.punchInAt = new Date(body.punchInAt);
  if (typeof body.punchOutAt === 'string') record.punchOutAt = new Date(body.punchOutAt);
  if (body.punchOutAt === null) record.punchOutAt = null;

  if (typeof body.durationMinutes === 'number') {
    record.durationMinutes = body.durationMinutes;
  } else if (record.punchInAt && record.punchOutAt) {
    record.durationMinutes = Math.max(
      0,
      Math.round(
        (new Date(record.punchOutAt).getTime() - new Date(record.punchInAt).getTime()) / 60000
      )
    );
  } else if (!record.punchOutAt) {
    record.durationMinutes = 0;
  }

  await record.save();
  res.status(200).json({ record, message: 'Attendance record updated successfully' });
};

export const deleteAttendance = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = String(req.params.recordId || '').trim();
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid attendance record id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const Attendance = getAttendanceModel(tenantConnection);

  const deleted = await (Attendance as any).findOneAndDelete({
    _id: recordId,
    organizationId,
  });
  if (!deleted) {
    res.status(404).json({ message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ message: 'Attendance record deleted successfully' });
};

