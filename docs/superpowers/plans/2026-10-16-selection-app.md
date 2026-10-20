# Christina Jewellers Selection App Implementation Plan

> **Status (2026-10-20): complete and live.** Kept for history; the boxes were never ticked. Later changes (customer email/deadline instead of birthday/anniversary, sales, job cards) are described in `CLAUDE.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff send a customer a WhatsApp link to a set of jewellery pieces; the customer picks any number on their phone; staff see the choice, manage customers, and get alerts.

**Architecture:** One Next.js App Router app on Netlify with two surfaces: a staff app behind Supabase Auth, and a public token page `/s/[token]`. All data rules live in Postgres: RLS for staff access, a `security definer` function for the customer submit, and a view for alerts. Media sits in a private Storage bucket and is served via signed URLs.

**Tech Stack:** Next.js (App Router, TypeScript, Tailwind), `@supabase/supabase-js` + `@supabase/ssr`, Supabase CLI (migrations), Vitest (unit + DB integration), Playwright (e2e). There's no animation library and no gallery library: CSS scroll-snap, CSS transitions and one IntersectionObserver hook.

**Spec:** `docs/superpowers/specs/2026-10-16-selection-app-design.md`

## Global Constraints

- Hosting is **Netlify**; Vercel is not available. Deploys come from GitHub `main`.
- There are two Supabase projects: **`cj-dev`** (local dev and all tests) and **`cj-prod`** (live). Tests never touch `cj-prod`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in files that `import 'server-only'`.
- RLS is on for every table and allows the `authenticated` role only. Public signup is disabled.
- Customers choose **any number** of pieces, including zero ("None of these"). They can resubmit until `handled_at` is set; each submit clears `seen_at`.
- Alert windows: no reply after **3 days**; birthday or anniversary within **7 days**. Both are constants in the `alerts` view SQL.
- Signed media URLs have a TTL of **3600 s**. The upload limit is **50 MB** per file, and the upload form must say so.
- Send via `https://wa.me/<digits>?text=<urlencoded>`, with no WhatsApp API.
- `lib/config.ts` holds `CURRENCY` (ISO code) and `DEFAULT_COUNTRY_CODE` (digits). **Ask the user for both in Task 1.**
- Customer-facing copy uses the name "Christina Jewellers". Never log phone numbers.
- Motion respects `prefers-reduced-motion: reduce` (no transforms, no shimmer).
- The user's keyboard has no working "w" key; they type "v". Read their messages accordingly.

## Review Focus

1. **Zero pieces chosen.** The customer means "none of these suit me". Expect all items `dismissed`, status `ok`, and the button labelled "None of these". (Task 3 test and Task 9 UI.)
2. **Forged or stale piece ids in a submit** (tampered request, or a piece removed from the set). Expect the whole submit rejected as `invalid` with nothing changed. (Task 3.)
3. **Double-tap submit or two tabs.** Expect a repeat submit with the same ids to be idempotent, with no error and identical rows. (Task 3.)
4. **Phone typed as `07700 900123`, `+44 (7700) 900-123` or `0044…`.** Expect normalisation to E.164 digits, so the `wa.me` link works and duplicates are caught by the unique index. (Task 7.)
5. **Birthday on 29 Feb, or dates across New Year** (today 28 Dec, birthday 2 Jan). Expect each to appear in upcoming dates with the right day count. (Task 4.)

---

## File structure

```
app/
  layout.tsx, globals.css            # fonts, tokens (Task 11 fills tokens)
  login/page.tsx, login/actions.ts   # signIn(formData)
  auth/confirm/route.ts              # invite/recovery link → session
  account/password/page.tsx          # set password after invite
  (staff)/layout.tsx                 # nav, sign out
  (staff)/page.tsx                   # dashboard (alerts)
  (staff)/customers/{page,[id]/page,actions}.tsx|ts
  (staff)/catalogue/{page,new/page,[id]/page,actions}.tsx|ts
  (staff)/sets/{new/page,[id]/page,actions}.tsx|ts
  s/[token]/{page.tsx,SelectionForm.tsx,actions.ts,not-found.tsx}
components/MediaUploader.tsx, components/Reveal.tsx
lib/config.ts, lib/phone.ts, lib/whatsapp.ts, lib/public-set.ts
lib/supabase/{server.ts,client.ts,service.ts}
middleware.ts
supabase/migrations/0001_schema.sql … 0004_alerts.sql
tests/unit/*.test.ts, tests/db/*.test.ts, e2e/*.spec.ts, e2e/global-setup.ts
```

---

### Task 1: Scaffold, accounts, first deploy

**Files:**
- Create: the project via `create-next-app`, plus `lib/config.ts`, `.env.example`, `netlify.toml` (only if Netlify's auto-detect fails)

**Interfaces:**
- Produces: `lib/config.ts` exporting `CURRENCY: string`, `DEFAULT_COUNTRY_CODE: string`, `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!`

- [ ] **Step 1:** Ask the user for the currency and the country dialling code. Write `lib/config.ts`.
- [ ] **Step 2:** `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`. Because `CLAUDE.md` and `docs/` already exist, scaffold into a temp dir and move the files in if it refuses.
- [ ] **Step 3:** `npm i @supabase/supabase-js @supabase/ssr server-only` and `npm i -D vitest @playwright/test supabase`.
- [ ] **Step 4:** Add the scripts `"test": "vitest run"` and `"e2e": "playwright test"`. Write `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, with empty values.
- [ ] **Step 5:** The user creates GitHub, Supabase (`cj-dev` project) and Netlify accounts. Guide them; never enter their passwords. The user pastes the `cj-dev` keys into `.env.local` themselves.
- [ ] **Step 6:** Run `npm run build`. Expected: success.
- [ ] **Step 7:** Commit, create the GitHub repo, push, and connect it in Netlify with env vars set. Expected: the default Next page is live at the Netlify URL.
- [ ] **Step 8:** Update the `CLAUDE.md` Commands section (`dev`, `build`, `lint`, `test`, `e2e`, `npx supabase db push`) and commit.

### Task 2: Schema, RLS, storage bucket

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `0002_rls_storage.sql`, `tests/db/rls.test.ts`, `tests/db/helpers.ts`

**Interfaces:**
- Produces the tables:
  - `customers(id uuid pk, name text not null, phone text not null unique, birthday date, anniversary date, notes text, created_at)`
  - `pieces(id, title text not null, price numeric(12,2), metal text, karat text, weight_g numeric(8,2), stones text, description text, in_catalogue bool not null default true, created_at)`
  - `piece_media(id, piece_id fk cascade, path text not null, kind text check in ('image','video'), sort int default 0)`
  - `selection_sets(id, customer_id fk, title text, token text unique not null default <32-char url-safe>, sent_at, submitted_at, seen_at, handled_at timestamptz, created_by uuid default auth.uid(), created_at)`
  - `set_items(set_id fk cascade, piece_id fk, status text not null default 'pending' check in ('pending','chosen','dismissed'), pk(set_id, piece_id))`
- Produces the token default `translate(encode(gen_random_bytes(24),'base64'),'+/','-_')`, which gives 32 characters.
- Produces the private bucket `media`. Storage policies: `authenticated` can select, insert and delete where `bucket_id='media'`.
- Produces `tests/db/helpers.ts`: `anon()`, `service()` (Supabase clients built from `.env.local`), and `cleanup(ids)`.

- [ ] **Step 1:** Write the failing test `rls.test.ts › anon reads nothing`. For each table, `anon().from(t).select()` returns `data` equal to `[]`. A second test, `anon cannot insert`, expects `error` not null on a `customers` insert.
- [ ] **Step 2:** The user runs `npx supabase login` and `npx supabase link --project-ref <cj-dev ref>`. Run `npm test`. Expected: FAIL (the tables don't exist).
- [ ] **Step 3:** Write both migrations: enable RLS plus one `for all to authenticated using (true) with check (true)` policy per table. Run `npx supabase db push`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** In the Supabase dashboard (user), disable "Allow new users to sign up". Commit.

### Task 3: `submit_selection` function

**Files:**
- Create: `supabase/migrations/0003_submit.sql`, `tests/db/submit.test.ts`

**Interfaces:**
- Produces: `submit_selection(p_token text, p_chosen uuid[]) returns text`, which returns `'ok' | 'invalid' | 'locked'`. It is `security definer`, `set search_path = public`, granted to `anon` and `service_role`. It runs as one transaction.

- [ ] **Step 1:** Write the failing tests. Seed: 1 customer, 3 pieces A B C, and a set with all 3.
  - `chooses 2 of 3`: rpc with `[A,B]` returns `'ok'`; statuses are A and B chosen, C dismissed; `submitted_at` is not null and `seen_at` is null.
  - `resubmit changes choice`: then `[C]` gives C chosen and A, B dismissed.
  - `zero chosen`: `[]` returns `'ok'` with all dismissed.
  - `idempotent`: `[A]` twice returns `'ok'` both times with the same rows.
  - `foreign id`: `[A, <random uuid>]` returns `'invalid'` and the statuses are unchanged.
  - `unknown token`: returns `'invalid'`.
  - `locked`: set `handled_at`, then `[A]` returns `'locked'` and nothing changes.
  - `anon can call`: `anon().rpc(...)` works, but `anon().from('set_items')` still returns `[]`.
- [ ] **Step 2:** Run `npm test tests/db/submit.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement in this order:
  1. Look up the set by token, `for update`.
  2. Return `invalid` if it's missing, or `locked` if `handled_at` is set.
  3. Return `invalid` if any `p_chosen` isn't in `set_items`.
  4. Update the statuses with `case when piece_id = any(p_chosen)`.
  5. Set `submitted_at = now()` and `seen_at = null`.
- [ ] **Step 4:** Run `npx supabase db push`, then `npm test`. Expected: PASS. Commit.

### Task 4: Alerts view

**Files:**
- Create: `supabase/migrations/0004_alerts.sql`, `tests/db/alerts.test.ts`

**Interfaces:**
- Produces `next_occurrence(d date, today date default current_date) returns date`. It returns the anniversary of `d` on or after `today`. Feb 29 falls on Feb 28 in non-leap years, which is Postgres's `date + interval 'n years'` behaviour.
- Produces the view `alerts` (`security_invoker = true`) with columns `kind text ('new_choice'|'no_reply'|'upcoming_date')`, `customer_id uuid`, `customer_name text`, `set_id uuid null`, `label text`, `due date`:
  - `new_choice`: `submitted_at is not null and seen_at is null and handled_at is null`
  - `no_reply`: `sent_at < now() - interval '3 days' and submitted_at is null`
  - `upcoming_date`: `next_occurrence(birthday|anniversary) <= current_date + 7`, with label `'Birthday'` or `'Anniversary'`

- [ ] **Step 1:** Write the failing tests:
  - `next_occurrence` via `select next_occurrence('2000-02-29','2027-02-01')` returns `2027-02-28`
  - `('1990-01-02','2026-12-28')` returns `2027-01-02`
  - `('1990-10-16','2026-10-16')` returns `2026-10-16`
  - one test per alert kind using seeded rows (backdate `sent_at` 4 days for `no_reply`; a 2-day-old one must **not** appear)
  - a handled set doesn't appear as `new_choice`

  Since `today` defaults to `current_date`, give birthday rows `current_date + 5` minus N years.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the function and the view. Push.
- [ ] **Step 4:** Run. Expected: PASS. Commit.

### Task 5: Supabase clients, middleware, staff login, invite flow

**Files:**
- Create: `lib/supabase/server.ts`, `client.ts`, `service.ts`, `middleware.ts`, `app/login/*`, `app/auth/confirm/route.ts`, `app/account/password/page.tsx`, `app/(staff)/layout.tsx`, `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/auth.spec.ts`

**Interfaces:**
- Produces:
  - `createClient(): Promise<SupabaseClient>` (server, cookies, anon key)
  - `createBrowserClient(): SupabaseClient`
  - `createServiceClient(): SupabaseClient` (`server-only`, service key, no session persistence)
  - public paths: `/login`, `/auth/*`, `/s/*`; everything else redirects to `/login` without a session
- `e2e/global-setup.ts`:
  - creates the `cj-dev` user `e2e-staff@example.test` with a random password via `auth.admin`
  - logs in and saves the session to `e2e/.auth/staff.json` (gitignored)
  - doesn't store the password anywhere else

- [ ] **Step 1:** Write the failing e2e test `auth.spec.ts`:
  - unauthenticated `/` redirects to `/login`
  - unauthenticated `/s/anything` does **not** redirect
  - with the saved state, `/` shows the nav text "Dashboard"
- [ ] **Step 2:** Run `npx playwright install chromium && npm run e2e`. Expected: FAIL.
- [ ] **Step 3:** Implement the clients and middleware following the `@supabase/ssr` Next.js guide. Implement the login form (`signInWithPassword`), the `/auth/confirm` route (`verifyOtp({ type, token_hash })`, then redirect to `/account/password`), the password page (`updateUser({ password })`), and a staff layout with nav (Dashboard, Customers, Catalogue, New set) and sign out.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS. Commit.

### Task 6: Catalogue and media upload

**Files:**
- Create: `app/(staff)/catalogue/{page,new/page,[id]/page,actions}.tsx|ts`, `components/MediaUploader.tsx`, `e2e/catalogue.spec.ts`, `e2e/fixtures/{ring.jpg,ring.mp4}` (tiny)

**Interfaces:**
- Produces:
  - `savePiece(formData): Promise<{ id: string }>`, with fields matching the `pieces` columns and `in_catalogue` from a hidden field
  - `deleteMedia(mediaId: string): Promise<void>`
  - `<MediaUploader pieceId={string} />`: browser upload to `media/{pieceId}/{crypto.randomUUID()}.{ext}`, then a `piece_media` insert. `kind` comes from the MIME prefix. It rejects files over 50 MB client-side with "Max 50 MB per file", and accepts `image/*,video/*`.
  - `signedUrls(paths: string[]): Promise<Record<string,string>>` in `lib/public-set.ts` (service, TTL 3600), reused by Task 9

- [ ] **Step 1:** Write the failing e2e test: create the piece "Test Ring" with price 100 and upload both fixtures. The piece page shows 1 `img` and 1 `video`. The catalogue grid lists "Test Ring", and one-offs (`in_catalogue=false`) are **not** listed.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the pages and actions. The grid shows the first image thumbnail, title and price formatted with `Intl.NumberFormat(undefined,{style:'currency',currency:CURRENCY})`.
- [ ] **Step 4:** Run. Expected: PASS. Commit.

### Task 7: Customers and phone normalisation

**Files:**
- Create: `lib/phone.ts`, `tests/unit/phone.test.ts`, `app/(staff)/customers/{page,[id]/page,actions}.tsx|ts`

**Interfaces:**
- Produces: `normalisePhone(input: string, defaultCc = DEFAULT_COUNTRY_CODE): string | null`, which returns `+<8–15 digits>` or `null`
- Produces: `saveCustomer(formData): Promise<{ id } | { error: string }>`, where a duplicate phone returns `{ error: 'A customer with this number already exists' }` (Postgres code `23505`)

- [ ] **Step 1:** Write the failing unit tests with `defaultCc='44'`:
  - `'07700 900123'` gives `'+447700900123'`
  - `'+44 (7700) 900-123'` gives the same
  - `'0044 7700 900123'` gives the same
  - `'12'` gives `null`
  - `'abc'` gives `null`
- [ ] **Step 2:** Run `npm test tests/unit`. Expected: FAIL.
- [ ] **Step 3:** Implement the rules:
  1. Strip everything except digits and a leading `+`.
  2. A leading `00` becomes `+`.
  3. A leading single `0` becomes `+${defaultCc}` with the `0` dropped.
  4. No `+` gets `+${defaultCc}` prepended.
  5. Validate the length.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Build the customers list (search by name or phone with `ilike`), the create/edit form, and the detail page with set history (title, sent, submitted, chosen count, handled). Commit.

### Task 8: Sets — build, send, see, handle

**Files:**
- Create: `lib/whatsapp.ts`, `tests/unit/whatsapp.test.ts`, `app/(staff)/sets/{new/page,[id]/page,actions}.tsx|ts`

**Interfaces:**
- Consumes: `normalisePhone` (Task 7), `savePiece` (Task 6) for one-offs with `in_catalogue=false`
- Produces:
  - `buildWhatsAppLink(phoneE164: string, url: string, firstName: string): string`
  - `createSet(formData): Promise<{ id: string }>`
  - `markSent(setId)`, `markSeen(setId)` (only if `submitted_at` is set and `seen_at` is null), `markHandled(setId)`, `reopen(setId)` (clears `handled_at`)
- Message copy (exact): `Hi {firstName}, here are the pieces from Christina Jewellers you asked to see. Tap to choose your favourites: {url}`

- [ ] **Step 1:** Write the failing unit test: `buildWhatsAppLink('+447700900123','https://x.test/s/abc','Ana')` equals `'https://wa.me/447700900123?text='` plus `encodeURIComponent` of the exact copy.
- [ ] **Step 2:** Run. Expected: FAIL. Implement. Run. Expected: PASS.
- [ ] **Step 3:** Build the new-set page: a customer select, a catalogue checkbox grid, and an "Add one-off piece" inline form with uploader. Saving redirects to `/sets/[id]`.
- [ ] **Step 4:** Build the set detail page. It calls `markSeen` on render. Chosen pieces come first and dismissed ones are greyed. The **Send on WhatsApp** `<a target="_blank">` calls `markSent` on click, and there's **Mark handled** / **Reopen**. Also show a "Copy link" fallback.
- [ ] **Step 5:** Manual check with the user: build a set; on the phone, the button opens WhatsApp with the message prefilled. Commit.

### Task 9: Customer page `/s/[token]`

**Files:**
- Create: `lib/public-set.ts` (extend), `app/s/[token]/{page.tsx,SelectionForm.tsx,actions.ts,not-found.tsx}`, `e2e/customer.spec.ts`

**Interfaces:**
- Consumes: `submit_selection` (Task 3), `signedUrls` (Task 6), `createServiceClient` (Task 5)
- Produces:
  - `getPublicSet(token: string): Promise<PublicSet | null>`, where `PublicSet = { title: string|null; firstName: string; submitted: boolean; locked: boolean; items: { pieceId; title; price; metal; karat; weightG; stones; description; status; media: { kind: 'image'|'video'; url: string }[] }[] }`. It selects only these fields, never the phone, notes or other sets.
  - `submitSelection(token: string, chosen: string[]): Promise<'ok'|'invalid'|'locked'|'error'>`
- UI rules:
  - The gallery uses CSS scroll-snap; video is `<video controls playsInline preload="metadata">`.
  - Tapping toggles selection. The sticky bar reads "Submit my choice (n)", or "None of these" when n=0.
  - When submitted and not locked, show the thank-you screen with "Change my choice". When locked, show "Your jeweller is preparing your selection" with no controls.
  - On `'error'`, keep the selection and show "Couldn't send — please try again".
  - An invalid token renders `not-found.tsx` with "This link isn't valid".
  - The page sets `robots: noindex` and `referrer: no-referrer`.

- [ ] **Step 1:** Write the failing e2e test `customer.spec.ts` (seed through the service client):
  - open `/s/<token>` on the Pixel 7 device profile, tap 2 of 3 cards and submit; the thank-you screen lists 2; the DB has 2 chosen and 1 dismissed
  - "Change my choice", pick 1, submit; the DB has 1 chosen
  - set `handled_at` and reload; the locked text shows and there are no buttons
  - `/s/nope` shows "This link isn't valid"
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with functional styling only; Task 11 styles it.
- [ ] **Step 4:** Run. Expected: PASS. Commit.

### Task 10: Dashboard alerts

**Files:**
- Modify: `app/(staff)/page.tsx`
- Create: `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: the `alerts` view (Task 4)

- [ ] **Step 1:** Write the failing e2e test: seed one set of each alert kind. The dashboard shows three sections, "New choices", "No reply yet" and "Coming up", each containing its seeded customer name. The New-choice row links to `/sets/[id]`, and after visiting it, it is gone from the dashboard.
- [ ] **Step 2:** Run. Expected: FAIL. Implement (a server component reading `alerts`, ordered by `due`). Run. Expected: PASS.
- [ ] **Step 3:** Add a count badge on the "Dashboard" nav item for `new_choice`. Commit.

### Task 11: Design and motion pass

**Files:**
- Create: `DESIGN.md`, `components/Reveal.tsx`
- Modify: `app/globals.css`, `app/layout.tsx`, customer-page and staff components

**Interfaces:**
- Produces: `<Reveal>` (IntersectionObserver adds `data-in` once; CSS does the fade and rise in 400 ms with ease-out, and does nothing under reduced motion)

- [ ] **Step 1:** Invoke `awesome-design-md` (`apple.md` and `bugatti.md`) and `ui-ux-pro-max`, then write `DESIGN.md`: quiet luxury, warm ivory background, a gold accent, a serif display font plus a sans body font via `next/font/google`, and the spacing and radius scale. Tokens go into `globals.css` as CSS variables, with light mode only unless the user asks otherwise.
- [ ] **Step 2:** Invoke `ecc:motion-foundations` and `ecc:motion-patterns`. Apply the motion to the customer page: card `Reveal`, a selection gold ring with a 150 ms scale "pop", the submit bar sliding up when it first appears, and a shimmer on the thank-you screen. The staff app gets hover and focus states only.
- [ ] **Step 3:** Invoke `taste` and `impeccable` to critique and polish both surfaces. Re-run `npm run e2e`. Expected: PASS (selectors are role- and text-based, so they survive restyling).
- [ ] **Step 4:** Run `ecc:frontend-a11y`: 44 px tap targets, focus rings, `alt` on images, contrast ≥ 4.5:1 for gold on ivory text (darken the gold for text if needed). Fix the findings.
- [ ] **Step 5:** The user checks it on a real phone through the Netlify deploy. Commit.

### Task 12: Security review and go-live

- [ ] **Step 1:** Run `ecc:security-review` on `app/s/[token]/*`, `lib/public-set.ts`, `lib/supabase/service.ts`, `middleware.ts` and the migrations. Fix the findings, re-run all tests, and commit.
- [ ] **Step 2:** The user creates the Supabase project `cj-prod`. Run `npx supabase link` to prod and `db push`, and disable signup. Set the Netlify env vars to prod, with `NEXT_PUBLIC_SITE_URL` as the live URL. Add the live URL to Supabase Auth's redirect allow-list.
- [ ] **Step 3:** The user invites the staff from the Supabase dashboard. Each staff member clicks the invite, which lands on `/account/password`, sets a password and sees the dashboard.
- [ ] **Step 4:** Smoke test on prod: one real piece, one test customer (the user's own phone), send, choose, see the alert, mark handled. Then delete the test data.
