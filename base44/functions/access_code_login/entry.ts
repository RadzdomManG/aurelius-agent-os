import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Validates a customer access code server-side and issues an opaque session
// token. Codes are never sent to the client — only the session token is.
// The session token is validated again on every data request (customer_data).
export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = (body.code || '').toString().trim();
    if (!code) return Response.json({ error: 'Please enter an access code.' }, { status: 400 });

    const codes = await base44.asServiceRole.entities.AccessCode.filter({ code });
    const accessCode = codes[0];
    if (!accessCode || !accessCode.active) {
      return Response.json({ error: 'This access code is invalid or has been revoked.' }, { status: 403 });
    }

    const now = new Date();
    let codeExpiresAt = accessCode.expires_at ? new Date(accessCode.expires_at) : null;
    if (!codeExpiresAt) {
      codeExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
        activated_at: now.toISOString(),
        expires_at: codeExpiresAt.toISOString(),
      });
    }
    if (codeExpiresAt <= now) {
      return Response.json({ error: 'This access code has expired.' }, { status: 403 });
    }

    if (accessCode.max_uses && accessCode.max_uses > 0 && (accessCode.uses || 0) >= accessCode.max_uses) {
      return Response.json({ error: 'This access code has reached its usage limit.' }, { status: 403 });
    }

    const token = generateToken();
    const expiresAt = codeExpiresAt.toISOString();
    const session = await base44.asServiceRole.entities.AccessSession.create({
      token,
      code_id: accessCode.id,
      code_label: accessCode.label || '',
      expires_at: expiresAt,
    });

    await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
      uses: (accessCode.uses || 0) + 1,
    });

    return Response.json({ token: session.token, expires_at: session.expires_at, label: accessCode.label || '' });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}