type Controller = (req: any, res: any) => Promise<void> | void;

const parseQuery = (request: Request) => {
  const query: Record<string, string | string[]> = {};
  const url = new URL(request.url);

  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
      return;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      query[key] = existing;
      return;
    }

    query[key] = [existing, value];
  });

  return query;
};

const parseBody = async (request: Request) => {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return {};
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
};

export const runController = async ({
  request,
  controller,
  params = {},
}: {
  request: Request;
  controller: Controller;
  params?: Record<string, string>;
}) => {
  const req = {
    method: request.method,
    query: parseQuery(request),
    body: await parseBody(request),
    params,
    headers: {},
  } as any;

  let statusCode = 200;
  let payload: any = {};
  let hasSentJson = false;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      payload = data;
      hasSentJson = true;
      return this;
    },
  } as any;

  try {
    await controller(req, res);
  } catch (error: any) {
    statusCode = 500;
    payload = { message: error?.message || 'Internal Server Error' };
    hasSentJson = true;
  }

  if (!hasSentJson) {
    payload = {};
  }

  return Response.json(payload, { status: statusCode });
};
