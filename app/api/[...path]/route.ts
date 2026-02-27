import {
  createAttendance,
  deleteAttendance,
  getAttendance,
  punchInAttendance,
  punchOutAttendance,
  updateAttendance,
} from '@/api/controllers/attendance.controller';
import { login, register } from '@/api/controllers/auth.controller';
import { getDashboard } from '@/api/controllers/dashboard.controller';
import { health } from '@/api/controllers/health.controller';
import {
  createLeave,
  deleteLeave,
  getLeaves,
  updateLeave,
} from '@/api/controllers/leave.controller';
import {
  createPayroll,
  deletePayroll,
  getPayroll,
  updatePayroll,
} from '@/api/controllers/payroll.controller';
import {
  deleteSettings,
  getSettings,
  upsertSettings,
} from '@/api/controllers/settings.controller';
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '@/api/controllers/users.controller';
import { runController } from '@/api/lib/next-route-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

const resolvePathSegments = async (context: RouteContext) => {
  const params = await Promise.resolve(context.params);
  const path = params?.path;

  if (!path) {
    return [] as string[];
  }

  return Array.isArray(path) ? path : [path];
};

const notFound = () => Response.json({ message: 'API route not found' }, { status: 404 });

const handle = async (request: Request, context: RouteContext) => {
  const method = request.method.toUpperCase();
  const path = await resolvePathSegments(context);

  if (method === 'GET' && path.length === 1 && path[0] === 'health') {
    return runController({ request, controller: health });
  }

  if (method === 'POST' && path.length === 2 && path[0] === 'auth' && path[1] === 'register') {
    return runController({ request, controller: register });
  }

  if (method === 'POST' && path.length === 2 && path[0] === 'auth' && path[1] === 'login') {
    return runController({ request, controller: login });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'dashboard') {
    return runController({ request, controller: getDashboard });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'attendance') {
    return runController({ request, controller: getAttendance });
  }

  if (method === 'POST' && path.length === 1 && path[0] === 'attendance') {
    return runController({ request, controller: createAttendance });
  }

  if (method === 'POST' && path.length === 2 && path[0] === 'attendance' && path[1] === 'punch-in') {
    return runController({ request, controller: punchInAttendance });
  }

  if (method === 'POST' && path.length === 2 && path[0] === 'attendance' && path[1] === 'punch-out') {
    return runController({ request, controller: punchOutAttendance });
  }

  if (method === 'PUT' && path.length === 2 && path[0] === 'attendance') {
    return runController({
      request,
      controller: updateAttendance,
      params: { recordId: path[1] },
    });
  }

  if (method === 'DELETE' && path.length === 2 && path[0] === 'attendance') {
    return runController({
      request,
      controller: deleteAttendance,
      params: { recordId: path[1] },
    });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'leave') {
    return runController({ request, controller: getLeaves });
  }

  if (method === 'POST' && path.length === 1 && path[0] === 'leave') {
    return runController({ request, controller: createLeave });
  }

  if (method === 'PUT' && path.length === 2 && path[0] === 'leave') {
    return runController({
      request,
      controller: updateLeave,
      params: { requestId: path[1] },
    });
  }

  if (method === 'DELETE' && path.length === 2 && path[0] === 'leave') {
    return runController({
      request,
      controller: deleteLeave,
      params: { requestId: path[1] },
    });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'payroll') {
    return runController({ request, controller: getPayroll });
  }

  if (method === 'POST' && path.length === 1 && path[0] === 'payroll') {
    return runController({ request, controller: createPayroll });
  }

  if (method === 'PUT' && path.length === 2 && path[0] === 'payroll') {
    return runController({
      request,
      controller: updatePayroll,
      params: { recordId: path[1] },
    });
  }

  if (method === 'DELETE' && path.length === 2 && path[0] === 'payroll') {
    return runController({
      request,
      controller: deletePayroll,
      params: { recordId: path[1] },
    });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'settings') {
    return runController({ request, controller: getSettings });
  }

  if ((method === 'POST' || method === 'PUT') && path.length === 1 && path[0] === 'settings') {
    return runController({ request, controller: upsertSettings });
  }

  if (method === 'DELETE' && path.length === 1 && path[0] === 'settings') {
    return runController({ request, controller: deleteSettings });
  }

  if (method === 'GET' && path.length === 1 && path[0] === 'users') {
    return runController({ request, controller: getUsers });
  }

  if (method === 'POST' && path.length === 1 && path[0] === 'users') {
    return runController({ request, controller: createUser });
  }

  if (method === 'PUT' && path.length === 2 && path[0] === 'users') {
    return runController({
      request,
      controller: updateUser,
      params: { userId: path[1] },
    });
  }

  if (method === 'DELETE' && path.length === 2 && path[0] === 'users') {
    return runController({
      request,
      controller: deleteUser,
      params: { userId: path[1] },
    });
  }

  return notFound();
};

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
