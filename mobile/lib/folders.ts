import { supabase } from './supabase';
import { PRODUCT_COLUMNS } from './queries';
import { buildFolderCards, type FolderCard, type FolderRow, type SaveRow } from './folderCards';
import type { Product } from '../types/db';

// Phase 4 — "folders as conversations". A folder is a saved search: it stores the
// query_text that produced it, so opening the folder can "continue" that search
// back into the swipe deck. Folders are born from searches (auto-created on the
// first save), not from a manual "new folder" form.

// Re-exported so screens keep importing FolderCard from '../lib/folders'. The
// pure aggregation lives in ./folderCards (unit-tested there).
export type { FolderCard };

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not signed in.');
  return data.user.id;
}

/**
 * Find the user's existing folder for this exact search text, or create one.
 * Keyed on query_text so re-running the same search continues ONE conversation
 * instead of spawning duplicate folders.
 */
export async function getOrCreateFolderForQuery(
  queryText: string,
  name: string,
): Promise<string> {
  const userId = await currentUserId();
  const q = queryText.trim();

  const { data: existing, error: selErr } = await supabase
    .from('folders')
    .select('id')
    .eq('user_id', userId)
    .eq('query_text', q)
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from('folders')
    .insert({ user_id: userId, name: name.trim() || q, query_text: q })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id;
}

/**
 * Build the Picks grid: every folder (with item count + a cover image) plus an
 * "All saves" card when unfiled saves exist. One `saved_items` read is reused to
 * compute counts/covers, avoiding an N+1 query per folder.
 */
export async function listFolderCards(): Promise<FolderCard[]> {
  const [foldersRes, savesRes] = await Promise.all([
    supabase
      .from('folders')
      .select('id, name, query_text, created_at')
      .order('created_at', { ascending: false })
      .overrideTypes<FolderRow[], { merge: false }>(),
    supabase
      .from('saved_items')
      .select('folder_id, products(image_url)')
      .order('created_at', { ascending: false })
      .overrideTypes<SaveRow[], { merge: false }>(),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (savesRes.error) throw savesRes.error;

  return buildFolderCards(foldersRes.data ?? [], savesRes.data ?? []);
}

/**
 * A folder's saved products, newest first. `folderId === null` returns the
 * unfiled saves ("All saves").
 */
export async function listFolderProducts(folderId: string | null): Promise<Product[]> {
  const base = supabase
    .from('saved_items')
    .select(`products(${PRODUCT_COLUMNS})`)
    .order('created_at', { ascending: false });
  const builder = folderId === null ? base.is('folder_id', null) : base.eq('folder_id', folderId);

  const { data, error } = await builder.overrideTypes<
    Array<{ products: Product | null }>,
    { merge: false }
  >();
  if (error) throw error;
  return (data ?? []).map((r) => r.products).filter((p): p is Product => p !== null);
}
