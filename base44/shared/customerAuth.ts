// Shared customer-session validation. Used by every backend function that
// serves access-code (customer) sessions, so the authorization boundary is
// identical everywhere: token → session exists → session not expired →
// underlying code still active → code not past its expiry.
export async function validateCustomerSession(base44: any, token: string) {
  if (!token) {
    return { ok: false, status: 401, error: 'Session expired. Please re-enter your access code.' };
  }
  const sessions = await base44.asServiceRole.entities.AccessSession.filter({ token });
  const session = sessions[0];
  if (!session) {
    return { ok: false, status: 401, error: 'Invalid session. Please re-enter your access code.' };
  }
  if (session.expires_at && new Date(session.expires_at) <= new Date()) {
    return { ok: false, status: 401, error: 'Your session has expired. Please re-enter your access code.' };
  }
  const code = await base44.asServiceRole.entities.AccessCode.get(session.code_id).catch(() => null);
  if (!code || !code.active) {
    return { ok: false, status: 403, error: 'This access code has been revoked.' };
  }
  // A code that has passed its expiry date invalidates all sessions issued
  // from it — the customer loses access immediately when the code expires.
  if (code.expires_at && new Date(code.expires_at) <= new Date()) {
    return { ok: false, status: 403, error: 'This access code has expired.' };
  }
  return { ok: true, session, code };
}