// Pure email helpers — no I/O, fully unit-testable.

export function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

// Pragmatic format check: text@text.tld with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}
