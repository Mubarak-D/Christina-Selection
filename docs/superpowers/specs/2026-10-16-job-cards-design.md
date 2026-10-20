# Job cards inside the Christina staff app

> **Shipped 2026-10-20, with these changes from the plan below:** AI fill uses Google Gemini's free tier (`GEMINI_API_KEY`, plain `fetch`, falls back from `gemini-3.8-flash` to `gemini-3.6-flash`), not the Anthropic API, so customer chats and photos go to Google and staff are told so. Every print stamps `printed_at` (not only the first), so each print starts a new revision; changes carry their revision number. Any AI question about a required field is treated as *must*. `CLAUDE.md` describes the current model.

## Context
Custom orders (WhatsApp, website, walk-in/phone) reach the maker unclear, because they get retold in the handoff and the details are scattered. After brainstorming → council → acceptance criteria, the user chose to build the job card **inside the existing staff app** (`/home/muba/Desktop/Internal Operations`: Next.js 16, Supabase, Netlify) on a **separate branch**, with Claude reached through a **server-side Anthropic API key**. This reuses staff login, customers, private photo storage and `wa.me` sending, makes printing possible (the artifact viewer couldn't print), and gives saved cards and history for free.

## Behaviour (agreed)
1. **New job card** (`/jobs/new`): pick or create the customer, set source (WhatsApp / Website / Walk-in / Phone) and due date, paste the raw order (or leave it blank for walk-ins), add photos with captions.
2. **Fill with AI**: Claude returns fields, maker instructions in EN + SI, and questions. Some questions are about **missing** required fields (⚠ NOT CONFIRMED). Others are about **important or ambiguous** points even when a value exists (contradictions, plated vs solid, spelling), each marked `must` or `check`.
3. **Fill the gaps**: each question has an **answer box**. An answer fills the linked field and clears the ⚠. Clearing the answer brings the flag back. Any field can be edited directly. **Paste customer reply** adds the reply to the customer's words (with a timestamp) and runs Fill again for the open questions only.
4. **Read back**: a WhatsApp message with the confirmed details and open questions, opened with a `wa.me` link (the existing pattern). Staff press send.
5. **Print** (`/jobs/[id]/print`): one A4 page. Any open `must` question gives a **DRAFT – NOT CONFIRMED** mark with the questions at the top. Suggested PDF name `YYYY-MM-DD_Customer`.
6. **Revisions**: the first print stamps `printed_at`. Edits after that bump `revision` and record `{field, old, new, at}`, and the card shows **REVISION n** with old values crossed out.
7. **List** (`/jobs`): cards sorted by due date, with a count of open questions, plus a section on the customer's page.

Hard rules: the customer's words are stored by the app and **never** come from or get changed by Claude. Numbers, purity, sizes and engraving are never translated: the Sinhala lines refer to the same values, and a check confirms they appear unchanged. A Fill run never overwrites a field a person has edited.

## Files (on branch `feat/job-cards`)
- `supabase/migrations/0012_job_cards.sql`: `job_cards` (customer_id, order_no, source, due_date, taken_by default auth.uid(), `customer_words jsonb` (append-only `[{at,text}]`), `fields jsonb`, `edited text[]`, `questions jsonb`, `instructions_en text[]`, `instructions_si text[]`, revision, printed_at, `changes jsonb`, created_at) and `job_card_media` (job_card_id, path, caption, sort). RLS `staff_all` using `public.is_staff()`, the same as 0006. Photos go in the existing private `media` bucket under `jobs/<id>/`, reusing `mediaPath()` from `lib/media.ts`. Then `npm run types`.
- `lib/jobcard.ts` (pure): `REQUIRED`, `applyAnswer`, `mergeFill` (skips `edited`), `openMust`/`isDraft`, `recordChange`, `readBackMessage`, `numbersPreserved`. Tests in `tests/unit/jobcard.test.ts`.
- `lib/ai/jobcard.ts` (`server-only`): one call to the Anthropic Messages API with the prompt, raw order and photos (signed URLs), using a strict JSON shape, and the model per the `claude-api` skill. Reads `ANTHROPIC_API_KEY`, and the button is hidden or disabled with a clear message if it's missing. Never logs phone numbers or chat text.
- `app/(staff)/jobs/{page,new/page,[id]/page,[id]/print/page,actions}.tsx|ts`, following the `sets/` patterns (server actions, `flash`, `revalidatePath`).
- `lib/whatsapp.ts`: add `buildReadBackLink`. `components/StaffNav.tsx`: add "Job cards". `components/MediaUploader.tsx`: generalise or add a sibling for job card photos with captions.
- `.env.example`: `ANTHROPIC_API_KEY=` (server only). Add the key in Netlify too, before merging.
- `docs/superpowers/specs/2026-10-16-job-cards-design.md`: the agreed design and acceptance criteria. Update `CLAUDE.md` with the job card model.

## Steps
1. `propose_branch` → `feat/job-cards`. Write the spec doc, and the user reviews it.
2. Migration + types, then push to `cj-dev` only.
3. `lib/jobcard.ts`, tests first (TDD), with `npm test` passing.
4. Pages and actions with manual entry (no AI), so walk-ins work end to end.
5. AI fill (`lib/ai/jobcard.ts`), checked against a synthetic Singlish chat.
6. Print page, revisions and read-back.
7. Playwright `e2e/jobcards.spec.ts` for the manual path (create → answer the question → print shows clean / draft → edit after print → REVISION 2).
8. `npm run lint && npm test && npm run build`, then commit on the branch. Merging, pushing to `cj-prod` and setting the Netlify env var happen only on the user's go-ahead.

## Verification
- `npm test` (unit: answer clears the flag, merge keeps edits, draft switch, revision diff, numbers preserved). `npm run e2e -- e2e/jobcards.spec.ts`.
- `npm run dev`. In the browser: paste a synthetic chat with a missing size and a contradictory size, Fill, answer the questions, check that print preview shows DRAFT and then a clean card, edit to see REVISION 2, and check the Read back link text.
