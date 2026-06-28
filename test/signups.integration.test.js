import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertSignup } from '../lib/signups.js';
import { query, endPool } from '../lib/db.js';

const RUN = Boolean(process.env.POSTGRES_URL);
const EMAIL = 'integration-test@suzi.local';

test('insertSignup is idempotent (created once, no-op after)', { skip: !RUN }, async () => {
  await query('DELETE FROM signups WHERE email = $1', [EMAIL]);

  const first = await insertSignup(EMAIL);
  assert.equal(first.created, true);

  const second = await insertSignup(EMAIL);
  assert.equal(second.created, false);

  await query('DELETE FROM signups WHERE email = $1', [EMAIL]);
});

test.after(async () => { if (RUN) await endPool(); });
