// ============================================================================
// reembed — backfill products.embedding with the current provider (Cohere v4)
// ============================================================================
// ADMIN-ONLY (x-admin-secret header == ADMIN_TASK_SECRET). Uses the service
// role to write products (clients have no write policy on the catalog).
//
// RESUMABLE + IDEMPOTENT: processes only rows whose embedding_model differs from
// the current target, in batches. Re-invoke until `remaining` is 0. Safe to
// re-run; failed rows keep their old embedding_model and are retried next call.
//
// Each product is embedded as image + compact text in ONE vector, so both photo
// and text queries retrieve it (input_type = search_document).
//
// Body (optional): { batchSize?: number }   default 25, max 100
// Response: { processed, failed, remaining, failures: [{id,error}] }
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';
import { embed, EMBED_MODEL, toVectorLiteral } from '../_shared/embed.ts';
import { clampInt, corsHeaders, errorResponse, jsonResponse, log, newRequestId } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SECRET = Deno.env.get('ADMIN_TASK_SECRET') ?? '';

// Re-embed rows that have no model yet OR were embedded by a different model.
const STALE_FILTER = `embedding_model.is.null,embedding_model.neq.${EMBED_MODEL}`;

interface ProductRow {
  id: string;
  title: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const requestId = newRequestId();
  const started = Date.now();

  if (req.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Use POST', requestId);
  }
  // --- admin guard ---
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return errorResponse(403, 'forbidden', 'Valid x-admin-secret required', requestId);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }
  const batchSize = clampInt(body.batchSize, 25, 1, 100);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // --- pull one stale batch ---
  const { data: rows, error } = await admin
    .from('products')
    .select('id, title, brand, category, description, image_url')
    .or(STALE_FILTER)
    .limit(batchSize);
  if (error) {
    log({ requestId, fn: 'reembed', outcome: 'select_failed', error: error.message });
    return errorResponse(500, 'select_failed', error.message, requestId);
  }

  // --- embed + update each ---
  let processed = 0;
  let failed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const p of (rows ?? []) as ProductRow[]) {
    try {
      const text =
        [p.title, p.brand, p.category, p.description].filter(Boolean).join(' . ') || undefined;
      const vec = await embed({
        text,
        imageUrl: p.image_url ?? undefined,
        inputType: 'search_document',
      });
      const { error: upErr } = await admin
        .from('products')
        .update({
          embedding: toVectorLiteral(vec),
          embedding_model: EMBED_MODEL,
          embedded_at: new Date().toISOString(),
        })
        .eq('id', p.id);
      if (upErr) throw new Error(upErr.message);
      processed++;
    } catch (e) {
      failed++;
      failures.push({ id: p.id, error: String(e) });
      log({ requestId, fn: 'reembed', productId: p.id, outcome: 'embed_failed', error: String(e) });
    }
  }

  // --- how many still need embedding (for the caller's resume loop) ---
  const { count: remaining } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .or(STALE_FILTER);

  log({ requestId, fn: 'reembed', processed, failed, remaining: remaining ?? null,
    ms: Date.now() - started, outcome: 'ok' });
  return jsonResponse(200, { processed, failed, remaining: remaining ?? 0, failures });
});
