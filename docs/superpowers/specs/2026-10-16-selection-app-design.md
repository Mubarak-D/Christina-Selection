# Christina Jewellers selection app: design spec

> **Status (2026-10-20): complete and live.** Kept for history; Later changes (customer email/deadline instead of birthday/anniversary, sales, job cards) are described in `CLAUDE.md`.

## Context
Christina Jewellers wants software to send a customer a set of jewellery pieces (photos, video, price, specs) the customer asked to see. The customer picks pieces on their phone through a WhatsApp link, staff see the choice, and the rest are set aside. The app also holds customer records and shows alerts. The project folder `/home/muba/Desktop/Internal Operations` holds only `CLAUDE.md` so far. All decisions below were approved section by section in brainstorming.

**Success:** a staff member sends a set in under 2 minutes; the customer chooses on their phone without logging in; staff see new choices on the dashboard.

## Decisions (approved)
- Stack: Next.js (App Router, TypeScript, Tailwind) + `@supabase/ssr` and Supabase (Postgres, Auth, Storage), hosted on **Netlify** (Vercel isn't an option), deployed from GitHub.
- Customers can choose **any number** of pieces. They see **photos and video, price and specs**.
- Customers can **change their choice until staff mark the set handled**; after that it's locked.
- Pieces come from a **reusable catalogue or a one-off** added while building a set (`in_catalogue` flag).
- Sending: a `wa.me` link with the message prefilled. No WhatsApp Business API.
- Alerts are a DB view, with no cron: new choice, no reply after **3 days**, birthday or anniversary within **7 days** (constants).
- Small staff team, invite-only, equal access, no roles.
- Look: **quiet luxury** (Apple and Bugatti references), warm ivory with a gold accent and a serif display font, with motion on the customer page.

## Section 1: setup and wiring
- User creates the Supabase, Netlify and GitHub accounts. I guide; account creation is the user's to do.
- `create-next-app` (TS, Tailwind, App Router), plus `@supabase/supabase-js` and `@supabase/ssr` and nothing else up front.
- Layout:
  - `app/(staff)/…`: staff pages behind auth
  - `app/s/[token]/`: public customer page
  - `app/login/`
  - `lib/supabase/{server,client}.ts`
  - `middleware.ts` refreshes the session and guards `(staff)`
  - `supabase/migrations/*.sql`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `NEXT_PUBLIC_SITE_URL`. Values go in `.env.local` and in Netlify's env settings.
- Dev runs against the hosted Supabase project, without a local Docker copy.
- Skills: `ecc:nextjs-turbopack`, `ecc:project-init`.

## Section 2: backend and database
- **Tables:**
  - `customers(name, phone unique E.164, birthday, anniversary, notes)`
  - `pieces(title, price, metal, karat, weight_g, stones, description, in_catalogue)`
  - `piece_media(piece_id, path, kind image|video, sort)` in the private bucket `media`
  - `selection_sets(customer_id, token unique (32 random chars), title, sent_at, submitted_at, seen_at, handled_at, created_by)`
  - `set_items(set_id, piece_id, status pending|chosen|dismissed)` with PK `(set_id, piece_id)`
- **Submit** (server action, service-role, token-scoped):
  - reject if `handled_at` is set
  - set chosen and dismissed for every item
  - set `submitted_at = now()` and `seen_at = null`, so staff get a new-choice alert again
- **`alerts` view:** new choice (submitted and not seen), no reply (sent more than 3 days ago and not submitted), upcoming dates (birthday or anniversary month/day within 7 days).
- **Security:**
  - RLS on all tables allows `authenticated` only, and public signup is disabled
  - the customer page only goes through token-scoped server code
  - media is served via signed URLs with a 1-hour TTL
- Free-plan upload limit is 50 MB per file, so the upload form should say so.
- Skills: `ecc:postgres-patterns`, `ecc:database-migrations`, `ecc:backend-patterns`.

## Section 3: frontend
- **Staff app** (mobile-friendly):
  - Dashboard: the 3 alert lists
  - Customers: list and search, detail with set history
  - Catalogue: grid and piece form with direct-to-storage upload
  - New set: pick a customer, tick catalogue pieces or add a one-off, save, then the **Send on WhatsApp** button
  - Set detail: chosen first, dismissed greyed out, a **Mark handled** button. Opening it sets `seen_at`.
- **Customer page `/s/[token]`:**
  - piece cards with a swipeable photo and video gallery, price and specs, tap to select
  - a fixed "Submit my choice (n)" bar
  - after submitting, a thank-you screen with a "Change my choice" option until the set is handled, then a locked message
  - invalid token shows a "This link isn't valid" page
  - if a submit fails, the ticks are kept and the customer can retry
- **Design and motion** (user asked for these skills):
  - `awesome-design-md` (apple.md and bugatti.md as the base reference)
  - `ui-ux-pro-max` and `ecc:design-system` for tokens
  - `taste` and `impeccable` for critique and polish
  - `ecc:motion-foundations` and `ecc:motion-patterns`
  - `ecc:frontend-a11y`, `ecc:frontend-patterns` and `ecc:react-patterns`
- **Motion:**
  - customer page: cards fade and rise in on scroll, the select state gets a gold ring and pop, the submit bar slides in, and confirming plays a shimmer
  - staff app: minimal motion
  - all motion respects `prefers-reduced-motion`

## Section 4: build order, each phase ending in a visible check
1. **Setup.** Scaffold and deploy. Check: the empty site is live on Netlify.
2. **Database.** Migrations add the tables, the view and RLS. Check: a SQL test shows `anon` can read nothing.
3. **Staff auth and catalogue.** Check: log in, add a piece with a photo and a video.
4. **Customers and sets, plus the WhatsApp button.** Check: build a set and WhatsApp opens with the link.
5. **Customer page and submit.** Check: a Playwright test picks 2 of 3 pieces and submits, the set shows 2 chosen and 1 dismissed, resubmitting changes it, and once handled it's locked.
6. **Dashboard alerts.** Check: seeded data produces all 3 alert types.
7. **Design and motion pass.** Check: `impeccable` audit, `ecc:frontend-a11y`, and a look on a real phone.
8. **Before launch:** `ecc:security-review` on the public token page and the submit action.

Tests stay light: RLS SQL tests, the one Playwright flow, and unit tests for the submit logic and the `wa.me` link builder (`ecc:tdd-workflow`, `ecc:e2e-testing`).

