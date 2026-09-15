import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Books a discovery call on the builder's Google Calendar (shared connection)
// and links it back to the lead. Called by the command center when a lead
// expresses interest or a time is agreed.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const leadId: string = (body.lead_id || '').trim();
    const startIso: string = (body.start || '').trim();
    const durationMin: number = Math.min(Math.max(body.duration_minutes || 30, 10), 120);
    const title: string = (body.title || '').trim();
    const notes: string = (body.notes || '').trim();

    if (!leadId) return Response.json({ error: 'lead_id is required' }, { status: 400 });
    if (!startIso || isNaN(new Date(startIso).getTime())) {
      return Response.json({ error: 'A valid start datetime is required' }, { status: 400 });
    }

    // Resolve the lead (user-scoped)
    const leads = await base44.entities.Lead.filter({ id: leadId });
    const lead: any = leads[0];
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMin * 60000);

    // Get the shared Google Calendar connection (builder's account)
    const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const accessToken = conn.accessToken;
    if (!accessToken) return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });

    const summary = title || `Discovery call — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`;
    const description = notes
      ? `${notes}\n\n— Lead —\n${lead.name}${lead.company ? `\n${lead.company}` : ''}${lead.email ? `\n${lead.email}` : ''}${lead.phone ? `\n${lead.phone}` : ''}${lead.reason_needed ? `\n\nWhy: ${lead.reason_needed}` : ''}`
      : `Discovery call with ${lead.name}${lead.company ? ` from ${lead.company}` : ''}.${lead.reason_needed ? `\n\nWhy they may need us: ${lead.reason_needed}` : ''}`;

    const attendees: any[] = [];
    if (lead.email) attendees.push({ email: lead.email });

    // Create the event with a Google Meet conference link
    const eventRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          attendees,
          conferenceData: {
            createRequest: { requestId: `aurelius-${leadId}-${start.getTime()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
          },
          reminders: { useDefault: true },
        }),
      }
    );

    if (!eventRes.ok) {
      const errText = await eventRes.text();
      return Response.json({ error: `Google Calendar error: ${errText}` }, { status: 502 });
    }

    const event = await eventRes.json();
    const meetLink = event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || event.hangoutLink || '';

    // Update the lead
    await base44.entities.Lead.update(leadId, {
      status: 'meeting',
      next_action: `Discovery call booked: ${start.toLocaleString()}`,
    });

    // Log activity + notification
    await base44.entities.Activity.create({
      type: 'meeting',
      description: `Discovery call booked with ${lead.name} — ${start.toLocaleString()}${meetLink ? ' (Google Meet)' : ''}`,
      actor: 'aurelius',
      sub_agent: 'calendar_agent',
      severity: 'success',
      related_type: 'Lead',
      related_id: leadId,
      metadata: { event_id: event.id, start: start.toISOString(), meet_link: meetLink },
    });
    await base44.entities.Notification.create({
      title: `Discovery call booked — ${lead.name}`,
      content: `${start.toLocaleString()}${meetLink ? `\n${meetLink}` : ''}`,
      type: 'meeting',
      severity: 'info',
      read: false,
      related_type: 'Lead',
      related_id: leadId,
      action_url: meetLink || undefined,
    });

    return Response.json({
      status: 'booked',
      event_id: event.id,
      html_link: event.htmlLink,
      meet_link: meetLink,
      start: start.toISOString(),
      end: end.toISOString(),
      lead: { id: leadId, name: lead.name, status: 'meeting' },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}