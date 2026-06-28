# Suzi Waitlist — Real Backend Design

**Date:** 2026-06-28
**Status:** Approved design, pre-implementation
**Scope:** Replace the fake demo forms with a real, owned backend that captures
waitlist emails. Keep the system minimal, clean, and readable.
**Cost:** $0, no credit card (see §0).

---

## 0. Cost constraint — everything is free, no credit card

Hard requirement: **nothing in this spec may require payment or a card.**

| Piece | Provider | Cost | Card? | Notes |
|---|---|---|---|---|
| Static site + `/api` function | **Vercel Hobby** | $0 | No | Free forever. ToS is "personal/non-commercial" — fine for a pre-launch waitlist; revisit (~$20/mo Pro) only if/when monetized on it. |
| Production database | **Supabase** free tier | $0 | No | Explicitly allows commercial use. 500 MB DB. Pauses after 7 days idle (a single signup wakes it). |
| Local database | **Docker Postgres** | $0 | No | Runs on your machine. |
| `pg`, Makefile, Compose | open source | $0 | No | — |

No paid service, domain, or card is required to build, run, or deploy this.

## 1. Goal

Right now both forms in `index.html` call `event.preventDefault(); alert('Demo only…')`
and **throw the email away**. Before going public we need a real backend that:

- captures every signup reliably,
- stores it in a database **we own** (Supabase Postgres, free tier),
- is exposed as a clean JSON API the **future iOS app** can reuse,
- runs locally against a real Postgres (Docker) for true local/prod parity.

Non-goal: building the actual Suzi product. This repo stays **just the waitlist
site + its signup backend**. The iOS app and the main app live in their own repos.

## 2. Architecture

Three pieces, each with one job:

```
 index.html (two forms)
        │  POST { email, website }   (JSON)
        ▼
 /api/subscribe        ← one Vercel serverless function (HTTP + validation)
        │  query()
        ▼
 lib/db.js             ← one pg connection pool (owns DB config)
        │  INSERT
        ▼
 signups table         ← Supabase Postgres (prod, free) / Docker Postgres :5434 (local)
```

**Design principles applied (right-sized, not gold-plated):**

- **Single Responsibility** — the HTTP handler validates and responds; `lib/db.js`
  owns the connection; `db/schema.sql` owns the shape of the data. None of them
  reach into each other's job.
- **DRY** — the two forms currently duplicate an inline handler. They will share a
  single `submitWaitlist()` function. The backend has a single `query()` helper, so
  connection logic lives in exactly one place.
- **One library, two environments** — `pg` + a `POSTGRES_URL` connection string
  works identically against local Docker Postgres and Supabase Postgres.

## 3. Components

### 3.1 Backend — `api/subscribe.js`
- Method: `POST` only (others → `405`).
- Body: `{ email, website }`.
  - `email` — validated against a basic format regex; trimmed + lowercased.
  - `website` — **honeypot**. Hidden field humans never see. If non-empty, a bot
    filled it: respond `200 { ok: true }` but **do not store** (silently drop spam,
    no CAPTCHA needed).
- On valid email: `INSERT ... ON CONFLICT (email) DO NOTHING`, so re-signups are a
  harmless no-op, never a 500.
- Responses (clean JSON, no DB internals leaked):
  - `200 { ok: true }` — stored (or already existed, or honeypot).
  - `400 { ok: false, error: "Invalid email" }`.
  - `405 { ok: false, error: "Method not allowed" }`.
  - `500 { ok: false, error: "Something went wrong" }` — generic; real error logged
    server-side only.
- CORS: allow the production web origin (same-origin web form). Native iOS is not
  subject to CORS, so it can call the endpoint directly.

### 3.2 DB access — `lib/db.js`
- Creates a single `pg` `Pool` from `process.env.POSTGRES_URL` (module-level
  singleton so the warm serverless instance reuses connections).
- Exports a thin `query(text, params)` helper. Nothing else imports `pg` directly.

### 3.3 Schema — `db/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS signups (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
One table. Exportable to CSV from the Supabase dashboard. Same file seeds local
and prod (run it once in the Supabase SQL editor).

### 3.4 Frontend — `index.html`
- Remove both `onsubmit="...alert..."` handlers.
- Add one `submitWaitlist(form)` async function (small `<script>` near the bottom):
  - reads the email input, POSTs JSON to `/api/subscribe`,
  - drives button states: **Join waitlist → Joining… → You're in ✓** (or **Try again**
    on error).
- Both `hero-form` and `cta-form` call the same function. Add the hidden honeypot
  input to both.

## 4. Local development (Docker)

Local Postgres mirrors prod so the function can be developed/tested on the laptop.

### 4.1 `docker-compose.yml`
- One service: `postgres:16-alpine`.
- **Host port `5434`** → container `5432` (5432 and 5433 are already taken locally).
- Env: `POSTGRES_USER=suzi`, `POSTGRES_PASSWORD=suzi`, `POSTGRES_DB=suzi`.
- Named volume for persistence; mounts `db/schema.sql` into
  `/docker-entrypoint-initdb.d/` so a fresh DB auto-creates the table.

### 4.2 `Makefile`
Readable, self-documenting targets:

| Target | Action |
|---|---|
| `make db-up` | start the local Postgres container (detached) |
| `make db-down` | stop it |
| `make db-reset` | drop the volume and recreate (fresh schema) |
| `make db-logs` | tail container logs |
| `make db-psql` | open a `psql` shell into the local DB |
| `make dev` | `vercel dev` — serve `index.html` + `/api` against local DB |

### 4.3 Env & config
- `.env.example` documents the one required var:
  `POSTGRES_URL=postgres://suzi:suzi@localhost:5434/suzi`
- `.env` is git-ignored. Production sets `POSTGRES_URL` as a Vercel **environment
  variable**, pasted from Supabase's connection string (use Supabase's **connection
  pooler** string — recommended for serverless). No secrets in the repo.

## 5. File structure (delta)

```
suziapp/
├── index.html              # forms rewired to shared submitWaitlist()
├── api/
│   └── subscribe.js        # serverless function (one job)
├── lib/
│   └── db.js               # pg pool + query() (one job)
├── db/
│   └── schema.sql          # signups table
├── docker-compose.yml      # local Postgres on :5434
├── Makefile                # local dev commands
├── package.json            # declares "pg" dependency
├── .env.example            # documents POSTGRES_URL
├── .gitignore              # add .env, node_modules
├── README.md               # replace fake-form section with DB + deploy steps
└── docs/superpowers/specs/2026-06-28-suzi-waitlist-backend-design.md
```

## 6. Error handling

- **Invalid/empty email** → `400`, form shows "Try again", nothing stored.
- **Duplicate email** → treated as success (`ON CONFLICT DO NOTHING`); user sees
  "You're in ✓".
- **Bot (honeypot filled)** → `200`, silently dropped.
- **DB down / unexpected** → `500` with a generic message to the client; full error
  logged server-side only. Form shows "Try again" so the user can retry.
- **Network failure on the client** → caught in `submitWaitlist`, button returns to a
  retryable state.

## 7. Testing / verification

- Local: `make db-up`, `make dev`, submit both forms → confirm rows via `make db-psql`
  (`SELECT * FROM signups;`).
- Validation: submit a malformed email → `400`, no row. Submit the same email twice →
  one row only.
- Honeypot: a request with `website` set → `200`, no row.

## 8. Out of scope (future hooks, not built now)

These all sit cleanly on top of this structure without changing it:
- Confirmation / welcome email.
- Live signup counter on the page (read `COUNT(*)`).
- GDPR consent line + privacy note near the forms.
- Analytics (Plausible/GA) and Open Graph social-preview tags.
- The iOS app itself (separate repo; it reuses `/api/subscribe`).

## 9. Open assumption for review

- **iOS app is NOT built in this repo** — it's treated as a future consumer of the
  `/api/subscribe` endpoint. If you actually want iOS work to start here, that's a
  separate spec and changes scope.
