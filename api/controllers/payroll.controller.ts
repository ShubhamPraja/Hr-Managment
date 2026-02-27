import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { toMonthKey, toMonthLabel } from '../lib/date-utils';
import { getPayrollRecordModel } from '../models/PayrollRecord';
import { getUserModel } from '../models/User';
import { resolveTenantOrFail, toNumber } from './shared';

const parseMonthDate = (monthKey: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const monthDate = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(monthDate.getTime())) return null;
  return monthDate;
};

export const getPayroll = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const PayrollRecord = getPayrollRecordModel(tenantConnection);
  const User = getUserModel(tenantConnection);

  const user = await (User as any).findById(userId).select('name');
  if (!user) {
    res.status(404).json({ message: 'User not found in organization' });
    return;
  }

  let records = await (PayrollRecord as any)
    .find({ organizationId, userId })
    .sort({ monthKey: -1, createdAt: -1 });

  if (records.length === 0) {
    const now = new Date();
    await (PayrollRecord as any).create({
      organizationId,
      userId,
      userName: user.name,
      monthKey: toMonthKey(now),
      monthLabel: toMonthLabel(now),
      basic: 0,
      allowances: 0,
      deductions: 0,
      netPay: 0,
      status: 'Pending',
      processedAt: null,
    });

    records = await (PayrollRecord as any)
      .find({ organizationId, userId })
      .sort({ monthKey: -1, createdAt: -1 });
  }

  const latest = records[0] || null;
  res.status(200).json({ records, latest });
};

export const createPayroll = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const body = (req.body || {}) as Record<string, unknown>;
  const userId = String(body.userId || '').trim();
  if (!userId) {
    res.status(400).json({ message: 'organizationId and userId are required' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const PayrollRecord = getPayrollRecordModel(tenantConnection);
  const User = getUserModel(tenantConnection);

  const userDoc = await (User as any).findById(userId).select('name');
  if (!userDoc) {
    res.status(404).json({ message: 'User not found in organization' });
    return;
  }

  const monthKeyRaw = String(body.monthKey || '').trim();
  const monthDate = monthKeyRaw ? parseMonthDate(monthKeyRaw) : new Date();
  if (!monthDate) {
    res.status(400).json({ message: 'monthKey must be in YYYY-MM format' });
    return;
  }

  const basic = toNumber(body.basic, 0);
  const allowances = toNumber(body.allowances, 0);
  const deductions = toNumber(body.deductions, 0);
  const netPay = toNumber(body.netPay, basic + allowances - deductions);

  const resolvedMonthKey = monthKeyRaw || toMonthKey(monthDate);
  const resolvedMonthLabel = String(body.monthLabel || toMonthLabel(monthDate));
  const status = String(body.status || 'Pending') as 'Processed' | 'Pending';
  const processedAt = status === 'Processed' ? new Date() : null;

  const created = await (PayrollRecord as any).create({
    organizationId,
    userId,
    userName: String(body.userName || userDoc.name),
    monthKey: resolvedMonthKey,
    monthLabel: resolvedMonthLabel,
    basic,
    allowances,
    deductions,
    netPay,
    status,
    processedAt,
  });

  res.status(201).json({ record: created, message: 'Payroll record created successfully' });
};

export const updatePayroll = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = String(req.params.recordId || '').trim();
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid payroll record id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const PayrollRecord = getPayrollRecordModel(tenantConnection);

  const record = await (PayrollRecord as any).findOne({ _id: recordId, organizationId });
  if (!record) {
    res.status(404).json({ message: 'Payroll record not found' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  if (typeof body.userName === 'string') record.userName = body.userName;
  if (typeof body.monthLabel === 'string') record.monthLabel = body.monthLabel;

  if (typeof body.monthKey === 'string') {
    const parsedMonth = parseMonthDate(body.monthKey);
    if (!parsedMonth) {
      res.status(400).json({ message: 'monthKey must be in YYYY-MM format' });
      return;
    }
    record.monthKey = body.monthKey;
    if (typeof body.monthLabel !== 'string') {
      record.monthLabel = toMonthLabel(parsedMonth);
    }
  }

  if (typeof body.basic === 'number') record.basic = body.basic;
  if (typeof body.allowances === 'number') record.allowances = body.allowances;
  if (typeof body.deductions === 'number') record.deductions = body.deductions;

  if (typeof body.netPay === 'number') {
    record.netPay = body.netPay;
  } else {
    record.netPay = Number(record.basic || 0) + Number(record.allowances || 0) - Number(record.deductions || 0);
  }

  if (typeof body.status === 'string') {
    record.status = body.status;
    if (body.status === 'Processed') {
      record.processedAt = record.processedAt || new Date();
    } else {
      record.processedAt = null;
    }
  }

  if (typeof body.processedAt === 'string') {
    record.processedAt = new Date(body.processedAt);
  }
  if (body.processedAt === null) {
    record.processedAt = null;
  }

  await record.save();
  res.status(200).json({ record, message: 'Payroll record updated successfully' });
};

export const deletePayroll = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const recordId = String(req.params.recordId || '').trim();
  if (!recordId || !Types.ObjectId.isValid(recordId)) {
    res.status(400).json({ message: 'Valid payroll record id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const PayrollRecord = getPayrollRecordModel(tenantConnection);

  const deleted = await (PayrollRecord as any).findOneAndDelete({
    _id: recordId,
    organizationId,
  });
  if (!deleted) {
    res.status(404).json({ message: 'Payroll record not found' });
    return;
  }

  res.status(200).json({ message: 'Payroll record deleted successfully' });
};
