import type { Request, Response } from 'express';
import { getTenantScope } from '../lib/tenant-scope';

const toCleanString = (value: unknown) => String(value || '').trim();

export const readOrganizationScope = (req: Request) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const organizationId =
    toCleanString(req.query.organizationId) || toCleanString(body.organizationId);
  const organizationDb =
    toCleanString(req.query.organizationDb) || toCleanString(body.organizationDb);

  return { organizationId, organizationDb };
};

export const resolveTenantOrFail = async (
  req: Request,
  res: Response
) => {
  const { organizationId, organizationDb } = readOrganizationScope(req);
  if (!organizationId) {
    res.status(400).json({ message: 'organizationId is required' });
    return null;
  }

  const tenantScope = await getTenantScope(organizationId, organizationDb);
  if (!tenantScope) {
    res.status(404).json({ message: 'Organization database mapping not found' });
    return null;
  }

  return { organizationId, organizationDb, tenantScope };
};

export const toNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

