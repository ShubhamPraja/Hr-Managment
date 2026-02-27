import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { findTenantDatabaseByEmail } from '../lib/mongodb';
import { hashPassword } from '../lib/auth-utils';
import { getUserModel } from '../models/User';
import { resolveTenantOrFail } from './shared';

const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  designation: user.designation,
  organizationId: user.organizationId,
  avatar: user.avatar,
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
  res.status(200).json({ users });
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
    res.status(400).json({ message: 'name, email, password, and organizationId are required' });
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

  const created = await (User as any).create({
    name,
    email,
    password: hashedPassword,
    organizationId,
    role: requestedRole,
    department: body.department,
    designation: body.designation,
    avatar: body.avatar,
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
