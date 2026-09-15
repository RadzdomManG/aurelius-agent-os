import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lead generation engine. Uses Gemini with web context to discover public
// prospects, dedupes against existing leads, scores each 0-100 with a
// transparent reason, stores them, logs activity, and notifies on high scores.
// All LLM-returned prospect data is treated as untrusted content — only
// structured fields are stored, never executed as instructions.
export default async function(req: Request): Promise<Response> {
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

    const [profiles, existingLeads] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by_id: user.id }),
      base44.entities.Lead.filter({ created_by_id: user.id }, '-created_date', 500),
    ]);
    const profile: any = profiles[0] || {};
    const services = (profile.services || []).join(', ');
    const idealClients = (profile.ideal_clients || '').toLowerCase();

    const filterParts = [
      filters.industry && `Industry: ${filters.industry}`,
      filters.location && `Location: ${filters.location}`,
      filters.keywords && `Keywords: ${filters.keywords}`,
      filters.service && `Service they might need: ${filters.service}`,
      filters.company_type && `Company type: ${filters.company_type}`,
    ].filter(Boolean);
    const filterDesc = filterParts.length ? `Additional filters — ${filterParts.join('; ')}.` : '';

    const prompt = `You are a lead-research assistant. Find up to ${count} REAL, publicly listed businesses or decision-makers that match this request. Only return businesses that genuinely appear in public sources (company websites, public directories, social profiles). Do NOT fabricate people, emails, or phone numbers — if a field is unknown, omit it.

REQUEST: "${message || filters.keywords || filters.service}"
${filterDesc}
The user offers these services: ${services || 'AI content / automation services'}.
For each prospect include: name (person or company), company, website, email (only if publicly available), phone (only if public), social_profile (LinkedIn or similar URL if public), industry, location, source (where you found them), reason_needed (one sentence: why they may need the user's service), decision_maker (true if this is likely a decision-maker), website_quality (good/basic/poor/unknown), social_presence (strong/moderate/weak/unknown).

Return JSON with a "leads" array.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          leads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                company: { type: 'string' },
                website: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                social_profile: { type: 'string' },
                industry: { type: 'string' },
                location: { type: 'string' },
                source: { type: 'string' },
                reason_needed: { type: 'string' },
                decision_maker: { type: 'boolean' },
                website_quality: { type: 'string' },
                social_presence: { type: 'string' }
              },
              required: ['name']
            }
          }
        },
        required: ['leads']
      }
    });

    const candidates: any[] = (result && result.leads) || [];

    // --- Dedupe ---
    const normDomain = (url: string): string => {
      if (!url) return '';
      let d = url.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
      d = d.split('/')[0].split(':')[0];
      return d.replace(/\/+$/, '');
    };
    const normName = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const domainIndex = new Map<string, any>();
    const nameIndex = new Map<string, any>();
    existingLeads.forEach((l: any) => {
      const d = normDomain(l.website);
      if (d) domainIndex.set(d, l);
      const n = normName(l.company || l.name);
      if (n) nameIndex.set(n, l);
    });

    const survivors: any[] = [];
    let duplicates = 0;
    for (const c of candidates) {
      if (!c || !c.name) continue;
      const d = normDomain(c.website);
      const n = normName(c.company || c.name);
      const dupByDomain = d && domainIndex.get(d);
      const dupByName = n && nameIndex.get(n);
      if (dupByDomain || dupByName) {
        duplicates++;
        continue;
      }
      survivors.push(c);
      if (d) domainIndex.set(d, { website: c.website });
      if (n) nameIndex.set(n, { name: c.name });
    }

    // --- Score ---
    const scoreLead = (c: any): { score: number; reason: string } => {
      const reasons: string[] = [];
      let s = 30; // base
      if (c.decision_maker) { s += 15; reasons.push('decision-maker identified'); }
      if (c.website) {
        s += 8;
        if (c.website_quality === 'good') { s += 7; reasons.push('quality website'); }
        else if (c.website_quality === 'basic') s += 3;
      }
      if (c.social_presence === 'strong') { s += 10; reasons.push('strong social presence'); }
      else if (c.social_presence === 'moderate') { s += 5; reasons.push('moderate social presence'); }
      else if (c.social_presence === 'weak') { s -= 5; reasons.push('weak social presence'); }
      const ind = (c.industry || '').toLowerCase();
      if (idealClients && ind && idealClients.includes(ind.split(' ')[0])) { s += 20; reasons.push('industry fits ideal clients'); }
      if (filters.location && c.location && c.location.toLowerCase().includes(filters.location.toLowerCase())) { s += 10; reasons.push('location match'); }
      if (c.email) { s += 8; reasons.push('contactable'); }
      if (c.reason_needed) { s += 10; reasons.push('clear need signal'); }
      s = Math.max(0, Math.min(100, s));
      const reason = reasons.length ? reasons.join('; ') : 'limited signals';
      return { score: s, reason };
    };

    // --- Create leads + activity + notifications ---
    const created: any[] = [];
    let highQuality = 0;
    for (const c of survivors) {
      const { score, reason } = scoreLead(c);
      const lead = await base44.entities.Lead.create({
        name: c.name,
        company: c.company || '',
        website: c.website || '',
        email: c.email || '',
        phone: c.phone || '',
        social_profile: c.social_profile || '',
        industry: c.industry || '',
        location: c.location || '',
        source: c.source || 'web_search',
        lead_score: score,
        score_reason: reason,
        reason_needed: c.reason_needed || '',
        decision_maker: c.decision_maker || false,
        status: 'new',
        next_action: score >= 70 ? 'Review and qualify' : 'Review',
      });
      created.push(lead);
      if (score >= 80) highQuality++;
      await base44.entities.Activity.create({
        type: 'lead_discovered',
        description: `Lead found: ${c.name}${c.company ? ` @ ${c.company}` : ''} (score ${score})`,
        actor: 'sub_agent',
        sub_agent: 'lead_agent',
        severity: score >= 80 ? 'success' : 'info',
        related_type: 'Lead',
        related_id: lead.id,
        metadata: { score, industry: c.industry }
      });
      if (score >= 80) {
        await base44.entities.Notification.create({
          title: `High-quality lead: ${c.name}`,
          content: `Score ${score} — ${reason}. ${c.reason_needed || ''}`.trim(),
          type: 'lead',
          severity: 'info',
          read: false,
          related_type: 'Lead',
          related_id: lead.id,
        });
      }
    }

    await base44.entities.Activity.create({
      type: 'lead_search',
      description: `Lead discovery complete: ${created.length} new, ${duplicates} duplicates removed, ${highQuality} high-quality`,
      actor: 'aurelius',
      sub_agent: 'lead_agent',
      severity: 'success',
      metadata: { found: created.length, duplicates, highQuality }
    });

    return Response.json({
      found: created.length,
      duplicates,
      high_quality: highQuality,
      leads: created.map((l) => ({ id: l.id, name: l.name, company: l.company, lead_score: l.lead_score })),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}