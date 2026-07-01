import { describe, expect, it } from 'vitest';

import { composeSuziReply, queryForSuziMessage, type ThreadTurn } from '../lib/askSuzi';

describe('composeSuziReply', () => {
  it('turns a non-empty message into a search and echoes it back', () => {
    const reply = composeSuziReply('  linen summer dress  ');
    expect(reply.searchQuery).toBe('linen summer dress');
    expect(reply.text).toContain('linen summer dress');
  });

  it('returns no search for an empty / whitespace message', () => {
    expect(composeSuziReply('   ').searchQuery).toBeNull();
    expect(composeSuziReply('').searchQuery).toBeNull();
  });
});

describe('queryForSuziMessage', () => {
  const thread: ThreadTurn[] = [
    { role: 'user', content: 'white sneakers' },
    { role: 'suzi', content: 'On it — here are some white sneakers.' },
    { role: 'suzi', content: 'orphan suzi message' },
    { role: 'user', content: '   ' },
    { role: 'suzi', content: 'reply to blank' },
  ];

  it('returns the preceding user message for a Suzi reply', () => {
    expect(queryForSuziMessage(thread, 1)).toBe('white sneakers');
  });

  it('returns null when the message is not a Suzi reply', () => {
    expect(queryForSuziMessage(thread, 0)).toBeNull();
  });

  it('returns null when the previous message is not a user message', () => {
    expect(queryForSuziMessage(thread, 2)).toBeNull();
  });

  it('returns null when the preceding user message is blank', () => {
    expect(queryForSuziMessage(thread, 4)).toBeNull();
  });

  it('returns null for an out-of-range index', () => {
    expect(queryForSuziMessage(thread, 99)).toBeNull();
  });
});
