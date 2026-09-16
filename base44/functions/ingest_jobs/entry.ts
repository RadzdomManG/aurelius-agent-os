import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Ingests OnlineJobs.ph job posts pushed by the user's local watcher.py bot.
// Uses the built-in service role to write records (the caller is an external
// bot, not an authenticated app user). Scoring is deterministic keyword overlap
// with the user's profile — no LLM, zero credits.
export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body) ? body : (body.jobs || (body.title ? [body] : []));
    if (!incoming.length) return Response.json({ error: 'No jobs provided' }, { status: 400 });

    // Load the operator profile + existing jobs (dedup by url)
    const [profiles, existing] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.filter({}),
      base44.asServiceRole.entities.Job.list('-created_date', 500),
    ]);
    const profile = profiles[0] || {};
    const keywords = buildKeywordSet(profile);
    const seenUrls = new Set(existing.map((j: any) => j.url).filter(Boolean));
    const seenKeys = new Set(existing.map((j: any) => `${(j.title || '').toLowerCase()}|${(j.company || '').toLowerCase()}`));

    const normalizedJobs = incoming.slice(0, 50).map(normalize).filter((j: any) => j.title);
    const aiMatches = await rankJobsWithAurelius(base44, profile, normalizedJobs);
    const toCreate: any[] = [];
    let duplicates = 0;
    for (const raw of incoming.slice(0, 50)) {
      const job = normalize(raw);
      if (!job.title) continue;
      if (job.url && seenUrls.has(job.url)) { duplicates++; continue; }
      const key = `${job.title.toLowerCase()}|${(job.company || '').toLowerCase()}`;
      if (!job.url && seenKeys.has(key)) { duplicates++; continue; }
      const fallback = scoreJob(job, keywords);
      const ai = aiMatches[job.url || `${job.title}|${job.company}`] || fallback;
      const score = Number(ai.score ?? fallback.score);
      const reason = ai.reason || fallback.reason;
      const matched = Array.isArray(ai.matched) ? ai.matched : fallback.matched;
      toCreate.push({
        title: job.title,
        company: job.company,
        url: job.url,
        source: job.source,
        location: job.location,
        remote: job.remote,
        salary: job.salary,
        description: job.description,
        match_score: score,
        match_reason: reason,
        skills_matched: matched,
        status: 'saved',
        application_url: job.application_url || job.url,
        owner_email: body.owner_email || 'Radzdomgallego4@gmail.com',
      });
      if (job.url) seenUrls.add(job.url);
      seenKeys.add(key);
    }

    let created = 0;
    let highMatch = 0;
    if (toCreate.length) {
      await base44.asServiceRole.entities.Job.bulkCreate(toCreate);
      created = toCreate.length;
      highMatch = toCreate.filter((j) => j.match_score >= 70).length;
      await base44.asServiceRole.entities.Activity.create({
        type: 'job_found',
        description: `Ingested ${created} new jobs from OnlineJobs.ph (${highMatch} high-match)`,
        actor: 'sub_agent',
        sub_agent: 'job_hunter_agent',
        severity: 'info',
        related_type: 'Job',
      });
      for (const j of toCreate.filter((j) => j.match_score >= 70)) {
        await base44.asServiceRole.entities.Notification.create({
          title: `High-match job: ${j.title}`,
          content: `${j.company}${j.location ? ` · ${j.location}` : ''} · score ${j.match_score}`,
          type: 'job_match',
          severity: 'info',
          read: false,
          related_type: 'Job',
        }).catch(() => {});
      }
    }

    return Response.json({ status: 'ok', created, duplicates, high_match: highMatch });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

function normalize(raw: any) {
  const loc = (raw.location || '').toString().trim();
  const desc = (raw.description || raw.summary || '').toString().trim();
  return {
    title: (raw.title || raw.job_title || '').toString().trim(),
    company: (raw.company || raw.employer || '').toString().trim(),
    url: (raw.url || raw.link || raw.href || '').toString().trim(),
    source: (raw.source || 'OnlineJobs.ph').toString().trim(),
    location: loc,
    remote: raw.remote ?? /remote|work from home/i.test(loc + ' ' + desc),
    salary: (raw.salary || raw.rate || '').toString().trim(),
    description: desc,
    application_url: (raw.application_url || '').toString().trim(),
  };
}

async function rankJobsWithAurelius(base44: any, profile: any, jobs: any[]): Promise<Record<string, any>> {
  if (!jobs.length) return {};
  const roster = jobs.map((j: any, i: number) => `${i}. key=${j.url || `${j.title}|${j.company}`} | ${j.title} | ${j.company} | ${j.description.slice(0, 500)}`).join('\\n');
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Aurelius, the user's job matching brain. Rank each job 0-100 for this profile. Consider skills, services, preferred jobs, experience, remote preference, and likely fit. Return a concise reason and 3-8 matched skills.\\nPROFILE: ${JSON.stringify(profile)}\\nJOBS:\\n${roster}`,
      response_json_schema: { type: 'object', properties: { matches: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, score: { type: 'number' }, reason: { type: 'string' }, matched: { type: 'array', items: { type: 'string' } } }, required: ['key', 'score', 'reason', 'matched'] } } }, required: ['matches'] },
      model: 'automatic'
    });
    return Object.fromEntries((result.matches || []).map((m: any) => [m.key, m]));
  } catch (_) {
    return {};
  }
}

function buildKeywordSet(profile: any): string[] {
  const blobs = [...(profile.skills || []), ...(profile.services || []), profile.preferred_jobs || '', profile.title || ''];
  const set = new Set<string>();
  for (const b of blobs) {
    String(b).toLowerCase().split(/[,\n\/]| and | or /).map((s) => s.trim()).filter(Boolean)
      .forEach((s) => { if (s.length > 2) set.add(s); });
  }
  return [...set];
}

function scoreJob(job: any, keywords: string[]): { score: number; reason: string; matched: string[] } {
  const hay = `${job.title} ${job.description}`.toLowerCase();
  const matched: string[] = [];
  for (const k of keywords) {
    if (hay.includes(k)) matched.push(k);
  }
  let score = 25 + matched.length * 12;
  if (job.remote) score += 5;
  score = Math.min(100, score);
  const reason = matched.length
    ? `Matches your profile: ${matched.slice(0, 6).join(', ')}`
    : 'New posting — no strong profile overlap yet';
  return { score, reason, matched };
}