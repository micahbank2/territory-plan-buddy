# Codebase Concerns

**Analysis Date:** 2026-03-26

## Critical Issues

**API Key Exposed in Client-Side Code:**
- Risk: The Anthropic API key is read from `import.meta.env.VITE_ANTHROPIC_API_KEY` and sent directly from the browser in `src/components/ProspectSheet.tsx` (line 344). The `VITE_` prefix means Vite bundles it into the client JS. Anyone inspecting network requests can extract the key.
- Files: `src/components/ProspectSheet.tsx` (lines 344-412)
- Current mitigation: The `anthropic-dangerous-direct-browser-access` header is set, which Anthropic explicitly warns against for production use.
- Fix approach: Route AI calls through a Supabase Edge Function (like `draft-outreach` already does) instead of calling the Anthropic API directly from the browser.

**XSS via dangerouslySetInnerHTML on User-Generated Notes:**
- Risk: Rich text notes created via the TipTap editor are stored as raw HTML and rendered with `dangerouslySetInnerHTML` in `src/components/ProspectSheet.tsx` (line 722). If notes are shared via territories, a malicious collaborator could inject scripts.
- Files: `src/components/ProspectSheet.tsx` (line 722), `src/components/RichTextEditor.tsx`
- Current mitigation: None. TipTap provides some sanitization at edit time, but stored HTML is rendered without sanitization.
- Fix approach: Add DOMPurify or similar sanitization before rendering stored HTML. Install `dompurify` and wrap all `dangerouslySetInnerHTML` usage.

**No Error Recovery on Failed Supabase Writes:**
- Risk: All hooks use optimistic updates (update local state immediately, then fire Supabase mutation). If the Supabase call fails, local state is stale. The user sees success but data is lost on reload.
- Files: `src/hooks/useProspects.ts` (lines 200-203, 263, 280-283), `src/hooks/useTerritories.ts` (lines 110-111, 163), `src/hooks/useSignals.ts` (lines 88, 95)
- Impact: Silent data loss. User edits a prospect, sees the change, closes the app, and the edit is gone.
- Fix approach: Check error return from Supabase mutations and roll back local state on failure. Show toast error to user.

## Technical Debt

| Area | Issue | Severity | Effort |
|------|-------|----------|--------|
| `TerritoryPlanner.tsx` | God component at 2194 lines with 40+ state variables, all filtering, views, dialogs, and inline editing | High | Large |
| `ProspectPage.tsx` | 923-line near-duplicate of ProspectSheet logic; two independent implementations of prospect detail view | Medium | Medium |
| `useProspects.ts` delete+re-insert | `update()` still does delete-all + re-insert for interactions, notes, and tasks (lines 154-197). Only contacts were migrated to direct CRUD. | Medium | Medium |
| `as any` casts | 37 occurrences of `as any` across 14 files, bypassing TypeScript safety | Medium | Medium |
| `Prospect.id` typed as `any` | The `id` field in `src/data/prospects.ts` (line 120) is typed `any` instead of `string`. Propagates weak typing throughout the codebase. | Medium | Small |
| Duplicate field mapping | `update()`, `bulkUpdate()`, `bulkMerge()`, `add()`, `bulkAdd()`, `seedData()` each have their own camelCase-to-snake_case field mapping. Six copies of the same mapping logic in `src/hooks/useProspects.ts`. | Medium | Small |
| Archive stubs | `restore` and `permanentDelete` in `src/hooks/useProspects.ts` (lines 487-488) are no-op functions. Archive UI exists but does nothing useful. | Low | Small |
| Deprecated fields | `nextStep`, `nextStepDate`, `contactName`, `contactEmail` still exist on the `Prospect` interface and in DB mapping code in `src/data/prospects.ts` and `src/hooks/useProspects.ts`. | Low | Small |
| Scoring logic duplicated | `scoreProspect()` and `scoreBreakdown()` in `src/data/prospects.ts` (lines 160-198) duplicate the same conditional logic. One should derive from the other. | Low | Small |
| `STORAGE_KEY` unused | `src/data/prospects.ts` (line 190) exports `STORAGE_KEY = "tp-data-v6"` which is a leftover from pre-Supabase localStorage era. | Low | Trivial |

## Performance Concerns

**Loading All Prospects + All Sub-Collections in One Shot:**
- Problem: `useProspects.loadData()` in `src/hooks/useProspects.ts` (lines 53-107) fetches ALL prospects, then ALL contacts, interactions, notes, and tasks for those prospects in parallel. With 300+ accounts, this is 5 concurrent queries returning potentially thousands of rows.
- Impact: Slow initial load, especially on mobile. All data is held in memory.
- Fix approach: Lazy-load sub-collections (contacts, interactions, notes, tasks) only when a prospect is opened in ProspectSheet, not on initial load.

**Base64 Logos Stored in Database:**
- Problem: Custom logos are stored as base64 strings in the `custom_logo` column of the prospects table and included in every `select("*")` query.
- Files: `src/hooks/useProspects.ts` (line 58 uses `select("*")`)
- Impact: Each base64 logo can be 50-200KB. With multiple custom logos, the initial load payload grows significantly.
- Fix approach: Store logos in Supabase Storage and reference by URL, or exclude `custom_logo` from the initial query and load on demand.

**No Pagination on Supabase Queries:**
- Problem: All hooks fetch the complete dataset. `useProspects` loads all prospects, `useSignals` loads all signals, `useOpportunities` loads all opportunities.
- Files: `src/hooks/useProspects.ts`, `src/hooks/useSignals.ts`, `src/hooks/useOpportunities.ts`
- Impact: Acceptable at 300 accounts but will degrade as data grows. Client-side pagination exists (PAGE_SIZE = 25 in TerritoryPlanner) but the full dataset is still fetched.

**`bulkMerge` Uses Sequential Awaits:**
- Problem: `bulkMerge()` in `src/hooks/useProspects.ts` (lines 331-435) iterates updates sequentially with `for...of` + `await`. Each prospect update is 1-5 Supabase calls.
- Impact: Bulk operations on 50+ prospects are very slow.
- Fix approach: Use `Promise.all()` for independent updates, or batch into single Supabase RPC calls.

## Scalability Limits

**All Data in React State:**
- Current: All prospects, contacts, interactions, notes, tasks, signals, and opportunities are loaded into `useState` arrays.
- Limit: Works for ~300-500 accounts. At 1000+ accounts with sub-collections, expect multi-second load times and high memory usage.
- Scaling path: Adopt TanStack Query (already installed but unused) for caching, pagination, and background refetch. Load sub-collections lazily.

**Territory Sharing Has No Access Control on Supabase Queries:**
- Current: The `useProspects` hook queries by `territory_id` but does not include `user_id` filtering. Authorization depends entirely on Supabase RLS policies (not visible in client code).
- Limit: If RLS policies are misconfigured, any authenticated user could query any territory's data.
- Files: `src/hooks/useProspects.ts` (lines 56-64)

## Code Smells

**TerritoryPlanner.tsx is a God Component (2194 lines):**
- Files: `src/components/TerritoryPlanner.tsx`
- Contains: 40+ useState declarations (lines 399-477), all filtering/sorting logic, inline editing, command palette, saved views, bulk operations, kanban view, CSV/paste import dialogs, archive viewer, territory management, and the full table rendering.
- Fix approach: Extract into focused sub-components: `ProspectTable`, `FilterBar`, `BulkActions`, `CommandPalette`, `SavedViews`, `KanbanBoard`. Each gets its own file under `src/components/`.

**ProspectPage.tsx Duplicates ProspectSheet Logic (923 lines):**
- Files: `src/pages/ProspectPage.tsx`, `src/components/ProspectSheet.tsx` (989 lines)
- Both implement the full prospect detail view independently. Changes to one must be manually replicated in the other.
- Fix approach: Extract shared prospect detail logic into a `ProspectDetail` component used by both.

**No Input Validation Before Database Writes:**
- Problem: `update()`, `add()`, `bulkAdd()` pass user input directly to Supabase without validation. No length limits, no format checking, no sanitization.
- Files: `src/hooks/useProspects.ts`, `src/hooks/useOpportunities.ts`
- Impact: Malformed data, excessively long strings, or unexpected values can be written to the database.

**Loose Typing on Prospect Fields:**
- `status`, `outreach`, `priority`, `tier`, `industry`, `competitor` are all typed as `string` in `src/data/prospects.ts` (lines 125-138) despite having defined constant arrays. Should be union types derived from the constants.
- Impact: No compile-time safety when setting these fields. Easy to pass invalid values.

## Security Considerations

**Client-Side Owner Check is Easily Bypassed:**
- Risk: Owner-only features (seed data, reset) are gated by `OWNER_EMAILS` array in `src/hooks/useProspects.ts` (line 445) and `src/components/TerritoryPlanner.tsx` (line 382). This is a UI-only check. The underlying Supabase operations (delete all, bulk insert) are not restricted server-side to those emails.
- Files: `src/hooks/useProspects.ts` (line 445-449), `src/components/TerritoryPlanner.tsx` (line 382)
- Fix approach: Implement server-side checks via Supabase RLS or Edge Functions for destructive operations.

**Territory Member Removal Has No Authorization Check:**
- Risk: `removeMember()` in `src/hooks/useTerritories.ts` (line 155) deletes by member ID without checking if the current user is the territory owner.
- Files: `src/hooks/useTerritories.ts` (lines 155-159)
- Current mitigation: Depends on Supabase RLS (not auditable from client code).

**No Rate Limiting on AI Features:**
- Risk: The meeting prep feature (`src/components/ProspectSheet.tsx` lines 339-432) calls the Anthropic API directly. No client-side throttle or server-side rate limit exists.
- Impact: A user (or automated script) could run up significant API costs.

## Deprecated Patterns

**Legacy Contact Fields Still in Use:**
- `contactName` and `contactEmail` on the Prospect interface are legacy single-contact fields that predate the `prospect_contacts` table.
- Files: `src/data/prospects.ts` (lines 131-132), `src/hooks/useProspects.ts` (lines 28-29, 133-134)
- Still mapped in all insert/update operations. Should be removed after verifying no data depends on them.

**`nextStep` and `nextStepDate` Deprecated:**
- Marked with `@deprecated` JSDoc in `src/data/prospects.ts` (lines 143-146).
- Tasks array replaced this pattern. The `initProspect()` function handles migration from old format.
- These fields should be removed from the interface once all legacy data is migrated.

**localStorage Remnants:**
- `STORAGE_KEY = "tp-data-v6"` in `src/data/prospects.ts` (line 190) is from the pre-Supabase era when all data lived in localStorage.
- `my_numbers` in `src/pages/MyNumbersPage.tsx` (line 42) stores quota data in localStorage instead of Supabase. Data is lost on device change.
- `opp_quota` in `src/pages/OpportunitiesPage.tsx` (line 123) also uses localStorage for quota target.

## Test Coverage Gaps

**No Tests Exist:**
- What's not tested: The entire codebase has zero test files. No unit tests, no integration tests, no E2E tests.
- Files: No `*.test.*` or `*.spec.*` files found anywhere in the project.
- Risk: Every change is deployed blind. Refactoring the god components (TerritoryPlanner, ProspectSheet) is high-risk without test coverage.
- Priority: High. At minimum, add tests for `scoreProspect()`, `scoreBreakdown()`, and the `useProspects` hook CRUD operations.

---

*Concerns audit: 2026-03-26*
