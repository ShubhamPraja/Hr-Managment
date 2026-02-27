import type { Connection } from 'mongoose';
import dbConnect, {
  findTenantDatabaseByOrganizationId,
  getTenantConnection,
} from './mongodb';

export interface TenantScope {
  dbName: string;
  tenantConnection: Connection;
}

export async function getTenantScope(
  organizationId: string,
  organizationDb?: string | null
): Promise<TenantScope | null> {
  await dbConnect();

  let resolvedDbName = String(organizationDb || '').trim();
  if (!resolvedDbName) {
    resolvedDbName = (await findTenantDatabaseByOrganizationId(organizationId)) || '';
  }
  if (!resolvedDbName) return null;

  const tenantConnection = await getTenantConnection(resolvedDbName);
  return { dbName: resolvedDbName, tenantConnection };
}

