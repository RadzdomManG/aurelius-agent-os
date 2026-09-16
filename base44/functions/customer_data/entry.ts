import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validateCustomerSession } from '../../shared/customerAuth.ts';

// Returns Leads or Jobs to a customer (access-code session holder). The
// session token is validated server-side on every call — this is the real
// authorization boundary. Unauthenticated callers get nothing. The shared
// validator also rejects sessions whose underlying code has been revoked or
// has expired, so a customer loses access the moment their code does.
export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').toString();
    const resource = (body.resource || '').toString();
    if (!resource) return Response.json({ error: 'Missing resource.' }, { status: 400 });

    const auth = await validateCustomerSession(base44, token);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const svc = base44.asServiceRole.entities;
    if (resource === 'leads') {
      const rows = await svc.Lead.list('-created_date', 300);
      return Response.json({ rows });
    }
    if (resource === 'jobs') {
      const rows = await svc.Job.list('-created_date', 500);
      return Response.json({ rows });
    }
    return Response.json({ error: 'Unknown resource.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}