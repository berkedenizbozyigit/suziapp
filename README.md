# Suzi — Waitlist Website

The marketing + waitlist site for Suzi (stop tabbing. start swiping.).
Single self-contained file: fonts and images are embedded, so `index.html`
opens and deploys with no build step and no other files.

This repo is **only the website**. The actual Suzi app will get its own repo later.

---

## ⚠️ Do this BEFORE you go public: connect the email form

Right now both forms (hero + bottom CTA) are demo-only — they show an alert and
**throw the email away**. If you launch like this, every signup is lost. Pick one
option below and wire it. 5–10 minutes.

### Option A — Web3Forms (fastest, free, no backend) ✅ recommended to start

1. Go to https://web3forms.com, enter `hello@suziapp.com`, copy your Access Key.
2. In `index.html`, find both `<form ...>` tags (search for `onsubmit`).
3. Replace each form's `onsubmit="..."` with the wiring below and paste your key.

```html
<!-- BEFORE -->
<form class="hero-form" onsubmit="event.preventDefault(); alert('Demo only ...')">

<!-- AFTER -->
<form class="hero-form" action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE">
  <input type="hidden" name="subject" value="New Suzi waitlist signup">
  <!-- keep the existing email <input> and <button> exactly as they are -->
```

Do the same for `cta-form`. Submissions land in your email; you can also export them.

### Option B — Mailchimp (if you want a real email list / sending built in)

Mailchimp → Audience → Signup forms → Embedded form → copy the form HTML, and
replace the existing `<form>` blocks with Mailchimp's `<form action="...">`.
Keep Suzi's existing CSS classes so the styling stays intact.

> Either works. Start with A to capture signups today; you can migrate to B later.

---

## Other pre-launch checklist

- [ ] **Form wired** (above) — the only true blocker
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
