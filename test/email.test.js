import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, isValidEmail } from '../lib/email.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
});

test('normalizeEmail handles null/undefined safely', () => {
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

test('isValidEmail accepts a normal address', () => {
  assert.equal(isValidEmail('person@example.com'), true);
});

test('isValidEmail rejects malformed addresses', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@tld'), false);
  assert.equal(isValidEmail('two @spaces.com'), false);
  assert.equal(isValidEmail(''), false);
});
