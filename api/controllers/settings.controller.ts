import type { Request, Response } from 'express';
import { getOrganizationModel } from '../models/Organization';
import { getOrganizationSettingsModel } from '../models/OrganizationSettings';
import { resolveTenantOrFail } from './shared';

export const getSettings = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection, dbName } = tenantScope;
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);
  const Organization = getOrganizationModel(tenantConnection);

  let settings = await (OrganizationSettings as any).findOne({ organizationId });
  if (!settings) {
    const orgDoc = await (Organization as any).findById(organizationId);
    const companyName = orgDoc?.name || dbName || 'Company';
    const slug = String(companyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'company';

    settings = await (OrganizationSettings as any).create({
      organizationId,
      companyName,
      registrationNumber: `REG-${String(new Date().getFullYear())}-${String(organizationId).slice(-6).toUpperCase()}`,
      emailDomain: `@${slug}.com`,
      openPositions: 0,
    });
  }

  res.status(200).json({ settings });
};

export const upsertSettings = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const {
    companyName,
    registrationNumber,
    emailDomain,
    openPositions,
    notifications,
    leavePolicy,
  } = (req.body || {}) as Record<string, unknown>;

  const { tenantConnection } = tenantScope;
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);

  const updatePayload: Record<string, unknown> = {};
  if (typeof companyName === 'string') updatePayload.companyName = companyName.trim();
  if (typeof registrationNumber === 'string') updatePayload.registrationNumber = registrationNumber.trim();
  if (typeof emailDomain === 'string') updatePayload.emailDomain = emailDomain.trim();
  if (typeof openPositions === 'number') updatePayload.openPositions = openPositions;
  if (notifications && typeof notifications === 'object') updatePayload.notifications = notifications;
  if (leavePolicy && typeof leavePolicy === 'object') updatePayload.leavePolicy = leavePolicy;

  const settings = await (OrganizationSettings as any).findOneAndUpdate(
    { organizationId },
    { $set: updatePayload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ settings, message: 'Settings saved successfully' });
};

export const deleteSettings = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);

  const deleted = await (OrganizationSettings as any).findOneAndDelete({ organizationId });
  if (!deleted) {
    res.status(404).json({ message: 'Settings not found' });
    return;
  }

  res.status(200).json({ message: 'Settings deleted successfully' });
};

