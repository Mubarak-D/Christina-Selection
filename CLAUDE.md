# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Internal tool for Christina Jewellers. Staff send a customer a curated set of jewellery pieces (photos, video, details) as a private link over WhatsApp; the customer picks the pieces they want on their phone; staff see the choice and the rest of the set is marked dismissed. Also holds customer records and shows alerts.

Full design: `docs/superpowers/specs/2026-10-16-selection-app-design.md`.

## Stack
- Next.js (App Router, TypeScript, Tailwind, `@supabase/ssr`), deployed on Netlify (Vercel is not available to the user).
- Supabase: Postgres (data), Auth (staff logins), Storage (photos/videos).
- No other services unless a requirement forces it. Exception: Google Gemini's free tier (plain `fetch`, server only, `GEMINI_API_KEY`) for job card AI fill; without the key the button is off and cards are filled by hand. Free-tier prompts may be used by Google, which the card page tells staff.

## Core model
- `customers`: name, WhatsApp phone (E.164), birthday, anniversary, notes.
- `pieces`: one jewellery item (price, metal, karat, weight, stones, description). `in_catalogue` = false for one-offs added while building a set.
- `piece_media`: photos/videos per piece, files in the private `media` bucket.
- `selection_sets`: a set of pieces sent to one customer. Has an unguessable `token` (used in the public link), `sent_at`, `submitted_at`, `seen_at`, `handled_at`.
- `set_items`: pieces in a set, with `status`: `pending` → `chosen` | `dismissed`.

## Sales
`sales` records what was bought: written only by `mark_handled()` (migration 0011, atomic, replaces a set's sales on re-handle) with title/price copied at sale time. Shown as Purchases on the customer page.

## Job cards
A custom order written up for the maker (`/jobs`, design: `docs/superpowers/specs/2026-10-16-job-cards-design.md`). Rules live in `lib/jobcard.ts` (pure, unit-tested); the AI call in `lib/ai/jobcard.ts`.
- `job_cards` (migration 0012): `customer_words` is the customer's own text, append-only `[{at,text}]`, never written by AI. `fields` jsonb (keys in `FIELDS`; `REQUIRED` = item, metal, purity, size), `edited` = fields a person set (AI fill never overwrites them), `questions` `[{id, field?, text, level: must|check, answer?, prev?}]`, `instructions_en`/`instructions_si`.
- Draft = any open `must` question or empty required field (`openMust`). Answering a question fills its field; clearing the answer restores the old value.
- Every print stamps `printed_at`; the first edit after a print bumps `revision`, and each change is logged in `changes` `[{field, old, new, at, rev}]` (shown crossed out).
- Numbers, purity, sizes and engraving must appear unchanged in the Sinhala instructions; `flagSinhala` keeps a blocking question until they do.
- `job_card_media`: photos under `jobs/<id>/` in the `media` bucket. Deleting a card or customer removes them from storage first.

## Two surfaces
- **Staff app** (auth required): customers, pieces, building and sending sets, dashboard with alerts. All staff have equal access, so there are no roles.
- **Customer page** `/s/[token]` (no login): mobile-first gallery of the set's pieces; customer taps to choose, then submits. On submit, the chosen items become `chosen`, the rest become `dismissed`, and `submitted_at` is set. The customer may resubmit until `handled_at` is set (staff press "Mark handled"); each resubmit clears `seen_at` so staff are alerted again. Customers can choose any number of pieces. Media is served via short-lived signed URLs, never public buckets.

## Conventions
- **Sending:** a `wa.me/<phone>?text=` link with the set URL prefilled; staff tap it and send from their own WhatsApp. No WhatsApp Business API.
- **Alerts** are derived by queries, not stored or scheduled:
  - customer choices: `submitted_at` set and `handled_at` null (stay until Mark handled); `is_new` = `seen_at` null drives the New tag and nav badge
  - no reply: `sent_at` older than 3 days and `submitted_at` null
  - deadlines: customer `deadline` within the next 7 days, or overdue
  - the windows are constants; alerts live in one `alerts` DB view, using Sri Lanka dates (Asia/Colombo)
- The customer page is the only public, unauthenticated surface. Validate the token server-side and expose only that set's data. Enforce access with Supabase RLS.
- Staff = accounts on the `staff` table (RLS uses `public.is_staff()`), not merely signed-in users. Add staff with `npm run staff:add -- email` (invites + lists them). Public signup should also be disabled in Supabase. RLS allows staff only; the customer page uses token-scoped server code with the service role key, which must never reach the browser.
- Design: quiet luxury (awesome-design-md apple/bugatti references), warm ivory with a gold accent and a serif display font. Motion on the customer page only, always honouring `prefers-reduced-motion`.
- Customer data is personal data: never log phone numbers or put them in URLs other than the `wa.me` link.

## Commands
- `npm run dev`: local app at http://localhost:3000, using the `cj-dev` Supabase project from `.env.local`
- `npm run build`, `npm run lint`
- `npm test`: Vitest. Unit tests in `tests/unit`, DB tests in `tests/db` (hit `cj-dev`). One file: `npm test tests/unit/phone.test.ts`
- `npm run e2e`: Playwright. One spec: `npm run e2e -- e2e/customer.spec.ts`
- `npm run types`: regenerate `lib/database.types.ts` after a migration
- `npx supabase db push`: apply `supabase/migrations/*.sql` to the linked project (`npx supabase link --project-ref <ref>` first)

There are two Supabase projects: `cj-dev` (ref `pjiawyrdlltjpbohtsde`, dev and tests) and `cj-prod` (ref `onokcwhqspqildmtxdbp`, live, region Seoul). The CLI stays linked to `cj-dev`; to ship a migration, push to dev, then `npx supabase link --project-ref onokcwhqspqildmtxdbp && npx supabase db push`, then link back to dev. Tests must never point at `cj-prod`.

Live site: https://funny-ganache-e126c2.netlify.app (Netlify site `funny-ganache-e126c2`, deploys from GitHub `main`; env vars point at `cj-prod`). `netlify.toml` declares `@netlify/plugin-nextjs` explicitly; without it Netlify skipped the runtime and every page 404'd.

This is Next.js 16: read `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before using an API you're unsure of.

The build plan and progress: `docs/superpowers/plans/2026-10-16-selection-app.md`.
