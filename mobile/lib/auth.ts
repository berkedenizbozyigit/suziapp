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
