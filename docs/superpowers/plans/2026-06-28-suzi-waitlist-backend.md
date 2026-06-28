# Suzi Waitlist Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two fake demo forms in `index.html` with a real, owned backend that reliably stores waitlist emails in Postgres.

**Architecture:** A single Vercel serverless function (`/api/subscribe`) receives JSON, validates it, and inserts into one `signups` table. Logic is split into small single-responsibility modules — pure validation, pure request-handling (with the DB call injected), a thin DB pool, and a thin HTTP adapter — so the core is unit-testable without a database. Production uses Supabase Postgres (free tier); local dev uses Docker Postgres on port **5434**. The same `pg` + `POSTGRES_URL` code talks to both.

**Tech Stack:** Node.js (ES modules), `pg` (node-postgres), Node's built-in `node:test` runner (zero extra deps), Docker Compose, Make, Vercel (Hobby) for hosting.

**Cost:** $0, no credit card. See spec `docs/superpowers/specs/2026-06-28-suzi-waitlist-backend-design.md` §0.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Declares ESM mode, `pg` dependency, `test` script |
| `lib/email.js` | Pure email helpers: normalize + validate. No I/O |
| `lib/subscribe-handler.js` | Pure request logic: method check, honeypot, validation, error mapping. `save` is injected |
| `lib/db.js` | One `pg` pool from `POSTGRES_URL` + `query()` helper |
| `lib/signups.js` | The one SQL statement: `insertSignup(email)` |
| `api/subscribe.js` | Thin Vercel adapter: HTTP ⇄ pure handler |
| `db/schema.sql` | The `signups` table (seeds local + prod) |
| `docker-compose.yml` | Local Postgres on host port 5434 |
| `Makefile` | `db-up`, `db-down`, `db-reset`, `db-logs`, `db-psql`, `dev`, `test` |
| `.env.example` | Documents `POSTGRES_URL` |
| `.gitignore` | Ignore `.env`, `node_modules` |
| `test/*.test.js` | Unit tests (+ one DB-gated integration test) |
| `index.html` | Forms rewired to a shared `submitWaitlist()` + honeypot |
| `README.md` | Replace fake-form section with real setup/deploy steps |

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "suzi-waitlist",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "pg": "^8.13.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
.env
.vercel
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json`, installs `pg`.

- [ ] **Step 4: Verify the test runner works (no tests yet)**

Run: `node --test`
Expected: exits 0 with "tests 0" (no test files found yet — that's fine).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: scaffold node project (ESM, pg, node:test)"
```

---

## Task 2: Email helpers (pure, TDD)

**Files:**
- Create: `lib/email.js`
- Test: `test/email.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/email.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, isValidEmail } from '../lib/email.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
});

test('normalizeEmail handles null/undefined safely', () => {
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

test('isValidEmail accepts a normal address', () => {
  assert.equal(isValidEmail('person@example.com'), true);
});

test('isValidEmail rejects malformed addresses', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@tld'), false);
  assert.equal(isValidEmail('two @spaces.com'), false);
  assert.equal(isValidEmail(''), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/email.test.js`
Expected: FAIL — cannot find module `../lib/email.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/email.js`:

```js
// Pure email helpers — no I/O, fully unit-testable.

export function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

// Pragmatic format check: text@text.tld with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(email);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/email.test.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/email.js test/email.test.js
git commit -m "feat: add pure email validation helpers"
```

---

## Task 3: Subscribe handler logic (pure, TDD)

This is the core decision logic. The database write is an injected `save` function, so the whole flow is testable without a DB or HTTP server.

**Files:**
- Create: `lib/subscribe-handler.js`
- Test: `test/subscribe-handler.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/subscribe-handler.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubscribe } from '../lib/subscribe-handler.js';

// A fake `save` that records every call.
function recorder() {
  const calls = [];
  const fn = async (arg) => { calls.push(arg); };
  fn.calls = calls;
  return fn;
}

test('rejects non-POST methods with 405', async () => {
  const save = recorder();
  const res = await handleSubscribe({ method: 'GET', body: {}, save });
  assert.equal(res.status, 405);
  assert.equal(save.calls.length, 0);
});

test('silently accepts and drops honeypot submissions', async () => {
  const save = recorder();
  const res = await handleSubscribe({
    method: 'POST',
    body: { email: 'bot@spam.com', website: 'http://spam' },
    save,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(save.calls.length, 0); // never stored
});

test('rejects an invalid email with 400', async () => {
  const save = recorder();
  const res = await handleSubscribe({ method: 'POST', body: { email: 'nope' }, save });
  assert.equal(res.status, 400);
  assert.equal(save.calls.length, 0);
});

test('stores a valid, normalized email and returns 200', async () => {
  const save = recorder();
  const res = await handleSubscribe({
    method: 'POST',
    body: { email: '  Person@Example.COM ' },
    save,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.deepEqual(save.calls, [{ email: 'person@example.com' }]);
});

test('returns 500 when save throws', async () => {
  const save = async () => { throw new Error('db down'); };
  const res = await handleSubscribe({ method: 'POST', body: { email: 'a@b.com' }, save });
  assert.equal(res.status, 500);
  assert.equal(res.body.ok, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/subscribe-handler.test.js`
Expected: FAIL — cannot find module `../lib/subscribe-handler.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/subscribe-handler.js`:

```js
import { normalizeEmail, isValidEmail } from './email.js';

// Pure orchestration. `save` is injected: async ({ email }) => void.
// Returns { status, body } — transport-agnostic, so it can be unit-tested
// without HTTP or a database.
export async function handleSubscribe({ method, body, save }) {
  if (method !== 'POST') {
    return { status: 405, body: { ok: false, error: 'Method not allowed' } };
  }

  const data = body ?? {};

  // Honeypot: humans never see/fill `website`. If it's set, a bot did —
  // pretend success but store nothing (cheap spam protection, no CAPTCHA).
  if (data.website) {
    return { status: 200, body: { ok: true } };
  }

  const email = normalizeEmail(data.email);
  if (!isValidEmail(email)) {
    return { status: 400, body: { ok: false, error: 'Invalid email' } };
  }

  try {
    await save({ email });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('subscribe failed:', err);
    return { status: 500, body: { ok: false, error: 'Something went wrong' } };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/subscribe-handler.test.js`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/subscribe-handler.js test/subscribe-handler.test.js
git commit -m "feat: add pure subscribe handler logic (method, honeypot, validation)"
```

---

## Task 4: Local database infrastructure (Docker + Make)

**Files:**
- Create: `db/schema.sql`
- Create: `docker-compose.yml`
- Create: `Makefile`

- [ ] **Step 1: Create the schema**

Create `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS signups (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: suzi-db
    ports:
      - "5434:5432"        # host 5434 (5432/5433 taken) -> container 5432
    environment:
      POSTGRES_USER: suzi
      POSTGRES_PASSWORD: suzi
      POSTGRES_DB: suzi
    volumes:
      - suzi-db-data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro

volumes:
  suzi-db-data:
```

- [ ] **Step 3: Create the `Makefile`** — IMPORTANT: indent recipe lines with a real TAB, not spaces.

```makefile
# Local dev for the Suzi waitlist backend.
# Postgres runs in Docker on host port 5434 (5432/5433 are taken locally).

.PHONY: db-up db-down db-reset db-logs db-psql dev test

db-up:        ## Start local Postgres (detached)
	docker compose up -d

db-down:      ## Stop local Postgres
	docker compose down

db-reset:     ## Wipe the DB volume and recreate from db/schema.sql
	docker compose down -v
	docker compose up -d

db-logs:      ## Tail Postgres logs
	docker compose logs -f db

db-psql:      ## Open a psql shell in the local DB
	docker compose exec db psql -U suzi -d suzi

dev:          ## Run the site + /api locally (needs: npm i -g vercel)
	vercel dev

test:         ## Run unit tests
	node --test
```

- [ ] **Step 4: Start the database**

Run: `make db-up`
Expected: pulls `postgres:16-alpine` (first time) and starts container `suzi-db`.

- [ ] **Step 5: Verify the table was created**

Run: `docker compose exec db psql -U suzi -d suzi -c "\dt"`
Expected: a table list showing `public | signups | table | suzi`.

(If the table is missing because the volume pre-existed, run `make db-reset` and retry — init scripts only run on a fresh volume.)

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql docker-compose.yml Makefile
git commit -m "feat: add local Postgres (Docker :5434), schema, and Makefile"
```

---

## Task 5: Database access layer

**Files:**
- Create: `lib/db.js`
- Create: `lib/signups.js`
- Test: `test/signups.integration.test.js` (DB-gated)

- [ ] **Step 1: Write the DB-gated integration test**

This test only runs when `POSTGRES_URL` is set, so `node --test` stays green without a database.

Create `test/signups.integration.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertSignup } from '../lib/signups.js';
import { query, endPool } from '../lib/db.js';

const RUN = Boolean(process.env.POSTGRES_URL);
const EMAIL = 'integration-test@suzi.local';

test('insertSignup is idempotent (created once, no-op after)', { skip: !RUN }, async () => {
  await query('DELETE FROM signups WHERE email = $1', [EMAIL]);

  const first = await insertSignup(EMAIL);
  assert.equal(first.created, true);

  const second = await insertSignup(EMAIL);
  assert.equal(second.created, false);

  await query('DELETE FROM signups WHERE email = $1', [EMAIL]);
});

test.after(async () => { if (RUN) await endPool(); });
```

- [ ] **Step 2: Run the test to verify it fails first (TDD)**

Run: `node --test test/signups.integration.test.js`
Expected: FAIL — cannot find module `../lib/signups.js` (modules don't exist yet).

- [ ] **Step 3: Create the DB pool**

Create `lib/db.js`:

```js
import pg from 'pg';

const { Pool } = pg;

// One pool, reused across warm serverless invocations. The connection isn't
// opened until the first query, so importing this without POSTGRES_URL is safe.
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export function query(text, params) {
  return pool.query(text, params);
}

// Lets tests close the pool so the process can exit cleanly.
export function endPool() {
  return pool.end();
}
```

- [ ] **Step 4: Create the signups insert**

Create `lib/signups.js`:

```js
import { query } from './db.js';

// Insert a signup. ON CONFLICT makes a repeat signup a harmless no-op
// instead of a unique-violation error.
// Returns { created } so callers can distinguish new from duplicate.
export async function insertSignup(email) {
  const result = await query(
    `INSERT INTO signups (email) VALUES ($1)
     ON CONFLICT (email) DO NOTHING`,
    [email],
  );
  return { created: result.rowCount === 1 };
}
```

- [ ] **Step 5: Run the integration test AGAINST the local DB**

Ensure the DB is up (`make db-up`), then run with the local connection string:

Run: `POSTGRES_URL=postgres://suzi:suzi@localhost:5434/suzi node --test test/signups.integration.test.js`
Expected: PASS — 1 test passing (the idempotency test runs).

- [ ] **Step 6: Confirm the full suite is green without a DB**

Run: `node --test`
Expected: PASS — all unit tests pass; the integration test reports as skipped.

- [ ] **Step 7: Commit**

```bash
git add lib/db.js lib/signups.js test/signups.integration.test.js
git commit -m "feat: add pg pool and idempotent insertSignup"
```

---

## Task 6: HTTP adapter + env example

**Files:**
- Create: `api/subscribe.js`
- Create: `.env.example`

- [ ] **Step 1: Create the Vercel function adapter**

Create `api/subscribe.js`:

```js
import { handleSubscribe } from '../lib/subscribe-handler.js';
import { insertSignup } from '../lib/signups.js';

// Thin adapter: translate the HTTP request/response to/from the pure handler.
// Vercel parses a JSON request body into `req.body` automatically.
export default async function handler(req, res) {
  const { status, body } = await handleSubscribe({
    method: req.method,
    body: req.body,
    save: ({ email }) => insertSignup(email),
  });
  res.status(status).json(body);
}
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Local Docker Postgres (see docker-compose.yml). Port 5434 avoids 5432/5433.
POSTGRES_URL=postgres://suzi:suzi@localhost:5434/suzi

# In PRODUCTION, do NOT use this. Set POSTGRES_URL in the Vercel dashboard to
# your Supabase *connection pooler* string:
#   Supabase project -> Settings -> Database -> Connection pooling -> URI
```

- [ ] **Step 3 (optional, recommended): End-to-end check with `vercel dev`**

This requires the free Vercel CLI (`npm i -g vercel`). In one terminal, with the DB up and `POSTGRES_URL` exported (or in a local `.env`):

Run: `make dev`
Then in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2e@example.com"}'
```

Expected: `{"ok":true}`. Confirm the row landed:

```bash
make db-psql
# then at the psql prompt:
SELECT email FROM signups WHERE email = 'e2e@example.com';
```

Expected: one row. (If you don't want to install the Vercel CLI now, skip this — Tasks 3 and 5 already prove the handler logic and the DB write independently.)

- [ ] **Step 4: Commit**

```bash
git add api/subscribe.js .env.example
git commit -m "feat: add /api/subscribe Vercel function and .env.example"
```

---

## Task 7: Rewire the frontend forms

Both forms currently `alert()` and discard the email. Replace each with a call to one shared `submitWaitlist()` function, and add a hidden honeypot field to each.

**Files:**
- Modify: `index.html` (hero form ~line 308, CTA form ~line 471, and just before `</body>`)

> **Note for the executor:** Read the exact lines first; preserve the file's existing leading indentation when replacing each block (the `<form>`/`</form>` lines are indented in the source). The `class="hero-form"` / `class="cta-form"` attributes make each form's opening tag a unique anchor.

- [ ] **Step 1: Rewire the hero form**

Find this exact block:

```html
<form class="hero-form" onsubmit="event.preventDefault(); alert('Demo only — connect to a real form provider when shipping.')">
          <input type="email" class="hero-input" placeholder="your@email.com" required>
          <button type="submit" class="hero-btn">Join waitlist</button>
        </form>
```

Replace it with:

```html
<form class="hero-form" onsubmit="return submitWaitlist(event, this)">
          <input type="email" class="hero-input" placeholder="your@email.com" required>
          <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
          <button type="submit" class="hero-btn">Join waitlist</button>
        </form>
```

- [ ] **Step 2: Rewire the CTA form**

Find this exact block:

```html
<form class="cta-form" onsubmit="event.preventDefault(); alert('Demo only — connect to a real form provider when shipping.')">
    <input type="email" class="cta-input" placeholder="your@email.com" required>
    <button type="submit" class="cta-btn">Join waitlist</button>
  </form>
```

Replace it with:

```html
<form class="cta-form" onsubmit="return submitWaitlist(event, this)">
    <input type="email" class="cta-input" placeholder="your@email.com" required>
    <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <button type="submit" class="cta-btn">Join waitlist</button>
  </form>
```

- [ ] **Step 3: Add the shared script before `</body>`**

Find:

```html
</body>
</html>
```

Replace with:

```html
<script>
// One submit handler shared by both waitlist forms (DRY).
async function submitWaitlist(event, form) {
  event.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const emailInput = form.querySelector('input[type="email"]');
  const honeypot = form.querySelector('input[name="website"]');
  const original = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Joining…';

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value, website: honeypot.value }),
    });
    const data = await res.json();
    if (data.ok) {
      btn.textContent = "You're in ✓";
      emailInput.value = '';
    } else {
      btn.disabled = false;
      btn.textContent = 'Try again';
      setTimeout(() => { btn.textContent = original; }, 2500);
    }
  } catch {
    btn.disabled = false;
    btn.textContent = 'Try again';
    setTimeout(() => { btn.textContent = original; }, 2500);
  }
  return false;
}
</script>
</body>
</html>
```

- [ ] **Step 4: Manual verification**

With `make dev` running and the DB up, open `http://localhost:3000` in a browser. Submit the hero form with a valid email → button shows "Joining…" then "You're in ✓". Submit the CTA form similarly. Confirm both rows exist:

```bash
docker compose exec db psql -U suzi -d suzi -c "SELECT email FROM signups ORDER BY created_at DESC LIMIT 5;"
```

Expected: your two test emails appear.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: wire both forms to /api/subscribe via shared submitWaitlist()"
```

---

## Task 8: Update the README

The README's current "connect the email form" / Web3Forms section is now obsolete — the form is wired to our own backend.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the obsolete form-wiring section**

Open `README.md`. Delete the entire section that starts with the heading
`## ⚠️ Do this BEFORE you go public: connect the email form` and runs through
the end of the Option B / Mailchimp note (up to the `---` before
`## Other pre-launch checklist`).

Replace it with:

```markdown
## Backend: real waitlist capture (already wired)

The hero and CTA forms POST to `/api/subscribe`, a Vercel serverless function
that stores each email in a Postgres `signups` table. Nothing is thrown away.

### Run it locally
1. `make db-up` — start local Postgres (Docker, host port 5434).
2. Create `.env` from `.env.example` (the default local `POSTGRES_URL` works as-is).
3. `make dev` — serves the site + `/api/subscribe` (needs `npm i -g vercel`).
4. `make test` — run the unit tests.

Useful: `make db-psql` (open a SQL shell), `make db-reset` (wipe + recreate).

### Production database (Supabase — free, no card)
1. Create a free project at https://supabase.com (commercial use allowed on free tier).
2. Run the contents of `db/schema.sql` once in the Supabase SQL editor.
3. Settings → Database → Connection pooling → copy the **URI**.
4. In Vercel → Project → Settings → Environment Variables, add
   `POSTGRES_URL` = that pooler URI. Redeploy.

Export signups anytime from the Supabase table editor (CSV).
```

- [ ] **Step 2: Verify the deploy section still applies**

Confirm the existing "## Deploy (Vercel …)" section is intact below — it still
applies (static `index.html` + the `api/` function deploy together on Vercel).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: replace fake-form instructions with real backend setup"
```

---

## Final verification

- [ ] `node --test` → all unit tests pass, integration test skipped.
- [ ] `make db-up` then `POSTGRES_URL=postgres://suzi:suzi@localhost:5434/suzi node --test` → integration test also passes.
- [ ] Browser: both forms store a row (Task 7 Step 4).
- [ ] `git status` clean; `.env` and `node_modules/` are NOT tracked.
```
