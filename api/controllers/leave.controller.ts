import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { daysBetween } from '../lib/date-utils';
import { getLeaveRequestModel } from '../models/LeaveRequest';
import { getOrganizationSettingsModel } from '../models/OrganizationSettings';
import { resolveTenantOrFail } from './shared';

const isPrivilegedRole = (role: string) => role === 'Admin' || role === 'HR';

export const getLeaves = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const userId = String(req.query.userId || '').trim();
  const role = String(req.query.role || 'Employee');

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const LeaveRequest = getLeaveRequestModel(tenantConnection);
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);

  const query: any = { organizationId };
  if (!isPrivilegedRole(role)) {
    query.userId = userId;
  }

  const requests = await (LeaveRequest as any).find(query).sort({ createdAt: -1 });
  const settingsDoc = await (OrganizationSettings as any).findOne({ organizationId });
  const leavePolicy = settingsDoc?.leavePolicy || {
    annual: 0,
    sick: 0,
    casual: 0,
    maternity: 0,
  };

  const ownApproved = await (LeaveRequest as any).find({
    organizationId,
    userId,
    status: 'Approved',
  });

  const usedByType = {
    annual: 0,
    sick: 0,
    casual: 0,
    maternity: 0,
  };

  ownApproved.forEach((requestItem: any) => {
    const days = daysBetween(requestItem.startDate, requestItem.endDate);
    const key = String(requestItem.type || '').toLowerCase();
    if (key === 'annual') usedByType.annual += days;
    if (key === 'sick') usedByType.sick += days;
    if (key === 'casual') usedByType.casual += days;
    if (key === 'maternity') usedByType.maternity += days;
  });

  res.status(200).json({
    requests,
    balances: [
      {
        key: 'annual',
        label: 'Annual Leave',
        total: Number(leavePolicy.annual || 0),
        used: usedByType.annual,
        remaining: Math.max(0, Number(leavePolicy.annual || 0) - usedByType.annual),
      },
      {
        key: 'sick',
        label: 'Sick Leave',
        total: Number(leavePolicy.sick || 0),
        used: usedByType.sick,
        remaining: Math.max(0, Number(leavePolicy.sick || 0) - usedByType.sick),
      },
      {
        key: 'casual',
        label: 'Casual Leave',
        total: Number(leavePolicy.casual || 0),
        used: usedByType.casual,
        remaining: Math.max(0, Number(leavePolicy.casual || 0) - usedByType.casual),
      },
      {
        key: 'maternity',
        label: 'Maternity/Paternity',
        total: Number(leavePolicy.maternity || 0),
        used: usedByType.maternity,
        remaining: Math.max(0, Number(leavePolicy.maternity || 0) - usedByType.maternity),
      },
    ],
  });
};

export const createLeave = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const {
    userId,
    userName,
    userRole,
    type,
    startDate,
    endDate,
    reason,
  } = (req.body || {}) as Record<string, unknown>;

  if (!userId || !userName || !type || !startDate || !endDate || !reason) {
    res.status(400).json({
      message: 'organizationId, userId, userName, type, startDate, endDate, and reason are required',
    });
    return;
  }

  const startMs = new Date(`${String(startDate)}T00:00:00`).getTime();
  const endMs = new Date(`${String(endDate)}T00:00:00`).getTime();
  if (endMs < startMs) {
    res.status(400).json({ message: 'endDate cannot be earlier than startDate' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const LeaveRequest = getLeaveRequestModel(tenantConnection);

  const created = await (LeaveRequest as any).create({
    organizationId,
    userId,
    userName,
    userRole: userRole || 'Employee',
    type,
    startDate,
    endDate,
    reason,
    status: 'Pending',
  });

  res.status(201).json({ request: created, message: 'Leave request submitted successfully' });
};

export const updateLeave = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requestId = String(req.params.requestId || '').trim();
  if (!requestId || !Types.ObjectId.isValid(requestId)) {
    res.status(400).json({ message: 'Valid leave request id is required' });
    return;
  }

  const {
    type,
    startDate,
    endDate,
    reason,
    status,
    actionByUserId,
    actionByName,
    actionNote,
  } = (req.body || {}) as Record<string, unknown>;

  if (startDate && endDate) {
    const startMs = new Date(`${String(startDate)}T00:00:00`).getTime();
    const endMs = new Date(`${String(endDate)}T00:00:00`).getTime();
    if (endMs < startMs) {
      res.status(400).json({ message: 'endDate cannot be earlier than startDate' });
      return;
    }
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const LeaveRequest = getLeaveRequestModel(tenantConnection);

  const updatePayload: Record<string, unknown> = {};
  if (typeof type === 'string') updatePayload.type = type;
  if (typeof startDate === 'string') updatePayload.startDate = startDate;
  if (typeof endDate === 'string') updatePayload.endDate = endDate;
  if (typeof reason === 'string') updatePayload.reason = reason;
  if (typeof status === 'string') updatePayload.status = status;
  if (typeof actionByUserId === 'string' && actionByUserId.trim()) {
    updatePayload.actionByUserId = actionByUserId;
  }
  if (typeof actionByName === 'string') updatePayload.actionByName = actionByName;
  if (typeof actionNote === 'string') updatePayload.actionNote = actionNote;

  const updated = await (LeaveRequest as any).findOneAndUpdate(
    { _id: requestId, organizationId },
    { $set: updatePayload },
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ message: 'Leave request not found' });
    return;
  }

  res.status(200).json({ request: updated, message: 'Leave request updated successfully' });
};

export const deleteLeave = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requestId = String(req.params.requestId || '').trim();
  if (!requestId || !Types.ObjectId.isValid(requestId)) {
    res.status(400).json({ message: 'Valid leave request id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const LeaveRequest = getLeaveRequestModel(tenantConnection);

  const deleted = await (LeaveRequest as any).findOneAndDelete({
    _id: requestId,
    organizationId,
  });
  if (!deleted) {
    res.status(404).json({ message: 'Leave request not found' });
    return;
  }

  res.status(200).json({ message: 'Leave request deleted successfully' });
};

