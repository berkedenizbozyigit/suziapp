import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubscribe } from '../lib/subscribe-handler.js';

// A fake `save` that records every call.
function recorder() {
  const calls = [];
  const fn = async (arg) => { calls.push(arg); };
  fn.calls = calls;
  return fn;
}

test('rejects non-POST methods with 405', async () => {
  const save = recorder();
  const res = await handleSubscribe({ method: 'GET', body: {}, save });
  assert.equal(res.status, 405);
  assert.equal(save.calls.length, 0);
});

test('silently accepts and drops honeypot submissions', async () => {
  const save = recorder();
  const res = await handleSubscribe({
    method: 'POST',
    body: { email: 'bot@spam.com', website: 'http://spam' },
    save,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(save.calls.length, 0); // never stored
});

test('rejects an invalid email with 400', async () => {
  const save = recorder();
  const res = await handleSubscribe({ method: 'POST', body: { email: 'nope' }, save });
  assert.equal(res.status, 400);
  assert.equal(save.calls.length, 0);
});

test('stores a valid, normalized email and returns 200', async () => {
  const save = recorder();
  const res = await handleSubscribe({
    method: 'POST',
    body: { email: '  Person@Example.COM ' },
    save,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.deepEqual(save.calls, [{ email: 'person@example.com' }]);
});

test('returns 500 when save throws', async () => {
  const save = async () => { throw new Error('db down'); };
  const res = await handleSubscribe({ method: 'POST', body: { email: 'a@b.com' }, save });
  assert.equal(res.status, 500);
  assert.equal(res.body.ok, false);
});
