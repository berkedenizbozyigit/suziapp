# Suzi mobile — smoke test

Manual end-to-end check for the core loop of the Expo app in `mobile/`:
**Discover → swipe right (save) / left (skip) → Saved.**

The app is an AI swipe-based fashion shopping assistant. It boots an anonymous
Supabase session, shows a Tinder-style card deck of in-stock products on the
**Discover** tab, and writes right-swipes to `saved_items`, which the **Saved**
tab reads back grouped by folder. UI copy is in Turkish (noted inline below).

> Scope: this verifies the working swipe loop only. Search is a Postgres
> `ilike` match on title/category — there is no vector/AI search yet.

## Prerequisites

- **Node + npm** (LTS; matching the Expo SDK 56 toolchain).
- **Xcode** with an iOS Simulator installed (the loop is verified on iOS).
- **`mobile/.env`** with the two public vars the client reads (see
  `mobile/lib/supabase.ts`; missing either throws at startup):
  ```
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
  ```
  Only `EXPO_PUBLIC_*` vars are inlined into the bundle. Use the publishable
  (anon) key — never the service-role key. A template lives at
  `mobile/.env.example`.
- **Anonymous sign-in enabled** in Supabase: Authentication → Providers →
  Anonymous. Saves require a session because RLS scopes `saved_items` to
  `auth.uid()`. If it is off, the app surfaces a red banner (see step 2).
- Supabase `products` table populated with at least a few rows where
  `in_stock = true` (the deck shows the newest 30).

## Install & run

```bash
cd mobile
npm install
npm run ios     # expo start --ios — boots Metro and opens the iOS Simulator
```

Other entry points: `npm start` (Expo dev server / QR), `npm run android`,
`npm run web`.

> **Env changes need a Metro cache clear.** After editing `mobile/.env`,
> `EXPO_PUBLIC_*` values are only re-inlined when Metro restarts with its cache
> cleared:
> ```bash
> npx expo start -c --ios
> ```
> Without `-c` the old (or missing) values can persist and you may hit the
> "Missing Supabase config" throw or a stale URL/key.

## Manual smoke test (core loop)

1. **Launch.** Run `npm run ios`. Success: the app opens to a bottom tab bar
   with two tabs, **Discover** and **Saved**, landing on Discover.

2. **Anonymous session established.** On launch `App.tsx` calls
   `ensureSession()` (`mobile/lib/auth.ts`), which reuses a stored session or
   signs in anonymously. Success: **no red banner** appears and the Discover
   deck can load.
   - If anonymous sign-in is **disabled**, a red banner appears at the top with
     the exact message from `auth.ts`:
     *"Anonymous sign-in is DISABLED. Enable it in Supabase: Authentication ->
     Providers -> Anonymous, then reload the app."* (also logged as
     `[auth] ...`). Enable the provider, then reload.

3. **Discover shows product cards.** Discover loads up to 30 newest in-stock
   products (`fetchProducts('')`). Success: a card stack renders — top card
   shows image, brand, title, and formatted price; a second card peeks behind
   it. A spinner shows while loading.
   - Empty result → "Sonuç yok" / "Farklı bir arama deneyebilirsin."
   - Load error → "Bir şeyler ters gitti" with a "Tekrar dene" retry button.
   - (Optional) Type in the "Ne arıyorsun?" box and tap **Ara** to filter by
     title/category.

4. **Swipe right to save.** Drag the top card to the right past ~28% of screen
   width, or flick it quickly. Success: a green **SAVE** badge fades in as you
   drag; on release the card animates off-screen, the next card scales up to the
   top, and a dark toast appears at the bottom reading **"Kaydedildi · <title>"**.
   Behind the scenes this inserts a row into `saved_items`
   (`saveProduct`, `mobile/lib/queries.ts`).
   - If the save fails, the toast instead reads **"Kaydedilemedi · <reason>"**
     (e.g. "Not signed in — cannot save this item." when there is no session).
   - Swiping **left** shows a red **SKIP** badge and a **"Atlandı · <title>"**
     toast, and does **not** save.
   - After the last card: "Hepsini gördün 🎉" / "Yeni ürünler için tekrar ara."
     with a "Yenile" button.

5. **Open Saved.** Tap the **Saved** tab. On focus it re-fetches
   (`useFocusEffect` → `fetchSavedItems`), so a just-swiped item shows without a
   manual reload. Success: a list with a section header and your saved rows
   (thumbnail, brand, title, price).

6. **Verify the item landed in the right section.** Saves with `folder_id = null`
   (every right-swipe currently) group under the **"All saves"** section, which
   sorts first; named folders follow alphabetically. The header shows
   `All saves · <count>`. Success: the item swiped in step 4 appears as the top
   row under **All saves**, and the count reflects it.
   - With nothing saved yet: "Henüz kayıt yok" / "Discover'da sağa kaydırarak
     beğendiklerini buraya ekle." Pull-to-refresh is available.

Passing all six steps confirms the loop end-to-end: session → deck → right-swipe
write → Saved read-back in the correct section.

## Build / typecheck check

TypeScript typecheck against the project config:

```bash
cd mobile
npx tsc --noEmit
```

Result (2026-06-30): **PASS** — exit code 0, no errors. `node_modules`
(including `typescript`) was present, so no install was needed. The simulator
was intentionally not launched for this automated check.
