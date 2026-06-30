import { supabase } from './supabase';
import { PRODUCT_COLUMNS } from './queries';
import type { Product } from '../types/db';

export type SearchInput = {
  text?: string;
  imageUrl?: string;
  folderId?: string;
  limit?: number;
  excludeProductIds?: string[];
};

export type SearchOutcome = {
  products: Product[];
  /** undefined when results exist; 'no_matches' | 'provider_unavailable' otherwise. */
  reason?: string;
};

type DeckRow = { productId: string; score: number };

/**
 * Multimodal AI search. Calls the `search` Edge Function (runs under the user's
 * JWT, respects RLS), then hydrates the returned product ids into full Product
 * rows in DECK ORDER (nearest-neighbour rank). The empty case carries a reason
 * so the UI can show a "broaden / look harder" state instead of a blank screen.
 */
export async function searchDeck(input: SearchInput): Promise<SearchOutcome> {
  const { data, error } = await supabase.functions.invoke('search', { body: input });
  if (error) throw error;

  const deck: DeckRow[] = Array.isArray(data?.deck) ? data.deck : [];
  const reason: string | undefined = data?.reason;
  if (deck.length === 0) return { products: [], reason };

  const ids = deck.map((d) => d.productId);
  const { data: rows, error: pErr } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .in('id', ids)
    .overrideTypes<Product[], { merge: false }>();
  if (pErr) throw pErr;

  // Re-order to match the deck (Postgres `in` doesn't preserve order).
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));
  return { products, reason };
}
