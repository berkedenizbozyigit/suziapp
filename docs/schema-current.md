# Suzi — Current Database Schema

**Source of truth:** live Supabase project `gmwzevruiqrttymlpxec`, `public` schema,
introspected 2026-06-30 via `pg_catalog` (read-only).

**State:** **post-Phase-2.** The original 5 tables were dashboard-only and unversioned;
they are now captured in `mobile/supabase/migrations/20260630000000_0000_baseline.sql`. The
Phase 1 delta (conversations / alerts / affiliate) and the Phase 2 delta (vector search) are
applied and captured in `20260630120000_phase1_conversations_alerts_affiliate.sql` and
`20260630130000_phase2_vector_search.sql`.

> Trust this file over the project brief where they differ (per the brief's own instruction).

---

## 0. Headline facts (the ones later phases hinge on)

| Fact | Value | Consequence |
|---|---|---|
| **`products.embedding`** | **`vector(1536)`**, model **`cohere-embed-v4.0`** | Phase 2 re-embedded all products with **Cohere Embed v4 (multimodal, text+image)** at `output_dimension=1536`. Because 1536 == the prior dim, the column and HNSW index were **reused as-is — no rebuild**. `embedding_model` tracks the producing model for resumable re-embeds / future swaps. |
| **HNSW opclass** | `vector_cosine_ops` (cosine) | Matches Cohere's space; `match_products` uses `<=>`. No opclass change. |
| **`pgvector` version** | `0.8.0` | Supports HNSW + halfvec; current. |
| **`saved_items` uniqueness** | `UNIQUE (user_id, product_id)` | Idempotent saves, BUT a product can be saved **once per user, regardless of folder**. ⚠️ Drives the Phase 3 save strategy → **upsert on `(user_id, product_id)`, move `folder_id`** (see §6). |
| **`products` ingestion key** | `UNIQUE (source, external_id)` | Idempotent catalog ingestion in place. |
| **RLS** | Enabled on **all 9** tables | Owner-scoped on user data; public read on catalog; `conversions` = service-role-only. |
| **`conversions` (revenue)** | RLS on, **0 policies** | No client (anon/auth) can read or write it; only the service role (Edge Functions) reaches it. |

---

## 1. Extensions installed

| Extension | Version |   | Extension | Version |
|---|---|---|---|---|
| `plpgsql` | 1.0 | | `pgcrypto` | 1.3 |
| `pg_stat_statements` | 1.11 | | `supabase_vault` | 0.3.1 |
| `uuid-ossp` | 1.1 | | `vector` (pgvector) | 0.8.0 |

`gen_random_uuid()` (PK default) comes from `pgcrypto`.

---

## 2. Tables — columns, types, defaults

### Catalog (public read, service-role writes)

**`products`** — the swipeable catalog
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `source` | `text` | not null | — |
| `external_id` | `text` | not null | — |
| `merchant` | `text` | null | — |
| `brand` | `text` | null | — |
| `title` | `text` | not null | — |
| `description` | `text` | null | — |
| `category` | `text` | null | — |
| `price` | `numeric(10,2)` | null | — |
| `original_price` | `numeric(10,2)` | null | — |
| `currency` | `character(3)` | not null | `'GBP'` |
| `image_url` | `text` | null | — |
| `product_url` | `text` | null | — |
| `colors` | `text[]` | null | — |
| `sizes` | `text[]` | null | — |
| `in_stock` | `boolean` | not null | `true` |
| `attributes` | `jsonb` | not null | `'{}'` |
| `embedding` | **`vector(1536)`** | null | — (Cohere Embed v4) |
| `embedding_model` | `text` | null | — (e.g. `cohere-embed-v4.0`) |
| `embedded_at` | `timestamptz` | null | — |
| `created_at` | `timestamptz` | not null | `now()` |
| `updated_at` | `timestamptz` | not null | `now()` |

**`price_history`** — price points for drop/restock detection
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `bigint` | not null | identity *(see §7)* |
| `product_id` | `uuid` | not null | — |
| `price` | `numeric(10,2)` | not null | — |
| `currency` | `character(3)` | not null | `'GBP'` |
| `recorded_at` | `timestamptz` | not null | `now()` |

### User data (owner-only RLS)

**`folders`** — user-owned buckets *(Phase 1 added `query_text`, `cover_saved_item_id`)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `user_id` | `uuid` | not null | — |
| `name` | `text` | not null | — |
| `query_text` | `text` | null | — |
| `cover_saved_item_id` | `uuid` | null | — |
| `query_embedding` | `vector(1536)` | null | — (Phase 2; seeds "continue this folder") |
| `created_at` | `timestamptz` | not null | `now()` |

**`saved_items`** — a right-swipe *(Phase 1 added `purchase_intent`)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `user_id` | `uuid` | not null | — |
| `product_id` | `uuid` | not null | — |
| `folder_id` | `uuid` | null | — |
| `price_at_save` | `numeric(10,2)` | null | — |
| `purchase_intent` | `text` | null | — (CHECK `bought`/`not_yet`/`no`) |
| `created_at` | `timestamptz` | not null | `now()` |

**`profiles`** — `id === auth.users.id` *(Phase 1 added `expo_push_token`)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | — |
| `display_name` | `text` | null | — |
| `expo_push_token` | `text` | null | — |
| `created_at` | `timestamptz` | not null | `now()` |

⚠️ `profiles` has **no INSERT policy** and `id` has **no default** — rows created out-of-band
(likely an `auth.users` trigger, unconfirmed). Relevant to Phase 5.

**`messages`** — Ask Suzi (global) + per-folder chat *(Phase 1)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `user_id` | `uuid` | not null | — |
| `folder_id` | `uuid` | null | — (null = global Ask Suzi thread) |
| `role` | `text` | not null | CHECK `user`/`suzi` |
| `content` | `text` | null | — |
| `image_url` | `text` | null | — (visual-search messages) |
| `created_at` | `timestamptz` | not null | `now()` |

**`alerts`** — the bell on a product or folder *(Phase 1)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `user_id` | `uuid` | not null | — |
| `target_type` | `text` | not null | CHECK `product`/`folder` |
| `target_id` | `uuid` | not null | — |
| `alert_type` | `text` | not null | CHECK `price`/`restock` |
| `active` | `boolean` | not null | `true` |
| `created_at` | `timestamptz` | not null | `now()` |
| — | | | UNIQUE `(user_id, target_type, target_id, alert_type)` |

**`outbound_clicks`** — affiliate click log *(Phase 1; owner RLS + service-role)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `user_id` | `uuid` | null | — (FK SET NULL) |
| `product_id` | `uuid` | null | — (FK SET NULL) |
| `retailer` | `text` | null | — |
| `network` | `text` | null | — (`awin`/`rakuten`/`cj`) |
| `subid` | `uuid` | not null | `gen_random_uuid()` |
| `clicked_at` | `timestamptz` | not null | `now()` |

**`conversions`** — real revenue from network postbacks *(Phase 1; **service-role-only**)*
| Column | Type | Null? | Default |
|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `subid` | `uuid` | null | — |
| `network` | `text` | null | — |
| `amount` | `numeric` | null | — |
| `currency` | `text` | null | — |
| `status` | `text` | null | — (`pending`/`approved`/`rejected`) |
| `raw` | `jsonb` | null | — |
| `received_at` | `timestamptz` | not null | `now()` |

---

## 3. Indexes

**products:** `products_pkey` UNIQUE(`id`) · `products_source_external_id_key` UNIQUE(`source`,`external_id`) · `products_category_idx`(`category`) · `products_in_stock_idx`(`in_stock`) · `products_price_idx`(`price`) · **`products_embedding_idx` HNSW(`embedding` `vector_cosine_ops`)** · `products_needs_embedding_idx`(`id`) WHERE `embedding_model is null` *(Phase 2; finds rows needing re-embed)*
**price_history:** `price_history_pkey` UNIQUE(`id`) · `price_history_product_idx`(`product_id`,`recorded_at DESC`)
**folders:** `folders_pkey` UNIQUE(`id`) · `folders_user_idx`(`user_id`)
**saved_items:** `saved_items_pkey` UNIQUE(`id`) · `saved_items_user_id_product_id_key` UNIQUE(`user_id`,`product_id`) · `saved_items_user_idx`(`user_id`) · `saved_items_product_idx`(`product_id`)
**profiles:** `profiles_pkey` UNIQUE(`id`)
**messages:** `messages_pkey` · `messages_user_idx`(`user_id`,`created_at DESC`) · `messages_folder_idx`(`folder_id`,`created_at`)
**alerts:** `alerts_pkey` · unique key on the 4-tuple · `alerts_user_idx`(`user_id`) WHERE active · `alerts_target_idx`(`target_type`,`target_id`) WHERE active
**outbound_clicks:** `outbound_clicks_pkey` · `outbound_clicks_subid_idx`(`subid`) · `outbound_clicks_user_idx`(`user_id`,`clicked_at DESC`)
**conversions:** `conversions_pkey` · `conversions_subid_idx`(`subid`)

---

## 3b. Functions / RPC

- **`match_products(query_embedding vector(1536), match_count int default 20, exclude_ids uuid[] default '{}')`**
  *(Phase 2)* — cosine kNN over `products.embedding` (HNSW). Returns `(id, score)` where
  `score = 1 - (embedding <=> query_embedding)`; in-stock only; excludes `exclude_ids`.
  `SECURITY INVOKER`, `search_path = public`. Called by the `search` Edge Function.

---

## 4. Foreign keys & key constraints (from `pg_constraint`)

**Foreign keys**
- `saved_items.user_id` → `auth.users(id)` **CASCADE** · `saved_items.product_id` → `products(id)` **CASCADE** · `saved_items.folder_id` → `folders(id)` **SET NULL**
- `folders.user_id` → `auth.users(id)` **CASCADE** · `folders.cover_saved_item_id` → `saved_items(id)` **SET NULL**
- `profiles.id` → `auth.users(id)` **CASCADE**
- `price_history.product_id` → `products(id)` **CASCADE**
- `messages.user_id` → `auth.users(id)` **CASCADE** · `messages.folder_id` → `folders(id)` **CASCADE**
- `alerts.user_id` → `auth.users(id)` **CASCADE**
- `outbound_clicks.user_id` → `auth.users(id)` **SET NULL** · `outbound_clicks.product_id` → `products(id)` **SET NULL**

**CHECK:** `messages.role ∈ (user, suzi)` · `alerts.target_type ∈ (product, folder)` ·
`alerts.alert_type ∈ (price, restock)` · `saved_items.purchase_intent ∈ (bought, not_yet, no)`

**UNIQUE:** `products(source, external_id)` · `saved_items(user_id, product_id)` ·
`alerts(user_id, target_type, target_id, alert_type)`

Note: `alerts.target_id` is intentionally **not** a FK (it polymorphically points at either a
product or a folder, by `target_type`). The Phase 7 scheduler resolves it per `target_type`.

---

## 5. RLS policies

RLS is **enabled on all 9 tables**. Style = `public` role + `auth.uid()`. New user-data tables
mirror it exactly.

| Table | Policies |
|---|---|
| `products` | `products_read_all` SELECT `using(true)` — public read; no client writes |
| `price_history` | `price_history_read_all` SELECT `using(true)` — public read; no client writes |
| `folders` | read/insert/update/delete own (`auth.uid() = user_id`) |
| `saved_items` | read/insert/update/delete own (`auth.uid() = user_id`) |
| `profiles` | `profiles_read_own`, `profiles_update_own` (`auth.uid() = id`) — **no INSERT/DELETE** |
| `messages` | read/insert/update/delete own (`auth.uid() = user_id`) |
| `alerts` | read/insert/update/delete own (`auth.uid() = user_id`) |
| `outbound_clicks` | read/insert own (`auth.uid() = user_id`); service role for the rest |
| `conversions` | **none** — RLS on + 0 policies → service-role-only |

Catalog + `conversions` writes go through the **service role** (Edge Functions), never the client.

---

## 6. ⚠️ Save strategy decision (Phase 3)

`saved_items` is `UNIQUE (user_id, product_id)` — a product is saved **once per user**, period.
The current `saveProduct()` does a plain `insert (folder_id = null)`; re-swiping an already-saved
product would raise a unique violation. With `folders.cover_saved_item_id` (a folder points at one
saved item) the model is "one home per save." **Phase 3 plan:** change `saveProduct` to an
idempotent **upsert** on conflict target `(user_id, product_id)` that sets/moves `folder_id`.
(The alternative — same product in multiple folders — would need a destructive index change and is
not the chosen direction.)

---

## 7. Open items (non-blocking)

- **`price_history.id` identity** — observed `bigint`, no column default; baseline reconstructs it
  as `generated always as identity`. Only matters for fresh-DB bootstraps; flagged in the baseline.
- **Deployed Edge Functions** — `search` and `reembed` are deployed (Phase 2). Source under
  `mobile/supabase/functions/`.
- ~~Embedding provider identity~~ — **RESOLVED:** Cohere Embed v4 (`cohere-embed-v4.0`),
  1536-dim, tracked per row in `products.embedding_model`. Catalog re-embedded Phase 2.
- **`profiles` creation path** — no INSERT policy + no `id` default ⇒ rows created out-of-band
  (trigger?). Confirm before Phase 5.
- **Storage buckets / triggers** — not introspected (needed at Phase 4 / Phase 5).
