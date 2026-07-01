// Pure, import-clean auth-gating logic (no Supabase / RN), so it unit-tests in
// plain Node. The AuthProvider wires these decisions to the UI.

/** How long to wait after a "Not now" before nudging again. */
export const UPGRADE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

/** How many saves in a session before the first soft upgrade nudge. */
export const SAVES_BEFORE_PROMPT = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim());
}

export type GateState = {
  isAnonymous: boolean;
  /** Epoch ms of the last "Not now", or null if never dismissed. */
  lastDismissedAt: number | null;
  /** Epoch ms "now". */
  now: number;
  cooldownMs?: number;
};

/**
 * Whether a soft upgrade nudge may be shown right now. The caller still decides
 * the *moment* (e.g. after N saves, or opening Picks); this only enforces the
 * cross-cutting rules: only anonymous users, and not within the dismiss cooldown.
 */
export function shouldPromptUpgrade({
  isAnonymous,
  lastDismissedAt,
  now,
  cooldownMs = UPGRADE_COOLDOWN_MS,
}: GateState): boolean {
  if (!isAnonymous) return false;
  if (lastDismissedAt != null && now - lastDismissedAt < cooldownMs) return false;
  return true;
}
