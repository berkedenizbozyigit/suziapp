import { normalizeEmail, isValidEmail } from './email.js';

// Pure orchestration. `save` is injected: async ({ email }) => void.
// Returns { status, body } — transport-agnostic, so it can be unit-tested
// without HTTP or a database.
export async function handleSubscribe({ method, body, save }) {
  if (method !== 'POST') {
    return { status: 405, body: { ok: false, error: 'Method not allowed' } };
  }

  const data = body ?? {};

  // Honeypot: humans never see/fill `website`. If it's set, a bot did —
  // pretend success but store nothing (cheap spam protection, no CAPTCHA).
  if (data.website) {
    return { status: 200, body: { ok: true } };
  }

  const email = normalizeEmail(data.email);
  if (!isValidEmail(email)) {
    return { status: 400, body: { ok: false, error: 'Invalid email' } };
  }

  try {
    await save({ email });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('subscribe failed:', err);
    return { status: 500, body: { ok: false, error: 'Something went wrong' } };
  }
}
