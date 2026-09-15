import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';
import { buildSystemPrompt } from '../../shared/aureliusPrompt.ts';

// Aurelius central brain. Takes a user command, retrieves relevant memory,
// reasons with the LLM, then executes the returned plan: creates tasks,
// activities, approvals, notifications, and memory — all scoped to the user.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || '').trim();
    const conversationId: string | undefined = body.conversation_id;
    if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });

    // --- Load context in parallel ---
    const [profiles, memories, activities, pendingApprovals, runningTasks, conversations, leads] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by_id: user.id }),
      base44.entities.AgentMemory.filter({ created_by_id: user.id }, '-importance', 25),
      base44.entities.Activity.filter({ created_by_id: user.id }, '-created_date', 8),
      base44.entities.Approval.filter({ created_by_id: user.id, status: 'pending' }),
      base44.entities.Task.filter({ created_by_id: user.id, status: { $in: ['running', 'pending'] } }, '-created_date', 8),
      conversationId ? base44.entities.Conversation.filter({ id: conversationId, created_by_id: user.id }) : Promise.resolve([]),
      base44.entities.Lead.filter({ created_by_id: user.id }, '-lead_score', 30),
    ]);

    const profile: any = profiles[0] || {};
    const autonomyMode: string = profile.autonomy_mode || body.autonomy_mode || 'manual';
    const memoryContext = memories.map((m: any) => `- [${m.memory_type}] ${m.title}: ${m.content}`).join('\n');
    const activityContext = activities.map((a: any) => `- ${a.description}`).join('\n');

    const systemPrompt = buildSystemPrompt({
      profile,
      autonomyMode,
      memoryContext,
      activityContext,
      pendingApprovals: pendingApprovals.length,
      runningTasks: runningTasks.length,
    });

    // --- Reason with the LLM ---
    const leadRoster = leads.map((l: any) => `- id:${l.id} | ${l.name}${l.company ? ` @ ${l.company}` : ''}${l.email ? ` <${l.email}>` : ''} (score ${l.lead_score || 0}, status ${l.status || 'new'})`).join('\n');
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\n=== USER COMMAND ===\n${message}\n\n=== LEADS (use the exact id when scheduling or referencing a lead) ===\n${leadRoster || '(no leads yet)'}\n\nWhen the user wants to book/schedule a discovery call, classify intent as "schedule_call", set action_type "calendar_change" on the task, and include in payload: lead_id (from the roster above), start (ISO 8601 datetime), duration_minutes, title, notes. Produce the JSON response now.`,
      response_json_schema: {
        type: 'object',
        properties: {
          reply: { type: 'string', description: 'Concise human-facing summary of what you understood and what you will do' },
          intent: { type: 'string', description: 'Classified intent, e.g. lead_search, job_search, schedule_call, reply, follow_up, research, briefing, general' },
          sub_agent: { type: 'string', description: 'Primary sub-agent that should own this work' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                goal: { type: 'string' },
                assigned_agent: { type: 'string', default: 'aurelius' },
                sub_agent: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                action_type: { type: 'string' },
                requires_approval: { type: 'boolean' },
                payload: { type: 'object' },
                steps: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, agent: { type: 'string' } } } }
              },
              required: ['title', 'goal']
            }
          },
          memory_updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                memory_type: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                importance: { type: 'number' }
              },
              required: ['memory_type', 'title', 'content']
            }
          },
          notifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                type: { type: 'string' },
                severity: { type: 'string', enum: ['info', 'success', 'warning', 'error'] }
              },
              required: ['title', 'type']
            }
          }
        },
        required: ['reply', 'intent', 'tasks']
      },
      model: 'automatic'
    });

    const plan: any = llmResult;
    const reply: string = plan.reply || 'Understood. I have logged your request.';
    const tasks: any[] = plan.tasks || [];
    const memoryUpdates: any[] = plan.memory_updates || [];
    const notifications: any[] = plan.notifications || [];

    // --- Decide approval requirements based on autonomy + per-action controls ---
    const controls = profile.action_controls || {};
    const externalActions = new Set(['email_send', 'follow_up', 'job_submit', 'calendar_change', 'browser_action']);
    const needsApproval = (actionType: string) => {
      if (!actionType || !externalActions.has(actionType)) return false;
      if (autonomyMode === 'manual') return true;
      if (autonomyMode === 'assisted') return true;
      // autonomous: only require approval if the specific action control is off
      const key = actionType === 'follow_up' ? 'follow_ups' : actionType;
      return controls[key] !== true;
    };

    // --- Execute the plan ---
    const createdTasks: any[] = [];
    const createdApprovals: any[] = [];

    for (const t of tasks) {
      const requiresApproval = t.requires_approval ?? needsApproval(t.action_type);
      const status = requiresApproval ? 'waiting_for_approval' : (t.action_type ? 'pending' : 'pending');
      const newTask = await base44.entities.Task.create({
        title: t.title,
        goal: t.goal,
        status,
        assigned_agent: t.assigned_agent || 'aurelius',
        sub_agent: t.sub_agent || plan.sub_agent || undefined,
        intent: plan.intent,
        priority: t.priority || 'medium',
        action_type: t.action_type,
        payload: t.payload || null,
        steps: (t.steps || []).map((s: any) => ({ label: s.label, agent: s.agent || t.sub_agent || 'aurelius', status: 'pending' })),
        autonomy_mode: autonomyMode,
        requires_approval: requiresApproval,
        conversation_id: conversationId || undefined,
        audit_trail: [{ ts: new Date().toISOString(), event: 'task_created', note: `Intent: ${plan.intent}` }]
      });
      createdTasks.push(newTask);

      await base44.entities.Activity.create({
        type: 'task_created',
        description: `Planned: ${t.title}${t.sub_agent ? ` → ${t.sub_agent}` : ''}`,
        actor: 'aurelius',
        sub_agent: t.sub_agent || undefined,
        severity: 'info',
        task_id: newTask.id,
        metadata: { intent: plan.intent, priority: t.priority }
      });

      if (requiresApproval) {
        const approval = await base44.entities.Approval.create({
          title: `Approve: ${t.title}`,
          description: t.goal,
          action_type: t.action_type || 'action',
          payload: t.payload || { task: t.title, goal: t.goal },
          status: 'pending',
          task_id: newTask.id
        });
        createdApprovals.push(approval);
        await base44.entities.Activity.create({
          type: 'approval_requested',
          description: `Approval needed for: ${t.title}`,
          actor: 'aurelius',
          severity: 'warning',
          task_id: newTask.id,
          related_type: 'Approval',
          related_id: approval.id
        });
      }
    }

    // --- Store memory updates ---
    const createdMemories: any[] = [];
    for (const m of memoryUpdates) {
      const mem = await base44.entities.AgentMemory.create({
        memory_type: m.memory_type || 'fact',
        title: m.title,
        content: m.content,
        importance: m.importance || 5,
        source: 'aurelius_chat'
      });
      createdMemories.push(mem);
    }

    // --- Create notifications ---
    for (const n of notifications) {
      await base44.entities.Notification.create({
        title: n.title,
        content: n.content || '',
        type: n.type || 'info',
        severity: n.severity || 'info',
        read: false
      });
    }

    // --- Log the conversation turn ---
    await base44.entities.Activity.create({
      type: 'aurelius_command',
      description: `Command: "${message.slice(0, 120)}"`,
      actor: 'user',
      severity: 'info',
      metadata: { intent: plan.intent, sub_agent: plan.sub_agent, conversation_id: conversationId || null }
    });

    // --- Persist / update conversation ---
    let conversation = conversations[0];
    const turn = { role: 'user', content: message, ts: new Date().toISOString() };
    const assistantTurn = { role: 'assistant', content: reply, ts: new Date().toISOString() };
    if (conversation) {
      const msgs = (conversation.messages || []).concat([turn, assistantTurn]);
      await base44.entities.Conversation.update(conversation.id, {
        messages: msgs.slice(-40),
        last_message_at: new Date().toISOString(),
        summary: plan.intent
      });
    } else {
      conversation = await base44.entities.Conversation.create({
        title: message.slice(0, 60),
        summary: plan.intent,
        autonomy_mode: autonomyMode,
        messages: [turn, assistantTurn],
        last_message_at: new Date().toISOString()
      });
    }

    // --- If this is a lead search, kick off lead discovery in the background ---
    if (plan.intent === 'lead_search') {
      waitUntil(base44.functions.invoke('lead_discovery', { message }).catch(() => {}));
    }

    // --- If scheduling a discovery call, book it when autonomy allows ---
    if (plan.intent === 'schedule_call') {
      const scheduleTask = tasks.find((t: any) => t.action_type === 'calendar_change');
      const p: any = scheduleTask?.payload || {};
      const allow = !needsApproval('calendar_change');
      if (allow && p.start) {
        let leadId: string | undefined = p.lead_id;
        if (!leadId && (p.lead_name || p.lead_email)) {
          const match = leads.find((l: any) =>
            (p.lead_email && l.email && l.email.toLowerCase() === String(p.lead_email).toLowerCase()) ||
            (p.lead_name && l.name && l.name.toLowerCase().includes(String(p.lead_name).toLowerCase()))
          );
          leadId = match?.id;
        }
        if (leadId) {
          waitUntil(base44.functions.invoke('book_discovery_call', {
            lead_id: leadId, start: p.start, duration_minutes: p.duration_minutes, title: p.title, notes: p.notes
          }).catch(() => {}));
        }
      }
    }

    return Response.json({
      reply,
      intent: plan.intent,
      sub_agent: plan.sub_agent,
      conversation_id: conversation.id,
      tasks: createdTasks.map((t) => ({ id: t.id, title: t.title, status: t.status, sub_agent: t.sub_agent, requires_approval: t.requires_approval })),
      approvals: createdApprovals.map((a) => ({ id: a.id, title: a.title, action_type: a.action_type })),
      memories_created: createdMemories.length,
      notifications_created: notifications.length
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}