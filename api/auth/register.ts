
import dbConnect, {
  findTenantDatabaseByEmail,
  getOrganizationDatabaseName,
  getTenantConnection,
  listTenantDatabaseNames,
  normalizeOrganizationName,
} from '../lib/mongodb';
import { getUserModel } from '../models/User';
import { getOrganizationModel } from '../models/Organization';
import { getOrganizationSettingsModel } from '../models/OrganizationSettings';
import { signJWT, hashPassword } from '../lib/auth-utils';

export async function registerHandler(body: any) {
  try {
    const { name, email, password, organizationName } = body || {};
    const cleanOrganizationName = String(organizationName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!name || !cleanEmail || !password || !cleanOrganizationName) {
      return { status: 400, data: { message: 'name, email, password, and organizationName are required' } };
    }

    await dbConnect();
    const normalizedOrganizationName = normalizeOrganizationName(cleanOrganizationName);
    const tenantDbName = getOrganizationDatabaseName(cleanOrganizationName);

    const tenantDatabases = await listTenantDatabaseNames();
    if (tenantDatabases.includes(tenantDbName)) {
      return { status: 409, data: { message: 'Organization name is already taken' } };
    }

    const emailExistsInDb = await findTenantDatabaseByEmail(cleanEmail);
    if (emailExistsInDb) {
      return { status: 409, data: { message: 'Email is already registered' } };
    }

    const tenantConnection = await getTenantConnection(tenantDbName);
    const Organization = getOrganizationModel(tenantConnection);
    const User = getUserModel(tenantConnection);
    const OrganizationSettings = getOrganizationSettingsModel(tenantConnection);

    const newOrg = await (Organization as any).create({ name: cleanOrganizationName });
    const hashedPassword = await hashPassword(password);
    
    const newUser = await (User as any).create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: 'Admin',
      organizationId: newOrg._id,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    const orgSlug = normalizedOrganizationName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'company';
    await (OrganizationSettings as any).create({
      organizationId: newOrg._id,
      companyName: cleanOrganizationName,
      registrationNumber: `REG-${String(new Date().getFullYear())}-${String(newOrg._id).slice(-6).toUpperCase()}`,
      emailDomain: `@${orgSlug}.com`,
      openPositions: 0,
    });

    const token = signJWT({ id: newUser._id, role: newUser.role, orgId: newOrg._id, orgDb: tenantDbName });

    return {
      status: 201,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
          organizationId: newOrg._id,
          organizationName: newOrg.name,
          organizationDb: tenantDbName,
        },
        token,
        message: `Organization and Admin registered in MongoDB database ${tenantDbName} successfully`,
      }
    };
  } catch (error: any) {
    console.error('MongoDB Registration Error:', error);
    return { status: 500, data: { message: error.message || 'Internal Database Error' } };
  }
}
