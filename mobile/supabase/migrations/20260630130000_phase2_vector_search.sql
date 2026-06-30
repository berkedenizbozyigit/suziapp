-- ============================================================================
-- Phase 2 — Vector search: query embedding column, re-embed tracking, match RPC
-- ============================================================================
-- Project: Suzi (Supabase ref gmwzevruiqrttymlpxec) — public schema.
--
-- DECISION GATE OUTCOME: provider = Cohere Embed v4 @ output_dimension = 1536.
-- 1536 == the existing products.embedding dimension, so the pgvector column and
-- the cosine HNSW index (products_embedding_idx, vector_cosine_ops) are REUSED
-- AS-IS — no column change, no index rebuild. We only re-embed the *values*
-- (old = OpenAI text-only; new = Cohere multimodal); tracked by embedding_model.
--
-- FORWARD-ONLY + IDEMPOTENT + ADDITIVE. Safe to re-run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. folders.query_embedding — deferred from Phase 1, now that DIM = 1536.
--    Lets a folder be "continued" later from its seed query vector.
-- ----------------------------------------------------------------------------
alter table public.folders
  add column if not exists query_embedding vector(1536);

-- ----------------------------------------------------------------------------
-- 2. products: track which model produced each embedding, for resumable +
--    idempotent re-embedding and future provider swaps. Re-embed only rows
--    where embedding_model is distinct from the current target.
-- ----------------------------------------------------------------------------
alter table public.products
  add column if not exists embedding_model text;
alter table public.products
  add column if not exists embedded_at timestamptz;

-- Partial index to cheaply find rows still needing (re-)embedding at scale.
create index if not exists products_needs_embedding_idx
  on public.products (id)
  where embedding_model is null;

-- ----------------------------------------------------------------------------
-- 3. match_products — cosine nearest-neighbor over the HNSW index.
--    SECURITY INVOKER so the caller's RLS still applies (products is public
--    read). Returns only id + similarity score; never exposes the vector.
--    cosine distance is `<=>` (matches vector_cosine_ops); similarity = 1 - dist.
-- ----------------------------------------------------------------------------
create or replace function public.match_products(
  query_embedding vector(1536),
  match_count     int  default 20,
  exclude_ids     uuid[] default '{}'
)
returns table (id uuid, score real)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id,
         (1 - (p.embedding <=> query_embedding))::real as score
  from public.products p
  where p.embedding is not null
    and p.in_stock = true
    and not (p.id = any(exclude_ids))
  order by p.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 20), 100));
$$;

comment on function public.match_products(vector, int, uuid[]) is
  'Cosine kNN over products.embedding (HNSW). Returns id + similarity (0..1), '
  'in-stock only, excluding exclude_ids. SECURITY INVOKER — respects RLS.';

commit;
