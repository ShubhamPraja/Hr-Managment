
import dbConnect, { findTenantDatabaseByEmail, getTenantConnection } from '../lib/mongodb';
import { getUserModel } from '../models/User';
import { getOrganizationModel } from '../models/Organization';
import { signJWT, comparePasswords } from '../lib/auth-utils';

export async function loginHandler(body: any) {
  try {
    const { email, password } = body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { status: 400, data: { message: 'email and password are required' } };
    }

    await dbConnect();
    const tenantDbName = await findTenantDatabaseByEmail(cleanEmail);
    if (!tenantDbName) {
      return { status: 401, data: { message: 'Invalid credentials' } };
    }

    const tenantConnection = await getTenantConnection(tenantDbName);
    const User = getUserModel(tenantConnection);
    const Organization = getOrganizationModel(tenantConnection);

    const user = await (User as any).findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return { status: 401, data: { message: 'Invalid credentials' } };
    }

    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) {
      return { status: 401, data: { message: 'Invalid credentials' } };
    }

    let orgName = '';
    if (user.organizationId) {
      const org = await (Organization as any).findById(user.organizationId);
      orgName = org?.name || '';
    }

    const token = signJWT({ id: user._id, role: user.role, orgId: user.organizationId, orgDb: tenantDbName });

    return {
      status: 200,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          organizationId: user.organizationId,
          organizationName: orgName,
          organizationDb: tenantDbName,
        },
        token,
        message: `Login successful via MongoDB database ${tenantDbName}`,
      }
    };
  } catch (error: any) {
    console.error('MongoDB Login Error:', error);
    return { status: 500, data: { message: 'Internal Database Error' } };
  }
}
