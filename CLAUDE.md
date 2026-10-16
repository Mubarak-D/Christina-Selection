# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Internal tool for Christina Jewellers. Staff send a customer a curated set of jewellery pieces (photos, video, details) as a private link over WhatsApp; the customer picks the pieces they want on their phone; staff see the choice and the rest of the set is marked dismissed. Also holds customer records and shows alerts.

Status: not yet scaffolded. Update the Commands section once it is. Full design: `docs/superpowers/specs/2026-10-16-selection-app-design.md`.

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
  - the windows are constants; alerts live in one `alerts` DB view
- The customer page is the only public, unauthenticated surface. Validate the token server-side and expose only that set's data. Enforce access with Supabase RLS.
- Staff signup is invite-only (public signup disabled in Supabase). RLS allows `authenticated` only; the customer page uses token-scoped server code with the service role key, which must never reach the browser.
- Design: quiet luxury (awesome-design-md apple/bugatti references), warm ivory with a gold accent and a serif display font. Motion on the customer page only, always honouring `prefers-reduced-motion`.
- Customer data is personal data: never log phone numbers or put them in URLs other than the `wa.me` link.

## Commands
TBD after scaffolding (expected: `npm run dev`, `npm run build`, `npm run lint`).
