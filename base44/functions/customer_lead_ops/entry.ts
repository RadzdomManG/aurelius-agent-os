import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validateCustomerSession } from '../../shared/customerAuth.ts';
import { discoverLeads } from '../../shared/leadDiscoveryEngine.ts';

// Lets an access-code customer perform the same lead operations the owner can:
// update a lead, bulk-change status, delete, run a new search, and read a
// lead's activity timeline. Every call is validated against the customer's
// session token; the service role performs the actual entity work so the
// customer never needs a platform account.
export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').toString();
    const op = (body.op || '').toString();
    const payload = body.payload || {};
    if (!op) return Response.json({ error: 'Missing operation.' }, { status: 400 });

    const auth = await validateCustomerSession(base44, token);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const svc = base44.asServiceRole.entities;

    if (op === 'update') {
      const { id, fields } = payload;
      if (!id || !fields) return Response.json({ error: 'id and fields are required.' }, { status: 400 });
      const updated = await svc.Lead.update(id, fields);
      return Response.json(updated);
    }

    if (op === 'bulk_status') {
      const { ids, status } = payload;
      if (!Array.isArray(ids) || !ids.length || !status) {
        return Response.json({ error: 'ids and status are required.' }, { status: 400 });
      }
      await svc.Lead.bulkUpdate(ids.map((id: string) => ({ id, status })));
      return Response.json({ updated: ids.length });
    }

    if (op === 'delete') {
      const { id } = payload;
      if (!id) return Response.json({ error: 'id is required.' }, { status: 400 });
      await svc.Lead.delete(id);
      return Response.json({ ok: true });
    }

    if (op === 'activities') {
      const { id } = payload;
      if (!id) return Response.json({ error: 'id is required.' }, { status: 400 });
      const rows = await svc.Activity.filter({ related_type: 'Lead', related_id: id }, '-created_date', 20);
      return Response.json({ rows });
    }

    if (op === 'search') {
      const message = (payload.message || '').trim();
      const filters = payload.filters || {};
      const count = Math.min(Math.max(payload.count || 20, 1), 50);
      if (!message && !filters.keywords && !filters.industry && !filters.service) {
        return Response.json({ error: 'A search description or keywords are required.' }, { status: 400 });
      }
      const result = await discoverLeads(base44, 'service', { message, filters, count });
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown operation.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}