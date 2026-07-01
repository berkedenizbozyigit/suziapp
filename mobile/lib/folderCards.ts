// Pure, import-clean logic for the Picks grid — no Supabase / React Native
// imports, so it can be unit-tested in plain Node (Vitest). lib/folders.ts wraps
// this with the actual queries.

/** A folder card for the Picks grid. `id === null` is the "All saves" pseudo-
 *  folder that collects unfiled saves (folder_id IS NULL). */
export type FolderCard = {
  id: string | null;
  name: string;
  queryText: string | null;
  count: number;
  coverImage: string | null;
};

/** Shape of a folders row we read for the grid. */
export type FolderRow = {
  id: string;
  name: string;
  query_text: string | null;
  created_at: string;
};

/** Shape of a saved_items row (joined to its product's image) we read for the grid. */
export type SaveRow = {
  folder_id: string | null;
  products: { image_url: string | null } | null;
};

/**
 * Fold folder rows + saved-item rows into Picks cards:
 *  - count = number of saves per folder,
 *  - coverImage = the FIRST available product image (callers pass saves
 *    newest-first, so the cover is the most recent image),
 *  - an "All saves" card is prepended IFF unfiled saves (folder_id null) exist.
 *
 * Folders keep the order they were passed in; "All saves" always comes first.
 */
export function buildFolderCards(folders: FolderRow[], saves: SaveRow[]): FolderCard[] {
  const agg = new Map<string | null, { count: number; cover: string | null }>();
  for (const s of saves) {
    const cur = agg.get(s.folder_id) ?? { count: 0, cover: null };
    cur.count += 1;
    if (!cur.cover && s.products?.image_url) cur.cover = s.products.image_url;
    agg.set(s.folder_id, cur);
  }

  const cards: FolderCard[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    queryText: f.query_text,
    count: agg.get(f.id)?.count ?? 0,
    coverImage: agg.get(f.id)?.cover ?? null,
  }));

  const unfiled = agg.get(null);
  if (unfiled && unfiled.count > 0) {
    cards.unshift({
      id: null,
      name: 'All saves',
      queryText: null,
      count: unfiled.count,
      coverImage: unfiled.cover,
    });
  }

  return cards;
}
