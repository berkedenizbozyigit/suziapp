-- ============================================================================
-- 0000 — Baseline: the pre-existing schema (captured, not changed)
-- ============================================================================
-- Project: Suzi (Supabase ref gmwzevruiqrttymlpxec) — public schema.
--
-- WHY THIS FILE EXISTS: the original 5 tables (products, folders, saved_items,
-- profiles, price_history), their indexes, and their RLS policies were created
-- directly in the Supabase dashboard and were NEVER version-controlled. This
-- file reconstructs that exact state idempotently so the schema is reproducible
-- from the repo on a fresh database. Reflects the live DB as introspected
-- 2026-06-30 (see docs/schema-current.md), i.e. the state BEFORE the Phase 1
-- delta (20260630120000_phase1_*).
--
-- SAFE ON THE LIVE DB: every statement is `... if not exists` / guarded, so
-- running it against the existing project is a no-op. On a fresh DB it builds
-- the baseline. The Phase 1 migration then layers its additive delta on top.
--
-- VERIFY: price_history.id was observed as `bigint` with no column default. It
-- is reconstructed here as GENERATED ALWAYS AS IDENTITY (the standard modern
-- form). If the live table uses a plain sequence/serial instead, this only
-- matters for fresh-DB bootstraps and can be reconciled then — it does not touch
-- the live table (create table if not exists is a no-op there).
-- ============================================================================

begin;

-- Extensions the baseline depends on (gen_random_uuid + pgvector).
create extension if not exists pgcrypto;
create extension if not exists vector;

-- ----------------------------------------------------------------------------
-- products — the swipeable catalog (public read; service-role writes only)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  external_id    text not null,
  merchant       text,
  brand          text,
  title          text not null,
  description    text,
  category       text,
  price          numeric(10,2),
  original_price numeric(10,2),
  currency       character(3) not null default 'GBP',
  image_url      text,
  product_url    text,
  colors         text[],
  sizes          text[],
  in_stock       boolean not null default true,
  attributes     jsonb not null default '{}'::jsonb,
  embedding      vector(1536),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint products_source_external_id_key unique (source, external_id)
);

create index if not exists products_category_idx  on public.products (category);
create index if not exists products_in_stock_idx  on public.products (in_stock);
create index if not exists products_price_idx      on public.products (price);
create index if not exists products_embedding_idx
  on public.products using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- folders — user-owned buckets (Phase 1 adds query_text / cover_saved_item_id)
-- ----------------------------------------------------------------------------
create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists folders_user_idx on public.folders (user_id);

-- ----------------------------------------------------------------------------
-- saved_items — a right-swipe. UNIQUE(user_id, product_id): one save per product
-- per user, regardless of folder (see docs/schema-current.md §6).
-- ----------------------------------------------------------------------------
create table if not exists public.saved_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  folder_id     uuid references public.folders(id) on delete set null,
  price_at_save numeric(10,2),
  created_at    timestamptz not null default now(),
  constraint saved_items_user_id_product_id_key unique (user_id, product_id)
);

create index if not exists saved_items_user_idx    on public.saved_items (user_id);
create index if not exists saved_items_product_idx on public.saved_items (product_id);

-- ----------------------------------------------------------------------------
-- profiles — id === auth.users.id (Phase 1 adds expo_push_token)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- price_history — price points for drop/restock detection (public read)
-- ----------------------------------------------------------------------------
create table if not exists public.price_history (
  id          bigint primary key generated always as identity,  -- VERIFY (header)
  product_id  uuid not null references public.products(id) on delete cascade,
  price       numeric(10,2) not null,
  currency    character(3) not null default 'GBP',
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_product_idx
  on public.price_history (product_id, recorded_at desc);

-- ----------------------------------------------------------------------------
-- RLS — catalog tables: public read, no client writes. User tables: owner-only.
-- ----------------------------------------------------------------------------

-- products: anyone can read; writes are service-role only (no write policies).
alter table public.products enable row level security;
drop policy if exists products_read_all on public.products;
create policy products_read_all on public.products for select using (true);

-- price_history: anyone can read; writes service-role only.
alter table public.price_history enable row level security;
drop policy if exists price_history_read_all on public.price_history;
create policy price_history_read_all on public.price_history for select using (true);

-- folders: owner can do everything.
alter table public.folders enable row level security;
drop policy if exists folders_read_own   on public.folders;
drop policy if exists folders_insert_own on public.folders;
drop policy if exists folders_update_own on public.folders;
drop policy if exists folders_delete_own on public.folders;
create policy folders_read_own   on public.folders for select using (auth.uid() = user_id);
create policy folders_insert_own on public.folders for insert with check (auth.uid() = user_id);
create policy folders_update_own on public.folders for update using (auth.uid() = user_id);
create policy folders_delete_own on public.folders for delete using (auth.uid() = user_id);

-- saved_items: owner can do everything.
alter table public.saved_items enable row level security;
drop policy if exists saved_read_own   on public.saved_items;
drop policy if exists saved_insert_own on public.saved_items;
drop policy if exists saved_update_own on public.saved_items;
drop policy if exists saved_delete_own on public.saved_items;
create policy saved_read_own   on public.saved_items for select using (auth.uid() = user_id);
create policy saved_insert_own on public.saved_items for insert with check (auth.uid() = user_id);
create policy saved_update_own on public.saved_items for update using (auth.uid() = user_id);
create policy saved_delete_own on public.saved_items for delete using (auth.uid() = user_id);

-- profiles: owner read/update only (no INSERT/DELETE policy — rows are created
-- out-of-band; confirm the creation path before Phase 5).
alter table public.profiles enable row level security;
drop policy if exists profiles_read_own   on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read_own   on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

commit;
