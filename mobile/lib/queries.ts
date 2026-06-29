import { supabase } from './supabase';
import type { Product, SavedItem } from '../types/db';

// Explicit column list keeps the heavy/irrelevant `embedding` (pgvector) column
// off the wire — we never use it on the client.
const PRODUCT_COLUMNS =
  'id, source, external_id, merchant, brand, title, description, category, ' +
  'price, original_price, currency, image_url, product_url, colors, sizes, ' +
  'in_stock, attributes, created_at, updated_at';

/**
 * Fetch up to 30 in-stock products, newest first. An empty query returns the
 * latest items; a non-empty query does a case-insensitive contains match on
 * title OR category.
 */
export async function fetchProducts(rawQuery: string): Promise<Product[]> {
  const q = rawQuery.trim();

  let builder = supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (q.length > 0) {
    // Strip characters that have special meaning in PostgREST's .or()/LIKE
    // grammar ( , ( ) % ) so user input can't break the filter expression.
    const safe = q.replace(/[,()%]/g, ' ').trim();
    if (safe.length > 0) {
      builder = builder.or(`title.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
  }

  const { data, error } = await builder.overrideTypes<Product[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

/**
 * Persist a right-swipe. price_at_save snapshots the price now so later
 * price-drop tracking has a baseline. folder_id null => the "All saves" bucket.
 */
export async function saveProduct(product: Product): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error('Not signed in — cannot save this item.');

  const { error } = await supabase.from('saved_items').insert({
    user_id: user.id,
    product_id: product.id,
    price_at_save: product.price,
    folder_id: null,
  });
  if (error) throw error;
}

/** A saved row with its joined product and (optional) folder name. */
export type SavedEntry = SavedItem & {
  products: Product | null;
  folders: { name: string } | null;
};

/** A folder's worth of saves, ready for a SectionList. */
export type SavedSection = {
  title: string;
  folderId: string | null;
  data: SavedEntry[];
};

const ALL_SAVES = 'All saves';

/**
 * Fetch the current user's saves joined to products and folder names. RLS scopes
 * rows to auth.uid(), so no explicit user filter is required.
 */
export async function fetchSavedItems(): Promise<SavedEntry[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('*, products(*), folders(name)')
    .order('created_at', { ascending: false })
    .overrideTypes<SavedEntry[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

/** Group saves into sections by folder; null folder => "All saves" (shown first). */
export function groupByFolder(items: SavedEntry[]): SavedSection[] {
  const buckets = new Map<string | null, SavedSection>();

  for (const item of items) {
    const key = item.folder_id;
    const title = item.folders?.name ?? ALL_SAVES;
    const existing = buckets.get(key);
    if (existing) {
      existing.data.push(item);
    } else {
      buckets.set(key, { title, folderId: key, data: [item] });
    }
  }

  // "All saves" first, then named folders alphabetically.
  return [...buckets.values()].sort((a, b) => {
    if (a.folderId === null) return -1;
    if (b.folderId === null) return 1;
    return a.title.localeCompare(b.title);
  });
}
