// Pure Ask Suzi logic — no network / React Native imports, so it unit-tests in
// plain Node. Suzi has no LLM backend (by design: no extra cost/complexity); a
// message is turned into a search the user can swipe. lib/messages.ts persists.

import type { MessageRole } from '../types/db';

/** Suzi's response to a user message: what she says + the search to run (if any). */
export type SuziReply = {
  text: string;
  searchQuery: string | null;
};

/** Turn a user's message into Suzi's reply. A non-empty message becomes a search;
 *  an empty one just nudges the user. */
export function composeSuziReply(userText: string): SuziReply {
  const q = userText.trim();
  if (!q) {
    return { text: "Tell me what you're after and I'll hunt it down.", searchQuery: null };
  }
  return { text: `On it — here's what I found for “${q}”. Swipe to sort them.`, searchQuery: q };
}

/** A minimal message shape for pairing (decoupled from the full DB Row). */
export type ThreadTurn = { role: MessageRole; content: string | null };

/**
 * The search a "Swipe these" button under a Suzi bubble should run: the trimmed
 * text of the user message immediately before it. Returns null when the message
 * at `index` isn't a Suzi reply to a non-empty user message.
 */
export function queryForSuziMessage(thread: ThreadTurn[], index: number): string | null {
  const current = thread[index];
  if (!current || current.role !== 'suzi') return null;
  const prev = thread[index - 1];
  const q = prev && prev.role === 'user' ? (prev.content ?? '').trim() : '';
  return q.length > 0 ? q : null;
}
