import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { getOnboardingRecordModel } from '../models/OnboardingRecord';
import { resolveTenantOrFail } from './shared';

const onboardingStatuses = ['Planned', 'In Progress', 'Completed', 'On Hold', 'Cancelled'] as const;

const toCleanString = (value: unknown) => String(value || '').trim();
const toPositiveInt = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const canManageOnboarding = (role: string) => role === 'Admin' || role === 'HR';

const parseStartDateInfo = (value: unknown) => {
  const raw = toCleanString(value);
  if (!raw) return null;

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  return { startDate: raw, startYear: year, startMonth: month, startMonthKey: monthKey };
};

const normalizeStatus = (value: unknown) => {
  const cleanValue = toCleanString(value);
  return onboardingStatuses.includes(cleanValue as any) ? cleanValue : '';
};

const normalizeChecklist = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          const title = toCleanString(item);
          if (!title) return null;
          return { title, isDone: false, completedAt: null };
        }
        if (item && typeof item === 'object') {
          const source = item as Record<string, unknown>;
          const title = toCleanString(source.title);
          if (!title) return null;
          const isDone = Boolean(source.isDone);
          return {
            title,
            isDone,
            completedAt: isDone ? new Date() : null,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  const raw = toCleanString(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => toCleanString(item))
    .filter(Boolean)
    .map((title) => ({ title, isDone: false, completedAt: null }));
};

const sanitizeRecord = (record: any) => {
  const checklist = Array.isArray(record?.checklist)
    ? record.checklist.map((task: any) => ({
        _id: task?._id,
        title: task?.title || '',
        isDone: Boolean(task?.isDone),
        completedAt: task?.completedAt || null,
      }))
    : [];

  const totalTasks = checklist.length;
  const completedTasks = checklist.filter((task: any) => task.isDone).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    _id: record?._id,
    organizationId: record?.organizationId,
    employeeName: record?.employeeName || '',
    employeeEmail: record?.employeeEmail || '',
    employeeCode: record?.employeeCode || '',
    department: record?.department || '',
    designation: record?.designation || '',
    managerName: record?.managerName || '',
    location: record?.location || '',
    startDate: record?.startDate || '',
    expectedEndDate: record?.expectedEndDate || '',
    completedAt: record?.completedAt || null,
    status: normalizeStatus(record?.status) || 'Planned',
    notes: record?.notes || '',
    checklist,
    startYear: Number(record?.startYear || 0),
    startMonth: Number(record?.startMonth || 0),
    startMonthKey: record?.startMonthKey || '',
    createdByUserId: record?.createdByUserId || null,
    createdByName: record?.createdByName || '',
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
    totalTasks,
    completedTasks,
    progressPercent,
  };
};

const monthlyBreakdown = (records: ReturnType<typeof sanitizeRecord>[]) => {
  const bucket = new Map<
    string,
    { monthKey: string; total: number; completed: number; inProgress: number; planned: number }
  >();

  records.forEach((record) => {
    const key = record.startMonthKey || 'Unknown';
    if (!bucket.has(key)) {
      bucket.set(key, { monthKey: key, total: 0, completed: 0, inProgress: 0, planned: 0 });
    }

    const row = bucket.get(key)!;
    row.total += 1;
    if (record.status === 'Completed') row.completed += 1;
    if (record.status === 'In Progress') row.inProgress += 1;
    if (record.status === 'Planned') row.planned += 1;
  });

  return [...bucket.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

export const getOnboarding = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const role = toCleanString(req.query.role || 'Employee');
  if (!canManageOnboarding(role)) {
    res.status(403).json({ message: 'Only Admin and HR can access onboarding records' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const query: Record<string, unknown> = { organizationId };

  const filterYear = toPositiveInt(req.query.year, 0);
  if (filterYear > 0) query.startYear = filterYear;

  const filterMonth = toPositiveInt(req.query.month, 0);
  if (filterMonth >= 1 && filterMonth <= 12) query.startMonth = filterMonth;

  const status = normalizeStatus(req.query.status);
  if (status) query.status = status;

  const search = toCleanString(req.query.search).toLowerCase();

  const { tenantConnection } = tenantScope;
  const OnboardingRecord = getOnboardingRecordModel(tenantConnection);
  let records = await (OnboardingRecord as any).find(query).sort({ startDate: -1, createdAt: -1 });

  if (search) {
    records = records.filter((item: any) => {
      return (
        String(item.employeeName || '').toLowerCase().includes(search) ||
        String(item.employeeEmail || '').toLowerCase().includes(search) ||
        String(item.department || '').toLowerCase().includes(search) ||
        String(item.designation || '').toLowerCase().includes(search) ||
        String(item.managerName || '').toLowerCase().includes(search)
      );
    });
  }

  const data = records.map(sanitizeRecord);
  const summary = {
    total: data.length,
    completed: data.filter((item) => item.status === 'Completed').length,
    inProgress: data.filter((item) => item.status === 'In Progress').length,
    planned: data.filter((item) => item.status === 'Planned').length,
    completionRate:
      data.length > 0
        ? Math.round((data.filter((item) => item.status === 'Completed').length / data.length) * 100)
        : 0,
  };

  res.status(200).json({
    records: data,
    summary,
    monthlyBreakdown: monthlyBreakdown(data),
  });
};

export const createOnboarding = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const role = toCleanString(body.creatorRole || 'Employee');
  if (!canManageOnboarding(role)) {
    res.status(403).json({ message: 'Only Admin and HR can create onboarding records' });
    return;
  }

  const employeeName = toCleanString(body.employeeName);
  const employeeEmail = toCleanString(body.employeeEmail).toLowerCase();
  const department = toCleanString(body.department);
  const startDateInfo = parseStartDateInfo(body.startDate);
  const creatorUserId = toCleanString(body.creatorUserId);
  const creatorName = toCleanString(body.creatorName);

  if (!employeeName || !employeeEmail || !department || !startDateInfo || !creatorUserId || !creatorName) {
    res.status(400).json({
      message: 'employeeName, employeeEmail, department, startDate, creatorUserId and creatorName are required',
    });
    return;
  }

  if (!Types.ObjectId.isValid(creatorUserId)) {
    res.status(400).json({ message: 'Valid creatorUserId is required' });
    return;
  }

  const expectedEndDate = toCleanString(body.expectedEndDate);
  if (expectedEndDate) {
    const startMs = new Date(`${startDateInfo.startDate}T00:00:00`).getTime();
    const endMs = new Date(`${expectedEndDate}T00:00:00`).getTime();
    if (Number.isNaN(endMs) || endMs < startMs) {
      res.status(400).json({ message: 'expectedEndDate cannot be earlier than startDate' });
      return;
    }
  }

  const status = normalizeStatus(body.status) || 'Planned';
  const checklist = normalizeChecklist(body.checklist);

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const OnboardingRecord = getOnboardingRecordModel(tenantConnection);

  const created = await (OnboardingRecord as any).create({
    organizationId,
    employeeName,
    employeeEmail,
    employeeCode: toCleanString(body.employeeCode).toUpperCase(),
    department,
    designation: toCleanString(body.designation),
    managerName: toCleanString(body.managerName),
    location: toCleanString(body.location),
    startDate: startDateInfo.startDate,
    startYear: startDateInfo.startYear,
    startMonth: startDateInfo.startMonth,
    startMonthKey: startDateInfo.startMonthKey,
    expectedEndDate,
    status,
    completedAt: status === 'Completed' ? new Date() : null,
    notes: toCleanString(body.notes),
    checklist,
    createdByUserId: creatorUserId,
    createdByName: creatorName,
  });

  res.status(201).json({
    record: sanitizeRecord(created),
    message: 'Onboarding record created successfully',
  });
};

export const updateOnboarding = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = toCleanString(req.params.recordId);
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid onboarding record id is required' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const role = toCleanString(body.actorRole || body.creatorRole || 'Employee');
  if (!canManageOnboarding(role)) {
    res.status(403).json({ message: 'Only Admin and HR can update onboarding records' });
    return;
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof body.employeeName === 'string') updatePayload.employeeName = toCleanString(body.employeeName);
  if (typeof body.employeeEmail === 'string') updatePayload.employeeEmail = toCleanString(body.employeeEmail).toLowerCase();
  if (typeof body.employeeCode === 'string') updatePayload.employeeCode = toCleanString(body.employeeCode).toUpperCase();
  if (typeof body.department === 'string') updatePayload.department = toCleanString(body.department);
  if (typeof body.designation === 'string') updatePayload.designation = toCleanString(body.designation);
  if (typeof body.managerName === 'string') updatePayload.managerName = toCleanString(body.managerName);
  if (typeof body.location === 'string') updatePayload.location = toCleanString(body.location);
  if (typeof body.notes === 'string') updatePayload.notes = toCleanString(body.notes);
  if (body.checklist !== undefined) updatePayload.checklist = normalizeChecklist(body.checklist);

  if (body.startDate !== undefined) {
    const startDateInfo = parseStartDateInfo(body.startDate);
    if (!startDateInfo) {
      res.status(400).json({ message: 'Valid startDate is required' });
      return;
    }
    updatePayload.startDate = startDateInfo.startDate;
    updatePayload.startYear = startDateInfo.startYear;
    updatePayload.startMonth = startDateInfo.startMonth;
    updatePayload.startMonthKey = startDateInfo.startMonthKey;
  }

  if (body.expectedEndDate !== undefined) {
    updatePayload.expectedEndDate = toCleanString(body.expectedEndDate);
  }

  const status = normalizeStatus(body.status);
  if (status) {
    updatePayload.status = status;
    updatePayload.completedAt = status === 'Completed' ? new Date() : null;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const OnboardingRecord = getOnboardingRecordModel(tenantConnection);

  const existing = await (OnboardingRecord as any).findOne({ _id: recordId, organizationId });
  if (!existing) {
    res.status(404).json({ message: 'Onboarding record not found' });
    return;
  }

  const nextStartDate = String(updatePayload.startDate || existing.startDate || '');
  const nextExpectedEndDate = String(updatePayload.expectedEndDate || existing.expectedEndDate || '');

  if (nextExpectedEndDate) {
    const startMs = new Date(`${nextStartDate}T00:00:00`).getTime();
    const endMs = new Date(`${nextExpectedEndDate}T00:00:00`).getTime();
    if (Number.isNaN(endMs) || endMs < startMs) {
      res.status(400).json({ message: 'expectedEndDate cannot be earlier than startDate' });
      return;
    }
  }

  const updated = await (OnboardingRecord as any).findOneAndUpdate(
    { _id: recordId, organizationId },
    { $set: updatePayload },
    { new: true }
  );

  res.status(200).json({
    record: sanitizeRecord(updated),
    message: 'Onboarding record updated successfully',
  });
};

export const deleteOnboarding = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = toCleanString(req.params.recordId);
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid onboarding record id is required' });
    return;
  }

  const role = toCleanString(req.query.actorRole || (req.body || {}).actorRole || 'Employee');
  if (!canManageOnboarding(role)) {
    res.status(403).json({ message: 'Only Admin and HR can delete onboarding records' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const OnboardingRecord = getOnboardingRecordModel(tenantConnection);

  const deleted = await (OnboardingRecord as any).findOneAndDelete({
    _id: recordId,
    organizationId,
  });
  if (!deleted) {
    res.status(404).json({ message: 'Onboarding record not found' });
    return;
  }

  res.status(200).json({ message: 'Onboarding record deleted successfully' });
};

