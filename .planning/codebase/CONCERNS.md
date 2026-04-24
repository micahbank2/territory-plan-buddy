# Codebase Concerns

**Analysis Date:** 2026-04-24

---

## Critical

**Edge Functions run without JWT verification (public unauthenticated endpoints):**
- Risk: `supabase/config.toml` disables `verify_jwt` for `chat`, `enrich-prospect`, `ai-readiness`, and `categorize-signal`. Anyone on the internet with the project ref can invoke these functions directly and run up unlimited Anthropic/Lovable API spend. No auth context means no per-user rate-limiting either.
- Files: `supabase/config.toml` (all four `verify_jwt = false` blocks), `supabase/functions/chat/index.ts`, `supabase/functions/enrich-prospect/index.ts`, `supabase/functions/ai-readiness/index.ts`, `supabase/functions/categorize-signal/index.ts`
- Current mitigation: None. `LOVABLE_API_KEY` presence is checked but there is no caller identity check.
- Fix approach: Flip `verify_jwt = true` for all four functions; have the client invoke them via `supabase.functions.invoke()` (already does — `ProspectSheet.tsx:320/358/432`), which attaches the user JWT automatically. Add a server-side rate limit (per user_id) before calling the LLM.

**Soft-delete (`deleted_at`) never shipped — archive is still a hard delete:**
- Risk: Phase 01 planning documents and ROADMAP claim soft-delete was delivered, but the code says otherwise. `remove()` and `bulkRemove()` in `src/hooks/useProspects.ts` (lines 231-243, 273-285) still call `.delete()`. `restore`/`permanentDelete` at lines 442-444 are no-op `_id => {}` stubs. `loadArchivedData` at line 111-113 sets `setArchivedData([])` with a comment "stubbed until deleted_at column is added to Supabase". The `deleted_at` column is absent from `src/integrations/supabase/types.ts` (which mirrors the live schema). `src/hooks/useProspects.test.ts:154-156` has three `it.todo` placeholders for DATA-05/06/07.
- Files: `src/hooks/useProspects.ts` (110-113, 231-243, 273-285, 442-444), `src/hooks/useProspects.test.ts` (153-156), `src/integrations/supabase/types.ts`
- Impact: Accidental deletions are unrecoverable. Archive UI is a lie — items disappear permanently. This is the single biggest silent-data-loss risk in the app and directly contradicts the project's Core Value.
- Fix approach: Add `deleted_at timestamptz` column via Supabase dashboard; regenerate `types.ts`; replace `.delete()` with `.update({ deleted_at: new Date().toISOString() })`; wire `restore`/`permanentDelete`/`loadArchivedData` to real queries; flip `it.todo` stubs to real tests. Per STATE.md blocker: do NOT add `deleted_at IS NULL` to the UPDATE RLS `WITH CHECK` clause — it breaks the soft-delete write itself.

**TerritoryPlanner.tsx god component at 2401 lines:**
- Risk: The main app shell has grown 207 lines since the last audit (was 2194 on 2026-03-26). It holds 40+ `useState` declarations plus the full filter, sort, bulk actions, command palette, saved views, kanban, CSV/paste import, archive viewer, and territory management flows. Any change here carries high regression risk because the test file `src/components/TerritoryPlanner.test.tsx` only covers a handful of smoke paths.
- Files: `src/components/TerritoryPlanner.tsx` (2401 lines)
- Impact: Cognitive load is untenable; Claude Code edits at the top of the file can silently break behavior 1500 lines below. Blocks safe refactor of Phase 5+ roadmap items.
- Fix approach: Extract `ProspectTable`, `FilterBar`, `BulkActionsToolbar`, `CommandPalette`, `SavedViews`, and `KanbanBoard` into separate files under `src/components/planner/`. Do this before any new feature work on the main view.

---

## High

**`useTerritories` mutations have no rollback and no error handling:**
- Risk: `renameTerritory` (line 102), `removeMember` (line 155), `updateMemberRole` (line 161) all perform the Supabase call then update local state without checking `error`. `inviteMember` checks the error but the RPC helpers (`ensure_user_territory`, `find_user_id_by_email`) have no failure handling.
- Files: `src/hooks/useTerritories.ts` (102-106, 155-159, 161-165)
- Impact: If a role change or member removal fails server-side, the UI shows success. Editors/viewers can diverge from DB state silently — the exact pattern Phase 01 was meant to eliminate.
- Fix approach: Apply the snapshot-rollback pattern already in `useProspects.update` (lines 124-167) to all three functions.

**`useOpportunities.add()` refetches the entire territory on every insert:**
- Risk: After every opportunity insert, `add()` calls `await load()` which re-fetches all opportunities from Supabase (`src/hooks/useOpportunities.ts` line 91). With bulk opportunity creation from CSV or the pipeline kanban, this is N+1 round trips.
- Files: `src/hooks/useOpportunities.ts` (76-92)
- Impact: Slow UX on multi-add, unnecessary Supabase egress, flashes empty state if load is slow.
- Fix approach: Use `.insert(payload).select().single()` and append returned row to local state. Matches the pattern in `useProspects.add` (line 200).

**`loadData()` fetches all prospects + all sub-collections with `select("*")` including base64 logos:**
- Risk: `src/hooks/useProspects.ts:57-89` issues 5 parallel queries on mount, pulls every column of every prospect (including `custom_logo` base64 blobs that can be 50-200KB each), and every contact/interaction/note/task row for the territory. With 300+ accounts this is several MB on cold start.
- Files: `src/hooks/useProspects.ts` (53-108)
- Impact: Slow first paint on mobile, high memory footprint, scales poorly past ~500 accounts.
- Fix approach: (1) Store `custom_logo` in Supabase Storage and keep only a URL in the row, or exclude `custom_logo` from the initial select. (2) Lazy-load sub-collections when `ProspectSheet` opens, not on territory switch. (3) Adopt the already-installed TanStack Query for caching (currently `QueryClientProvider` is mounted but unused for data fetching — see STATE.md Phase 2 deferred blocker).

**No accessibility affordances on inline edit cells or table rows:**
- Risk: `TerritoryPlanner.tsx` inline-edit cells use click-to-enter / blur-to-save with no keyboard alternative, no `aria-label`, no focus ring, and no `role`/`aria-expanded` on the saved-views dropdowns. Zero `aria-label` or explicit `role=` attributes in the file.
- Files: `src/components/TerritoryPlanner.tsx` (inline edit pattern throughout)
- Impact: Keyboard-only users cannot edit cells. Screen readers announce untyped buttons. This is a single-user tool today but the Phase 5 work adds territory sharing; viewer/editor collaborators may rely on AT.
- Fix approach: Add `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Escape handlers to every inline-edit cell. Audit shadcn Dialog/Sheet usage for proper `aria-labelledby`.

**No rate limiting on AI Edge Functions:**
- Risk: `meeting-prep`, `draft-outreach`, `chat`, `research-account`, `enrich-prospect`, `enrich-prospect-add`, `ai-readiness`, `categorize-signal` all call the Lovable API on every client invocation with no client throttle and no server-side per-user cap.
- Files: all of `supabase/functions/*/index.ts`
- Impact: Cost exposure. Combined with the Critical concern about unverified JWTs, this is an open door.
- Fix approach: Add a simple `prospect_ai_log` table (user_id, function_name, created_at) and deny-list when the last-minute count exceeds a threshold. Check inside each Edge Function after JWT verification is enabled.

---

## Medium

**Stale DB schema in `src/integrations/supabase/types.ts` vs reality:**
- Risk: The auto-generated types are missing: `deleted_at` (never added), `linkedin_url` on contacts (referenced at `useProspects.ts:472`, present in DB but unclear if typed), and `incremental_acv` which IS in the types but may or may not match live schema. No CI step regenerates types.
- Files: `src/integrations/supabase/types.ts`
- Impact: `as any` casts proliferate because inserts fail type-check against stale types. Creates ambient bugs when refactoring.
- Fix approach: Regenerate types after the `deleted_at` migration. Consider a pre-push hook that warns if types are older than 30 days.

**`update()` / `bulkUpdate()` / `bulkMerge()` / `add()` / `bulkAdd()` / `seedData()` each re-implement camelCase-to-snake_case mapping:**
- Risk: Six copies of nearly-identical field-mapping code in `src/hooks/useProspects.ts` (lines 131-152, 248-256, 287-312, 179-197, 332-349, 408-426). Add a new field and you must touch all six. Several already drift — `activeAcv` is handled in `bulkMerge` but not `bulkUpdate`; `transitionOwner` appears in most but was missing from earlier audits.
- Files: `src/hooks/useProspects.ts`
- Impact: New fields silently fail to persist in some code paths. Common bug vector.
- Fix approach: Extract a single `prospectToDbFields(partial: Partial<Prospect>): Record<string, any>` helper in `src/hooks/useProspects.ts` and call from every mutation.

**`Prospect.id` still typed as `any`:**
- Files: `src/data/prospects.ts:124`
- Impact: Every call site of `update(id, …)`, `remove(id)`, `sheetProspectId` loses type safety. 37+ `as any` casts across 18 files compound the problem.
- Fix approach: Change to `string`. Audit seed-data callers (a few places set numeric ids pre-insert).

**Deprecated fields still fully wired:**
- `nextStep`, `nextStepDate` marked `@deprecated` at `src/data/prospects.ts:148-150` but `initProspect()` still reads them at line 262-264. `contactName`/`contactEmail` legacy single-contact fields are mapped in every insert/update path in `useProspects.ts` (lines 28-29, 142-143, 190-191, 303-304, 343-344, 420-421).
- Files: `src/data/prospects.ts`, `src/hooks/useProspects.ts`
- Impact: Dead DB columns continue to be written on every edit. `prospect_contacts` rows are the source of truth but the legacy columns are never cleared.
- Fix approach: One-time migration to copy any remaining `contact_name`/`contact_email` into `prospect_contacts`, then remove the field mappings and drop the columns.

**Scoring logic duplicated between `scoreProspect()` and `scoreBreakdown()`:**
- Files: `src/data/prospects.ts` (165-185 and 199-229)
- Impact: Any scoring change must be made in two places. Drift risk. Note: CLAUDE.md says "Status: Customer +15" is a scoring factor but that is present only in `scoreBreakdown` line 181 and `scoreProspect` line 225 — these match today but there's no test that locks the parity.
- Fix approach: Implement `scoreProspect` as `scoreBreakdown(p).reduce((a, b) => a + b.value, 0)`.

**`STORAGE_KEY = "tp-data-v6"` dead export:**
- Files: `src/data/prospects.ts:197`
- Impact: Pre-Supabase localStorage leftover. Nothing consumes it.
- Fix approach: Delete the line.

**`MyNumbersPage` stores quota + compensation data in localStorage:**
- Files: `src/pages/MyNumbersPage.tsx:235-383` (ENTRIES_KEY, SETTINGS_KEY, ADDONS_KEY all localStorage)
- Impact: Quota data is device-local. User loses all history when switching browsers. Contradicts the Core Value of "never silently lose data."
- Fix approach: Move to Supabase `user_quota_entries` / `user_quota_settings` tables keyed by `user_id`.

**Loose typing on Prospect domain fields:**
- `status`, `outreach`, `priority`, `tier`, `industry`, `competitor` are `string` at `src/data/prospects.ts:129-141` despite having `as const` constant arrays.
- Impact: No compile-time check when assigning these fields. Typos go unnoticed until the DB returns unexpected values.
- Fix approach: `type Priority = typeof PRIORITIES[number]` pattern; apply to all six.

**`PendingOutreachDialog` feature has test but `BulkOutreachQueue` (202 lines) has none:**
- Files: `src/components/BulkOutreachQueue.tsx`
- Impact: Phase 4 shipped the outreach queue with only partial coverage. The "savePendingBatch called in handleGenerate (not handleCopy)" STATE.md note is exactly the kind of ordering bug tests are meant to catch.
- Fix approach: Add an integration test that simulates generate → copy → confirm the batch is persisted before clipboard write.

**HMR overlay is disabled in Vite config:**
- Files: `vite.config.ts`
- Impact: Runtime errors during development do not surface an in-browser overlay; they only hit the console. Easy to miss.
- Fix approach: Re-enable overlay unless there's a documented Lovable reason.

---

## Low

**Unused `console.log` in `useOpportunities.add`:**
- `src/hooks/useOpportunities.ts:83` logs `"[useOpportunities] inserting:"` with full payload on every insert. Debug noise in production console.
- Fix: Remove or gate behind `import.meta.env.DEV`.

**`ProspectPage.tsx` (917 lines) duplicates most of `ProspectSheet.tsx` (1141 lines):**
- Two independent implementations of the prospect detail view. Changes to the sheet (contact picker, signals section, meeting prep) must be manually replicated on the full-page view.
- Files: `src/pages/ProspectPage.tsx`, `src/components/ProspectSheet.tsx`
- Fix approach: Extract `ProspectDetail` body into a shared component, keep sheet vs. page as thin wrappers.

**Client-side owner-only gate:**
- `OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"]` at `src/hooks/useProspects.ts:401` and in `TerritoryPlanner.tsx` gate `seedData()`/`reset()`. UI-only — the underlying Supabase operations are not server-restricted to these identities.
- Impact: Low because RLS likely restricts bulk delete by territory ownership, but it is auditable only from the Supabase dashboard. A malicious territory viewer with the email could still call seedData from DevTools.
- Fix approach: Move the check into an Edge Function or an RLS policy that references `auth.email()`.

**`chart.tsx` uses `dangerouslySetInnerHTML` without `SafeHTML`:**
- Files: `src/components/ui/chart.tsx:70`
- Status: Confirmed safe per `.planning/phases/01-data-integrity-security/01-RESEARCH.md:72` — the HTML is internally-generated CSS, no user input. Worth a linter rule or comment annotation so future reviewers don't re-flag it.

**No `react-error-boundary` at app root:**
- Files: `src/App.tsx`, `src/main.tsx`
- Impact: A render error in any page crashes the whole app to a blank screen.
- Fix approach: Wrap `<BrowserRouter>` in `<ErrorBoundary fallback={<ErrorScreen />}>`. `react-error-boundary` is called out in `.planning/research/STACK.md:264` but was not installed.

**`EnrichmentQueue.tsx` (925 lines) is the third-largest component:**
- Similar god-component smell as TerritoryPlanner, though less central. Good extraction candidate during the Firecrawl migration (Roadmap item 9).

**Brand mismatch in printable meeting-prep PDF:**
- `src/components/ProspectSheet.tsx:417` still prints "Prepared by Territory Plan Buddy" on the PDF footer even after the app was rebranded to Territory Planner per commit d01b34b. Cosmetic, user-visible.
- Fix: Parameterize the brand string or pull from `src/components/brand/` constants.

---

## Resolved Since 2026-03-26

For provenance — these were flagged in the previous audit and are now verified closed by reading the actual code:

- **`VITE_ANTHROPIC_API_KEY` in client bundle** — routed through `supabase.functions.invoke("meeting-prep" | "draft-outreach" | "chat")` in `ProspectSheet.tsx:320/358/432`. No `VITE_ANTHROPIC_API_KEY` references in `src/` except the guard test at `ProspectSheet.test.tsx:12`.
- **XSS via raw `dangerouslySetInnerHTML` on notes** — `SafeHTML` component at `src/components/SafeHTML.tsx` wraps DOMPurify with an allowlist; `ProspectSheet.tsx:662` renders notes through it. Only remaining raw use is `chart.tsx:70` (system-generated CSS, safe).
- **Silent data loss on failed Supabase writes (partial)** — `useProspects.update` (line 124-167), `useProspects.remove` (line 231-243), `useProspects.bulkUpdate` (line 245-271), `useProspects.bulkRemove` (line 273-285), `useOpportunities.remove` (line 105-114), and `useSignals.removeSignal` (line 89-98) now snapshot → mutate → rollback-on-error → `toast.error`. **Not yet covered:** `useTerritories` rename/member mutations, `useOpportunities.add`/`update`, `useProspects.addNote`/`addTask`/`addInteraction` (these only `toast.error` but some paths skip rollback since they append rather than mutate existing state).
- **`update()` delete-all+re-insert on sub-collections** — Replaced with direct `addContact`/`updateContact`/`removeContact`, `addInteraction`/`updateInteraction`/`removeInteraction`, `addNote`/`deleteNote`/`updateNote`, `addTask`/`updateTask`/`removeTask` (lines 458-624). `bulkMerge` still does delete-all+insert for `contacts` (line 358-377); acceptable because bulk flows are explicit replace.
- **Zero test coverage** — 7 test files now exist: `SafeHTML.test.tsx`, `ProspectSheet.test.tsx`, `TerritoryPlanner.test.tsx`, `PendingOutreachDialog.test.tsx`, `useProspects.test.ts`, `pendingBatch.test.ts`, `test/example.test.ts`. Coverage is still shallow (many `it.todo` for soft-delete) but the Vitest + jsdom + Testing Library stack is wired and green.

---

*Concerns audit: 2026-04-24*
