# Suzi Web + Resilient Shared Backend — Design

**Date:** 2026-07-01
**Status:** Approved (brainstorming complete) → ready for implementation plan
**Scope owner:** this spec covers the **web app + resilience architecture only**. The
catalog-ingestion pipeline and remaining mobile tabs are explicitly separate sibling specs.

---

## 1. Goal

Add a **browse-first Suzi web app** alongside the existing Expo mobile app, both talking
to one **shared, fault-isolated Supabase backend**, so that:

- Web and mobile deploy and run **independently** — if one fails, the other keeps working.
- The web surface plays to desktop strengths (grid, click/keyboard, shareable + SEO pages)
  rather than forcing the touch-swipe gesture onto a mouse.
- We add **no extra cost or operational complexity** beyond what the project already uses
  (Supabase free tier + a Vercel deploy that already hosts a serverless function).

Non-goal: true microservices (separate deployables, queues, service mesh, multiple DBs,
container orchestration). The resilience requirement is met by **thin clients + independent
deploys + graceful degradation**, not by distributed-systems infrastructure.

## 2. Decisions (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Primary goal | Full Suzi web app + resilient shared backend | Reuses existing Supabase/pgvector/Cohere; real separation without microservice cost |
| Web app scope | Browse-first (grid, click/keyboard, shareable, SEO) | Desktop strength; doesn't fight the swipe gesture |
| Web stack | Next.js (App Router) on Vercel | SSR/SEO; absorbs existing `/api/subscribe` + marketing page; free tier already in use |
| Code sharing | Share only the **backend contract** (edge-function HTTP API) | Max fault isolation; no monorepo tooling; DB types generated per app to prevent drift |

## 3. Architecture

Three independent deployables, one shared contract:

```
┌─────────────┐      ┌─────────────────────────────┐
│  mobile/    │──┐   │  Supabase  (the CONTRACT)   │
│  Expo app   │  │   │  Postgres + pgvector + RLS  │
└─────────────┘  ├──▶│  Edge Fns: search · reembed │
┌─────────────┐  │   │  (each independently deployed)
│  web/       │──┘   └─────────────────────────────┘
│  Next.js    │        Both apps are THIN CLIENTS of
│  (Vercel)   │        the edge-function HTTP contract.
└─────────────┘        No shared build. No service mesh.
```

The **fault-isolation boundary is the edge-function API**. A broken web deploy cannot affect
mobile (different platform, different pipeline; mobile still hits Supabase directly). A single
edge function erroring degrades gracefully in the client instead of white-screening.

Note: the edge-function source currently lives under `mobile/supabase/functions/`. Because both
apps consume it over HTTP, its source location does not affect isolation. Moving it to a
top-level `supabase/` is an **optional** later cleanup, deliberately out of scope here to avoid
touching the working deploy config.

## 4. The `web/` app (Next.js App Router)

```
web/
  app/(marketing)/        ← landing page, migrated from index.html
  app/api/subscribe/      ← waitlist API, migrated from /api/subscribe (Vercel fn)
  app/(shop)/discover/    ← search bar + SUZI'S PICKS grid  (SEO, server-rendered)
  app/(shop)/search/      ← results grid; click or ←/→ to skip/save
  app/(shop)/folders/     ← saved items & folders (anon-auth gated)
  app/picks/[slug]/       ← PUBLIC shareable folder page (SEO + "Open in Suzi app")
  lib/supabase/           ← server + browser clients
  lib/search.ts           ← invokes the `search` edge fn (mirrors mobile/lib/search.ts)
  types/db.ts             ← Supabase-GENERATED types (drift-proof)
  theme/                  ← ported brand tokens (cream/ink/red, DM Serif + DM Sans)
```

Design language matches mobile: cream `#FEFEEC`, ink `#0E0E0E`, red `#B01E1E`, DM Serif Display
(titles) + DM Sans (body). Tokens are ported to CSS/Tailwind so the brand is consistent while
the layouts are web-native (grid, hover, keyboard).

## 5. Data flow (web search)

1. Query → `supabase.functions.invoke('search', { text })` → `[{ productId, score }]`.
2. Hydrate ids → `Product[]` via `PRODUCT_COLUMNS` select (RLS `SECURITY INVOKER`), preserving
   deck order.
3. Render grid. Save → `upsert saved_items` (on conflict `user_id,product_id`) for the anon user.
4. SEO pages (`/discover`, `/picks/[slug]`) render **server-side** so crawlers and link unfurls
   see real content; interactive shopping runs client-side after hydration.

Auth: Supabase anonymous auth in the browser (same model as mobile), so RLS `auth.uid()` lets
saves work. Public Picks pages render without auth (read-only, SEO).

## 6. Resilience — the concrete "one fails, others survive" ladder

- **Deploy isolation:** Vercel (web) and EAS/Expo (mobile) are separate pipelines; neither build
  imports the other.
- **Runtime isolation:** both are thin Supabase clients; web down ≠ mobile down. The waitlist
  (`/api/subscribe`) is independent of the shopping app — signups keep working even if `search`
  is broken.
- **Degradation ladder:**
  - `search` fails → show cached/curated Picks + "search is warming up".
  - save fails → optimistic UI + retry toast.
  - auth fails → browse read-only (public Picks still render).
  - React error boundaries per route so one section's crash doesn't blank the whole page.
- **Backend isolation:** edge functions are independent; a failing `reembed`/pipeline job never
  affects live `search` reads. Pipeline writes stay idempotent + batched (existing reembed pattern).

## 7. Testing

- Web unit tests (Vitest) for `lib/search` + hydration ordering.
- 2–3 Playwright smoke tests: search → grid → save; public picks page renders server-side.
- **Contract test:** web's `search` request body matches the deployed edge function (reuse the
  `smoke.sh` shape) so web and mobile can't drift from the contract.
- Mobile tests stay green (root `npm test`).
- Generated types compile-check both apps against the live schema.

## 8. Secrets & config

- Web needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, safe in browser)
  and `POSTGRES_URL` (server-only, for `/api/subscribe`).
- All via Vercel environment variables. **No secrets in code or git.** `.env*` stays gitignored.

## 9. Cost — honest caveat

- Supabase: free tier (already in use).
- Vercel: **Hobby is free but non-commercial per Vercel ToS.** Fine for the current pre-launch
  marketing + waitlist stage. A *commercial* Suzi launch on Vercel would need **Pro (~$20/mo)** or
  another host. Build so this is a one-line env/host swap, not a rewrite. This is the only place
  "$0 forever" is not strictly true — flagged now, not at launch.

## 10. Phasing (one phase per run)

- **Phase A — Scaffold & migrate.** Create `web/` Next.js on Vercel, port brand tokens, migrate the
  marketing page + `/api/subscribe`, deploy. Exit: web is live and provably independent of mobile.
- **Phase B — Browse core.** Search bar + Picks grid + `/search` results calling the `search` edge
  function; anonymous auth; generated types. Exit: a real query returns a hydrated grid on web.
- **Phase C — Save & share.** Save/skip (click + keyboard), folders view, public shareable
  `/picks/[slug]` with "Open in Suzi app". Exit: saves persist and a picks link renders publicly.
- **Phase D — Resilience polish.** Degradation ladder, per-route error boundaries, Vitest +
  Playwright smoke tests, basic observability. Exit: forced-failure of each dependency degrades
  gracefully and tests prove it.

## 11. Out of scope (separate sibling specs)

- Catalog-ingestion **pipeline** (feed → normalize → embed → upsert → index) to replace seed data.
- Remaining mobile tabs (Ask Suzi chat, Window Shop feed, Profile) and later mobile brief phases.
- Moving edge-function source to a top-level `supabase/` directory.

## 12. Guardrails (project standing rules — still apply)

- One phase per run; do not start the next phase until confirmed.
- Never break the working mobile swipe loop or the live waitlist.
- Migrations forward-only + idempotent; new timestamped files; never edit applied migrations.
- No secrets in code/git; all keys via env / Supabase function secrets.
- Verify APIs against current docs, not memory (Next.js App Router, Supabase JS, Vercel).
- Small, reviewable, conventional commits. Test before commit; push only when green.
