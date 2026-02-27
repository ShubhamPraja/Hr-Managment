
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI
  || 'mongodb://127.0.0.1:27017/admin';

const globalMongoose = globalThis as typeof globalThis & {
  mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

if (!globalMongoose.mongoose) {
  globalMongoose.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const { mongoose: cache } = globalMongoose;
  
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export const normalizeOrganizationName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

export const getOrganizationDatabaseName = (organizationName: string) => {
  const normalized = normalizeOrganizationName(organizationName);
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = slug || 'tenant';
  const truncated = base.slice(0, 48);
  return `org_${truncated}`;
};

export async function getTenantConnection(dbName: string) {
  const rootConnection = await dbConnect();
  return rootConnection.connection.useDb(dbName, { useCache: true });
}

export async function listTenantDatabaseNames() {
  const rootConnection = await dbConnect();
  const admin = rootConnection.connection.db.admin();
  const dbList = await admin.listDatabases();
  return dbList.databases
    .map((item) => item.name)
    .filter((name) => name.startsWith('org_'));
}

export async function findTenantDatabaseByEmail(email: string) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const rootConnection = await dbConnect();
  const client = rootConnection.connection.getClient();
  const tenantDatabases = await listTenantDatabaseNames();

  for (const dbName of tenantDatabases) {
    const found = await client.db(dbName).collection('users').findOne({ email: cleanEmail }, { projection: { _id: 1 } });
    if (found) return dbName;
  }

  return null;
}

export async function findTenantDatabaseByOrganizationId(organizationId: string) {
  const cleanOrganizationId = String(organizationId || '').trim();
  if (!cleanOrganizationId || !mongoose.Types.ObjectId.isValid(cleanOrganizationId)) return null;

  const objectId = new mongoose.Types.ObjectId(cleanOrganizationId);
  const rootConnection = await dbConnect();
  const client = rootConnection.connection.getClient();
  const tenantDatabases = await listTenantDatabaseNames();

  for (const dbName of tenantDatabases) {
    const found = await client
      .db(dbName)
      .collection('organizations')
      .findOne({ _id: objectId }, { projection: { _id: 1 } });
    if (found) return dbName;
  }

  return null;
}

export default dbConnect;
