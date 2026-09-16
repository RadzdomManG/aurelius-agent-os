import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns Leads or Jobs to a customer (access-code session holder).
// The session token is validated server-side on every call — this is the
// real authorization boundary. Unauthenticated callers get nothing.
export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').toString();
    const resource = (body.resource || '').toString();
    if (!token) return Response.json({ error: 'Session expired. Please re-enter your access code.' }, { status: 401 });
    if (!resource) return Response.json({ error: 'Missing resource.' }, { status: 400 });

    const sessions = await base44.asServiceRole.entities.AccessSession.filter({ token });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'Invalid session. Please re-enter your access code.' }, { status: 401 });
    if (session.expires_at && new Date(session.expires_at) <= new Date()) {
      return Response.json({ error: 'Your session has expired. Please re-enter your access code.' }, { status: 401 });
    }

    // Code still active? (revoking a code invalidates all its sessions)
    const code = await base44.asServiceRole.entities.AccessCode.get(session.code_id).catch(() => null);
    if (!code || !code.active) {
      return Response.json({ error: 'This access code has been revoked.' }, { status: 403 });
    }

    if (resource === 'leads') {
      const rows = await base44.asServiceRole.entities.Lead.list('-created_date', 300);
      return Response.json({ rows });
    }
    if (resource === 'jobs') {
      const rows = await base44.asServiceRole.entities.Job.list('-created_date', 500);
      return Response.json({ rows });
    }
    return Response.json({ error: 'Unknown resource.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}