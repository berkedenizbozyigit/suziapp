import { supabase } from './supabase';
import type { Message, MessageRole } from '../types/db';

// Ask Suzi persistence. folderId null = the global thread. RLS scopes rows to
// auth.uid(), so no explicit user filter is needed on reads.

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not signed in.');
  return data.user.id;
}

/** Fetch a thread oldest-first (folderId null = global Ask Suzi thread). */
export async function fetchThread(folderId: string | null = null): Promise<Message[]> {
  const base = supabase.from('messages').select('*').order('created_at', { ascending: true });
  const builder = folderId === null ? base.is('folder_id', null) : base.eq('folder_id', folderId);
  const { data, error } = await builder;
  if (error) throw error;
  return data ?? [];
}

/** Persist one message and return the stored row. */
export async function sendMessage(
  role: MessageRole,
  content: string,
  folderId: string | null = null,
): Promise<Message> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id, role, content, folder_id: folderId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
