import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { findTenantDatabaseByEmail } from '../lib/mongodb';
import { hashPassword } from '../lib/auth-utils';
import { getUserModel } from '../models/User';
import { resolveTenantOrFail } from './shared';

type SalaryBreakup = {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEmployeeType = (value: unknown) => {
  const cleanValue = String(value || '').trim().toLowerCase();
  if (cleanValue === 'freelancing') return 'Freelancing';
  if (cleanValue === 'part time' || cleanValue === 'part-time' || cleanValue === 'parttime') return 'Part Time';
  if (
    cleanValue === 'on contract' ||
    cleanValue === 'contract' ||
    cleanValue === 'on-contract' ||
    cleanValue === 'contractual'
  ) {
    return 'On Contract';
  }
  return 'Full Time';
};

const normalizeEmployeeCode = (value: unknown) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

const normalizeCountryCode = (value: unknown) => {
  const cleanValue = String(value || '').trim();
  const digits = cleanValue.replace(/\D/g, '');
  if (!digits) return '+1';
  return `+${digits}`;
};

const normalizePhoneNumber = (value: unknown) => String(value || '').replace(/\D/g, '');

const normalizeSalaryBreakup = (value: unknown): SalaryBreakup => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const basic = Math.max(0, toNumber(source.basic, 0));
  const hra = Math.max(0, toNumber(source.hra, 0));
  const allowances = Math.max(0, toNumber(source.allowances, 0));
  const bonus = Math.max(0, toNumber(source.bonus, 0));
  const deductions = Math.max(0, toNumber(source.deductions, 0));
  const grossSalary = basic + hra + allowances + bonus;
  const netSalary = Math.max(0, grossSalary - deductions);

  return {
    basic,
    hra,
    allowances,
    bonus,
    deductions,
    grossSalary,
    netSalary,
  };
};

const generateEmployeeCode = async (User: any, organizationId: unknown) => {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const usersWithCode = await (User as any)
    .find({
      organizationId,
      employeeCode: { $regex: new RegExp(`^${escapedPrefix}`) },
    })
    .select('employeeCode')
    .lean();

  let maxSequence = 0;
  usersWithCode.forEach((item: any) => {
    const code = String(item?.employeeCode || '');
    if (!code.startsWith(prefix)) return;
    const sequence = Number(code.slice(prefix.length));
    if (Number.isInteger(sequence)) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  });

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
};

const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  designation: user.designation,
  organizationId: user.organizationId,
  avatar: user.avatar,
  phoneCountryCode: user.phoneCountryCode || '+1',
  phoneNumber: user.phoneNumber || '',
  mobileNumber: user.phoneNumber ? `${user.phoneCountryCode || '+1'} ${user.phoneNumber}` : '',
  employeeCode: user.employeeCode,
  employeeType: user.employeeType || 'Full Time',
  salaryBreakup: normalizeSalaryBreakup(user.salaryBreakup),
  status: user.status,
  joinDate: user.joinDate,
});

const canManageRole = (actorRole: string, requestedRole: string) => {
  if (actorRole === 'Employee') return false;
  if (actorRole === 'HR') return requestedRole === 'Employee';
  if (actorRole === 'Admin') return ['HR', 'Employee'].includes(requestedRole);
  return false;
};

export const getUsers = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const User = getUserModel(tenantConnection);

  const users = await (User as any).find({ organizationId }).select('-password');
  res.status(200).json({ users: users.map(sanitizeUser) });
};

export const createUser = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const body = (req.body || {}) as Record<string, unknown>;
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const requestedRole = String(body.role || 'Employee');
  const actorRole = String(body.creatorRole || 'Employee');

  if (!name || !email || !password) {
    res.status(400).json({ message: 'name, email, and password are required' });
    return;
  }

  if (!canManageRole(actorRole, requestedRole)) {
    if (actorRole === 'Employee') {
      res.status(403).json({ message: 'Employees are not allowed to create user credentials' });
      return;
    }
    if (actorRole === 'HR') {
      res.status(403).json({ message: 'HR can create Employee credentials only' });
      return;
    }
    res.status(400).json({ message: 'Admin can create HR or Employee credentials only' });
    return;
  }

  const existingEmailDb = await findTenantDatabaseByEmail(email);
  if (existingEmailDb) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const User = getUserModel(tenantConnection);
  const hashedPassword = await hashPassword(password);
  const requestedEmployeeCode = normalizeEmployeeCode(body.employeeCode);

  if (requestedEmployeeCode) {
    const existingCode = await (User as any).findOne({
      organizationId,
      employeeCode: requestedEmployeeCode,
    });
    if (existingCode) {
      res.status(409).json({ message: 'Employee code already exists' });
      return;
    }
  }

  const employeeCode = requestedEmployeeCode || (await generateEmployeeCode(User, organizationId));
  const employeeType = normalizeEmployeeType(body.employeeType);
  const salaryBreakup = normalizeSalaryBreakup(body.salaryBreakup);
  const phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
  const phoneNumber = normalizePhoneNumber(body.phoneNumber);

  if (phoneNumber && (phoneNumber.length < 6 || phoneNumber.length > 15)) {
    res.status(400).json({ message: 'Phone number must be between 6 and 15 digits' });
    return;
  }

  const created = await (User as any).create({
    name,
    email,
    password: hashedPassword,
    organizationId,
    role: requestedRole,
    department: body.department,
    designation: body.designation,
    avatar: body.avatar,
    phoneCountryCode,
    phoneNumber,
    employeeCode,
    employeeType,
    salaryBreakup,
    status: body.status || 'Active',
    joinDate: body.joinDate,
  });

  res.status(201).json({ user: sanitizeUser(created) });
};

export const updateUser = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const userId = String(req.params.userId || '').trim();
  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: 'Valid user id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const body = (req.body || {}) as Record<string, unknown>;
  const actorRole = String(body.creatorRole || body.actorRole || 'Employee');
  const actorUserId = String(body.actorUserId || '').trim();

  if (actorRole === 'Employee') {
    res.status(403).json({ message: 'Employees are not allowed to update user credentials' });
    return;
  }

  const { tenantConnection, dbName } = tenantScope;
  const User = getUserModel(tenantConnection);

  const targetUser = await (User as any).findOne({ _id: userId, organizationId }).select('+password');
  if (!targetUser) {
    res.status(404).json({ message: 'User not found in organization' });
    return;
  }

  if (actorRole === 'HR' && targetUser.role !== 'Employee') {
    res.status(403).json({ message: 'HR can update Employee credentials only' });
    return;
  }

  if (actorUserId && actorUserId === String(targetUser._id) && targetUser.role === 'Admin') {
    if (typeof body.role === 'string' && body.role !== 'Admin') {
      res.status(403).json({ message: 'Admin cannot change own role' });
      return;
    }
  }

  if (typeof body.role === 'string') {
    if (!canManageRole(actorRole, body.role)) {
      res.status(403).json({ message: 'You are not allowed to assign this role' });
      return;
    }
    targetUser.role = body.role;
  }

  if (typeof body.name === 'string') targetUser.name = body.name.trim();
  if (typeof body.department === 'string') targetUser.department = body.department;
  if (typeof body.designation === 'string') targetUser.designation = body.designation;
  if (typeof body.avatar === 'string') targetUser.avatar = body.avatar;
  if (typeof body.status === 'string') targetUser.status = body.status;
  if (body.joinDate) targetUser.joinDate = body.joinDate;

  if (typeof body.phoneCountryCode === 'string') {
    targetUser.phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
  }

  if (typeof body.phoneNumber === 'string') {
    const phoneNumber = normalizePhoneNumber(body.phoneNumber);
    if (phoneNumber && (phoneNumber.length < 6 || phoneNumber.length > 15)) {
      res.status(400).json({ message: 'Phone number must be between 6 and 15 digits' });
      return;
    }
    targetUser.phoneNumber = phoneNumber;
  }

  if (typeof body.employeeCode === 'string') {
    const requestedEmployeeCode = normalizeEmployeeCode(body.employeeCode);
    if (!requestedEmployeeCode) {
      res.status(400).json({ message: 'employeeCode cannot be empty' });
      return;
    }

    if (requestedEmployeeCode !== String(targetUser.employeeCode || '')) {
      const sameOrgCode = await (User as any).findOne({ organizationId, employeeCode: requestedEmployeeCode });
      if (sameOrgCode && String(sameOrgCode._id) !== String(targetUser._id)) {
        res.status(409).json({ message: 'Employee code already exists' });
        return;
      }
    }

    targetUser.employeeCode = requestedEmployeeCode;
  }

  if (typeof body.employeeType === 'string') {
    targetUser.employeeType = normalizeEmployeeType(body.employeeType);
  }

  if (body.salaryBreakup && typeof body.salaryBreakup === 'object') {
    const currentSalaryBreakup =
      targetUser.salaryBreakup?.toObject?.() ||
      targetUser.salaryBreakup || {
        basic: 0,
        hra: 0,
        allowances: 0,
        bonus: 0,
        deductions: 0,
      };

    targetUser.salaryBreakup = normalizeSalaryBreakup({
      ...currentSalaryBreakup,
      ...(body.salaryBreakup as Record<string, unknown>),
    });
  }

  if (typeof body.email === 'string') {
    const cleanEmail = body.email.trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ message: 'email cannot be empty' });
      return;
    }

    if (cleanEmail !== String(targetUser.email || '').toLowerCase()) {
      const existingEmailDb = await findTenantDatabaseByEmail(cleanEmail);
      if (existingEmailDb && existingEmailDb !== dbName) {
        res.status(409).json({ message: 'Email is already registered' });
        return;
      }

      if (existingEmailDb === dbName) {
        const sameDbUser = await (User as any).findOne({ email: cleanEmail });
        if (sameDbUser && String(sameDbUser._id) !== String(targetUser._id)) {
          res.status(409).json({ message: 'Email is already registered' });
          return;
        }
      }
    }

    targetUser.email = cleanEmail;
  }

  if (typeof body.password === 'string' && body.password.trim()) {
    targetUser.password = await hashPassword(body.password);
  }

  await targetUser.save();
  res.status(200).json({ user: sanitizeUser(targetUser), message: 'User updated successfully' });
};

export const deleteUser = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const userId = String(req.params.userId || '').trim();
  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: 'Valid user id is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const body = (req.body || {}) as Record<string, unknown>;
  const actorRole = String(req.query.actorRole || body.actorRole || body.creatorRole || 'Employee');
  const actorUserId = String(req.query.actorUserId || body.actorUserId || '').trim();

  if (actorRole === 'Employee') {
    res.status(403).json({ message: 'Employees are not allowed to delete user credentials' });
    return;
  }

  const { tenantConnection } = tenantScope;
  const User = getUserModel(tenantConnection);

  const targetUser = await (User as any).findOne({ _id: userId, organizationId });
  if (!targetUser) {
    res.status(404).json({ message: 'User not found in organization' });
    return;
  }

  if (actorUserId && actorUserId === String(targetUser._id)) {
    res.status(403).json({ message: 'You cannot delete your own account' });
    return;
  }

  if (actorRole === 'HR' && targetUser.role !== 'Employee') {
    res.status(403).json({ message: 'HR can delete Employee credentials only' });
    return;
  }

  if (targetUser.role === 'Admin') {
    res.status(403).json({ message: 'Admin credentials cannot be deleted from this endpoint' });
    return;
  }

  await (User as any).deleteOne({ _id: targetUser._id });
  res.status(200).json({ message: 'User deleted successfully' });
};
