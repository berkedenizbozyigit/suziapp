-- ============================================================================
-- Phase 1 — Schema delta: folders-as-conversations, chat, alerts, affiliate
-- ============================================================================
-- Project: Suzi (Supabase ref gmwzevruiqrttymlpxec) — public schema.
--
-- FORWARD-ONLY + IDEMPOTENT: safe to run multiple times. Uses
--   create table if not exists / add column if not exists / create index if not
--   exists, and the `drop policy if exists; create policy` pattern (Postgres has
--   no `create policy if not exists`).
--
-- NON-DESTRUCTIVE: only adds tables/columns/policies. Touches no existing data;
-- the working swipe loop (products → saved_items) is unaffected.
--
-- DEFERRED TO PHASE 2: folders.query_embedding vector(DIM) is intentionally NOT
-- added here. The live embedding dim is 1536 (text), but the multimodal provider
-- decision (Phase 2) may change DIM and force a re-embed + HNSW rebuild, so the
-- folder query-vector column is added once DIM is fixed.
--
-- Conventions mirrored from the existing schema (see docs/schema-current.md):
--   uuid PKs default gen_random_uuid(); created_at timestamptz default now();
--   user data → RLS owner policies on auth.uid() = user_id (public role).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. folders: intent + conversation metadata
--    query_embedding is deferred to Phase 2 (see header).
-- ----------------------------------------------------------------------------
alter table public.folders
  add column if not exists query_text text;

alter table public.folders
  add column if not exists cover_saved_item_id uuid
    references public.saved_items(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 2. messages: Ask Suzi (global) + per-folder chat persistence
--    folder_id null  => global "Ask Suzi" thread
--    role            => 'user' | 'suzi'
--    image_url       => set for visual-search messages (Phase 4)
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  folder_id  uuid references public.folders(id) on delete cascade,
  role       text not null check (role in ('user', 'suzi')),
  content    text,
  image_url  text,
  created_at timestamptz not null default now()
);

create index if not exists messages_user_idx
  on public.messages (user_id, created_at desc);
create index if not exists messages_folder_idx
  on public.messages (folder_id, created_at);

-- ----------------------------------------------------------------------------
-- 3. alerts: the bell on a product or a folder
--    unique(user_id, target_type, target_id, alert_type) => one bell per thing
-- ----------------------------------------------------------------------------
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'folder')),
  target_id   uuid not null,
  alert_type  text not null check (alert_type in ('price', 'restock')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id, alert_type)
);

create index if not exists alerts_user_idx
  on public.alerts (user_id) where active;
-- For the Phase 7 scheduler: find everyone watching a given target.
create index if not exists alerts_target_idx
  on public.alerts (target_type, target_id) where active;

-- ----------------------------------------------------------------------------
-- 4. outbound_clicks: affiliate click log. subid is how we match postbacks.
--    user_id / product_id null-on-delete so history survives row cleanup.
-- ----------------------------------------------------------------------------
create table if not exists public.outbound_clicks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  retailer   text,
  network    text,                       -- 'awin' | 'rakuten' | 'cj'
  subid      uuid not null default gen_random_uuid(),
  clicked_at timestamptz not null default now()
);

create index if not exists outbound_clicks_subid_idx
  on public.outbound_clicks (subid);
create index if not exists outbound_clicks_user_idx
  on public.outbound_clicks (user_id, clicked_at desc);

-- ----------------------------------------------------------------------------
-- 5. conversions: real revenue truth from network S2S postbacks.
--    Service-role-ONLY: RLS enabled, NO user policies (see section 8).
-- ----------------------------------------------------------------------------
create table if not exists public.conversions (
  id          uuid primary key default gen_random_uuid(),
  subid       uuid,
  network     text,
  amount      numeric,
  currency    text,
  status      text,                       -- 'pending' | 'approved' | 'rejected'
  raw         jsonb,
  received_at timestamptz not null default now()
);

-- Reconcile conversions back to the click that produced them.
create index if not exists conversions_subid_idx
  on public.conversions (subid);

-- ----------------------------------------------------------------------------
-- 6. saved_items: soft "did you buy it?" signal (NOT revenue — see conversions)
-- ----------------------------------------------------------------------------
alter table public.saved_items
  add column if not exists purchase_intent text
    check (purchase_intent in ('bought', 'not_yet', 'no'));

-- ----------------------------------------------------------------------------
-- 7. profiles: Expo push token (Phase 7)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists expo_push_token text;

-- ----------------------------------------------------------------------------
-- 8. RLS — mirror the existing owner-policy style (auth.uid() = user_id).
--    Pattern: enable RLS (idempotent) + drop/create each policy (re-runnable).
-- ----------------------------------------------------------------------------

-- messages: owner can do everything
alter table public.messages enable row level security;
drop policy if exists messages_read_own   on public.messages;
drop policy if exists messages_insert_own on public.messages;
drop policy if exists messages_update_own on public.messages;
drop policy if exists messages_delete_own on public.messages;
create policy messages_read_own   on public.messages for select using (auth.uid() = user_id);
create policy messages_insert_own on public.messages for insert with check (auth.uid() = user_id);
create policy messages_update_own on public.messages for update using (auth.uid() = user_id);
create policy messages_delete_own on public.messages for delete using (auth.uid() = user_id);

-- alerts: owner can do everything
alter table public.alerts enable row level security;
drop policy if exists alerts_read_own   on public.alerts;
drop policy if exists alerts_insert_own on public.alerts;
drop policy if exists alerts_update_own on public.alerts;
drop policy if exists alerts_delete_own on public.alerts;
create policy alerts_read_own   on public.alerts for select using (auth.uid() = user_id);
create policy alerts_insert_own on public.alerts for insert with check (auth.uid() = user_id);
create policy alerts_update_own on public.alerts for update using (auth.uid() = user_id);
create policy alerts_delete_own on public.alerts for delete using (auth.uid() = user_id);

-- outbound_clicks: owner can read/write their own (Edge Function uses the
-- service role, which bypasses RLS regardless).
alter table public.outbound_clicks enable row level security;
drop policy if exists outbound_clicks_read_own   on public.outbound_clicks;
drop policy if exists outbound_clicks_insert_own on public.outbound_clicks;
create policy outbound_clicks_read_own   on public.outbound_clicks for select using (auth.uid() = user_id);
create policy outbound_clicks_insert_own on public.outbound_clicks for insert with check (auth.uid() = user_id);

-- conversions: service-role ONLY. RLS on + no policies => clients (anon/auth)
-- can never read or write it. The service role bypasses RLS for the postback fn.
alter table public.conversions enable row level security;

commit;
