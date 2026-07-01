import { supabase } from './supabase';

/** Result of bootstrapping a session at launch. */
export type SessionResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'anon_disabled' | 'network' | 'unknown'; message: string };

/**
 * Ensure there is an authenticated session so RLS (auth.uid()) lets the user
 * read/write their own saved_items. If none exists we sign in anonymously.
 *
 * Anonymous sign-in must be enabled in the Supabase dashboard
 * (Authentication -> Providers -> Anonymous). If it's off, Supabase returns a
 * 422 "Anonymous sign-ins are disabled" — we surface a clear, actionable message
 * instead of failing silently.
 */
export async function ensureSession(): Promise<SessionResult> {
  try {
    const { data: existing, error: getErr } = await supabase.auth.getSession();
    if (getErr) {
      return { ok: false, reason: 'unknown', message: getErr.message };
    }
    if (existing.session) {
      return { ok: true, userId: existing.session.user.id };
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      const disabled = /anonymous/i.test(error.message);
      if (disabled) {
        const message =
          'Anonymous sign-in is DISABLED. Enable it in Supabase: ' +
          'Authentication -> Providers -> Anonymous, then reload the app.';
        console.warn(`[auth] ${message}`);
        return { ok: false, reason: 'anon_disabled', message };
      }
      console.warn(`[auth] sign-in failed: ${error.message}`);
      return { ok: false, reason: 'unknown', message: error.message };
    }

    if (!data.user) {
      return { ok: false, reason: 'unknown', message: 'No user returned from sign-in.' };
    }
    return { ok: true, userId: data.user.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error during sign-in.';
    console.warn(`[auth] ${message}`);
    return { ok: false, reason: 'network', message };
  }
}

// --- Phase 5: anonymous → permanent account upgrade -------------------------

/** Whether the current session is an anonymous (not-yet-upgraded) user. */
export async function getIsAnonymous(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.is_anonymous ?? false;
}

/**
 * Begin upgrading the anonymous user to a permanent account by attaching an
 * email. Supabase emails a 6-digit code. The user id is UNCHANGED, so all
 * existing saved_items / folders / messages keep working.
 */
export async function startEmailUpgrade(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

/** Complete the upgrade by verifying the emailed 6-digit code. */
export async function verifyEmailUpgrade(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email_change',
  });
  if (error) throw error;
}
