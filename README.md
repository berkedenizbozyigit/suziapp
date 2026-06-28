# Suzi — Waitlist Website

The marketing + waitlist site for Suzi (stop tabbing. start swiping.).
Single self-contained file: fonts and images are embedded, so `index.html`
opens and deploys with no build step and no other files.

This repo is **only the website**. The actual Suzi app will get its own repo later.

---

## Backend: real waitlist capture (already wired)

The hero and CTA forms POST to `/api/subscribe`, a Vercel serverless function
that stores each email in a Postgres `signups` table. Nothing is thrown away.
A hidden honeypot field drops bot submissions; duplicate emails are ignored
safely (no error).

### Run it locally
1. `make db-up` — start local Postgres (Docker, host port 5434).
2. `cp .env.example .env` — the default local `POSTGRES_URL` works as-is.
3. `make dev` — serves the site + `/api/subscribe` (needs `npm i -g vercel`).
4. `make test` — run the unit tests (`node --test`).

Useful: `make db-psql` (open a SQL shell), `make db-reset` (wipe + recreate).

### Production database (Supabase — free, no card)
1. Create a free project at https://supabase.com (commercial use allowed on the free tier).
2. Run the contents of `db/schema.sql` once in the Supabase SQL editor.
3. Settings → Database → Connection pooling → copy the **URI**.
4. In Vercel → Project → Settings → Environment Variables, add
   `POSTGRES_URL` = that pooler URI. Redeploy.

Export signups anytime from the Supabase table editor (CSV).

---

## Other pre-launch checklist

- [x] **Form wired** — done: forms POST to `/api/subscribe` (Postgres-backed)
- [ ] **Counter**: the fake "1,247" was removed. Add a real number back when you have one (see comment in `index.html`).
- [ ] **GDPR**: you're UK/EU. Add one consent line near the form, e.g.
      "By joining you agree we can email you about Suzi's launch." + a short privacy note.
- [ ] **Analytics**: add Plausible or Google Analytics (one snippet in `<head>`).
- [ ] **Social preview**: add Open Graph tags so the link looks right when shared.
- [ ] **Mobile check**: open on a phone, confirm the hero mockups look right.

---

## Push this repo

```bash
git init
git add .
git commit -m "Initial commit: Suzi waitlist site"
git branch -M main
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

## Deploy (Vercel — easiest for a static site)

1. https://vercel.com → New Project → import this GitHub repo.
2. No build settings needed — it's a static `index.html`. Just deploy.
3. Project → Settings → Domains → add `suziapp.com`.
4. At your domain registrar, point DNS to Vercel (their dashboard shows the exact records).

Netlify works identically (drag-and-drop the folder, or connect the repo).

---

## Files

```
suzi-web/
├── index.html     # the entire site (self-contained)
├── README.md      # this file
└── .gitignore
```
