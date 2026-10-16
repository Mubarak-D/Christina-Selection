# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Internal tool for Christina Jewellers. Staff send a customer a curated set of jewellery pieces (photos, video, details) as a private link over WhatsApp; the customer picks the pieces they want on their phone; staff see the choice and the rest of the set is marked dismissed. Also holds customer records and shows alerts.

Full design: `docs/superpowers/specs/2026-10-16-selection-app-design.md`.

## Stack
- Next.js (App Router, TypeScript, Tailwind, `@supabase/ssr`), deployed on Netlify (Vercel is not available to the user).
- Supabase: Postgres (data), Auth (staff logins), Storage (photos/videos).
- No other services unless a requirement forces it.

## Core model
- `customers`: name, WhatsApp phone (E.164), birthday, anniversary, notes.
- `pieces`: one jewellery item (price, metal, karat, weight, stones, description). `in_catalogue` = false for one-offs added while building a set.
- `piece_media`: photos/videos per piece, files in the private `media` bucket.
- `selection_sets`: a set of pieces sent to one customer. Has an unguessable `token` (used in the public link), `sent_at`, `submitted_at`, `seen_at`, `handled_at`.
- `set_items`: pieces in a set, with `status`: `pending` → `chosen` | `dismissed`.

## Two surfaces
- **Staff app** (auth required): customers, pieces, building and sending sets, dashboard with alerts. All staff have equal access, so there are no roles.
- **Customer page** `/s/[token]` (no login): mobile-first gallery of the set's pieces; customer taps to choose, then submits. On submit, the chosen items become `chosen`, the rest become `dismissed`, and `submitted_at` is set. The customer may resubmit until `handled_at` is set (staff press "Mark handled"); each resubmit clears `seen_at` so staff are alerted again. Customers can choose any number of pieces. Media is served via short-lived signed URLs, never public buckets.

## Conventions
- **Sending:** a `wa.me/<phone>?text=` link with the set URL prefilled; staff tap it and send from their own WhatsApp. No WhatsApp Business API.
- **Alerts** are derived by queries, not stored or scheduled:
  - customer chose: `submitted_at` set and `seen_at` null
  - no reply: `sent_at` older than 3 days and `submitted_at` null
  - dates: birthday/anniversary within the next 7 days
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
