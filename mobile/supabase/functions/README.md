# Suzi Edge Functions

Deno/TypeScript functions that run on Supabase. They are **not** part of the
Expo/React Native app and are excluded from `mobile/tsconfig.json` — they run on
Supabase's Deno runtime.

| Function | Auth | Purpose |
|---|---|---|
| `search` | caller JWT (`verify_jwt = true`) | text/image query → ranked product deck via pgvector cosine kNN |
| `reembed` | `x-admin-secret` header | resumable backfill of `products.embedding` with the current provider |
| `_shared/embed.ts` | — | swappable `embed({text?, imageUrl?})` wrapper (Cohere Embed v4 today) |
| `_shared/http.ts` | — | CORS, JSON/error envelope, structured logging, validators |

## Required function secrets

Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets
(or `supabase secrets set …`). **Never commit these.**

| Secret | Used by | Notes |
|---|---|---|
| `EMBEDDING_PROVIDER_API_KEY` | search, reembed | Cohere API key (Trial key is free for dev) |
| `EMBEDDING_PROVIDER` | search, reembed | optional; defaults to `cohere` |
| `ADMIN_TASK_SECRET` | reembed | any long random string; required to invoke reembed |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | — | auto-injected by Supabase; do not set manually |

## Deploy

Prereq: apply the Phase 2 migration first (`folders.query_embedding`,
`products.embedding_model/embedded_at`, `match_products`).

**Option A — Supabase CLI (recommended; repeatable across all functions):**
```bash
cd mobile
npx supabase login                       # paste an access token from the dashboard
npx supabase link --project-ref gmwzevruiqrttymlpxec
npx supabase functions deploy search
npx supabase functions deploy reembed
```

**Option B — Dashboard:** Edge Functions → Create function → paste each
`index.ts` (and the `_shared` files) → Deploy.

## Run the one-time re-embed (populate Cohere vectors)

```bash
curl -sX POST "https://gmwzevruiqrttymlpxec.supabase.co/functions/v1/reembed" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-admin-secret: $ADMIN_TASK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "batchSize": 25 }'
# Repeat until the response shows "remaining": 0  (12 seed products => one call)
```

## Smoke-test search

```bash
# text query
curl -sX POST "https://gmwzevruiqrttymlpxec.supabase.co/functions/v1/search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "text": "oversized wool coat", "limit": 5 }'

# image query (any public image URL)
curl -sX POST "https://gmwzevruiqrttymlpxec.supabase.co/functions/v1/search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "imageUrl": "https://picsum.photos/seed/suzi-1/600/800", "limit": 5 }'
```
A populated `deck` with descending `score`s = success. An empty deck with
`reason: "provider_unavailable"` means the embedding call failed (check the
`EMBEDDING_PROVIDER_API_KEY` secret and function logs).
