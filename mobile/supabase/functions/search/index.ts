// ============================================================================
// search — text and/or image query -> ranked product deck (pgvector cosine kNN)
// ============================================================================
// Request:  { text?, imageUrl?, folderId?, limit?, excludeProductIds? }
// Response: { deck: [{ productId, score }], reason? }
//
// Runs under the CALLER's JWT (anon or real), so match_products' SECURITY
// INVOKER respects RLS. Embedding failures degrade to an empty deck + reason
// (never a 5xx crash) so the client can show a "broaden / look harder" state.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';
import { embed, EmbedError, toVectorLiteral } from '../_shared/embed.ts';
import {
  clampInt,
  corsHeaders,
  errorResponse,
  isUuid,
  jsonResponse,
  log,
  newRequestId,
} from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const requestId = newRequestId();
  const started = Date.now();

  if (req.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Use POST', requestId);
  }

  // --- validate body ---
  let body: Record<string, unknown> | null;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'bad_json', 'Body must be valid JSON', requestId);
  }
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'bad_json', 'Body must be a JSON object', requestId);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  if (!text && !imageUrl) {
    return errorResponse(400, 'empty_query', 'Provide text and/or imageUrl', requestId);
  }

  const limit = clampInt(body.limit, 20, 1, 50);
  const excludeIds = Array.isArray(body.excludeProductIds)
    ? body.excludeProductIds.filter(isUuid).slice(0, 1000)
    : [];
  const folderId = isUuid(body.folderId) ? body.folderId : null;
  const input = text && imageUrl ? 'text+image' : text ? 'text' : 'image';

  // Client bound to the caller's JWT (identity + RLS).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  // --- 1) embed the query (graceful provider fallback) ---
  let queryVec: number[];
  try {
    queryVec = await embed({
      text: text || undefined,
      imageUrl: imageUrl || undefined,
      inputType: 'search_query',
    });
  } catch (e) {
    const status = e instanceof EmbedError ? e.status : 502;
    log({ requestId, fn: 'search', userId, input, outcome: 'embed_error', status,
      ms: Date.now() - started, error: String(e) });
    // user-visible fallback, not a crash
    return jsonResponse(200, { deck: [], reason: 'provider_unavailable' });
  }

  // --- 2) cosine kNN over the HNSW index (RLS-respecting RPC) ---
  const { data: rows, error } = await supabase.rpc('match_products', {
    query_embedding: toVectorLiteral(queryVec),
    match_count: limit,
    exclude_ids: excludeIds,
  });
  if (error) {
    log({ requestId, fn: 'search', userId, input, outcome: 'rpc_error',
      ms: Date.now() - started, error: error.message });
    return errorResponse(500, 'search_failed', 'Search failed', requestId);
  }

  const deck = (rows ?? []).map((r: { id: string; score: number }) => ({
    productId: r.id,
    score: r.score,
  }));

  // --- 3) best-effort: seed the folder's query so it can be continued later ---
  if (folderId) {
    const { error: persistErr } = await supabase.from('folders')
      .update({ query_text: text || null, query_embedding: toVectorLiteral(queryVec) })
      .eq('id', folderId);
    if (persistErr) {
      log({ requestId, fn: 'search', userId, outcome: 'folder_persist_failed',
        error: persistErr.message });
    }
  }

  const reason = deck.length === 0 ? 'no_matches' : undefined;
  log({ requestId, fn: 'search', userId, input, count: deck.length,
    ms: Date.now() - started, outcome: 'ok' });
  return jsonResponse(200, { deck, reason });
});
