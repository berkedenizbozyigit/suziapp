import { describe, expect, it } from 'vitest';

import { isValidEmail, shouldPromptUpgrade, UPGRADE_COOLDOWN_MS } from '../lib/authGate';

describe('isValidEmail', () => {
  it('accepts a normal address (trimming whitespace)', () => {
    expect(isValidEmail('  a@b.com ')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    for (const bad of ['', 'nope', 'missing@tld', 'a b@c.com', '@x.com']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});

describe('shouldPromptUpgrade', () => {
  const now = 1_000_000_000_000;

  it('never prompts a non-anonymous (already upgraded) user', () => {
    expect(shouldPromptUpgrade({ isAnonymous: false, lastDismissedAt: null, now })).toBe(false);
  });

  it('prompts an anonymous user who has never dismissed', () => {
    expect(shouldPromptUpgrade({ isAnonymous: true, lastDismissedAt: null, now })).toBe(true);
  });

  it('does not prompt within the cooldown after a dismissal', () => {
    const lastDismissedAt = now - (UPGRADE_COOLDOWN_MS - 1);
    expect(shouldPromptUpgrade({ isAnonymous: true, lastDismissedAt, now })).toBe(false);
  });

  it('prompts again once the cooldown has fully elapsed', () => {
    const lastDismissedAt = now - UPGRADE_COOLDOWN_MS;
    expect(shouldPromptUpgrade({ isAnonymous: true, lastDismissedAt, now })).toBe(true);
  });

  it('honors a custom cooldown', () => {
    expect(
      shouldPromptUpgrade({ isAnonymous: true, lastDismissedAt: now - 500, now, cooldownMs: 1000 }),
    ).toBe(false);
  });
});
