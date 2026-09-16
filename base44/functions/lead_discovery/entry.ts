import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { discoverLeads } from '../../shared/leadDiscoveryEngine.ts';

// Lead generation engine (owner path). Uses the shared discovery engine in
// user mode — profile and existing leads are scoped to the authenticated
// owner, and created leads are owned by them.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || '').trim();
    const count: number = Math.min(Math.max(body.count || 20, 1), 50);
    const filters: any = body.filters || {};
    if (!message && !filters.keywords && !filters.industry && !filters.service) {
      return Response.json({ error: 'A search description or keywords are required' }, { status: 400 });
    }

    const result = await discoverLeads(base44, 'user', { message, filters, count, userId: user.id });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}