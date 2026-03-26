# Domain Pitfalls

**Domain:** React + Supabase app hardening (brownfield)
**Researched:** 2026-03-26
**Applies to:** Territory Plan Buddy hardening milestone

---

## Critical Pitfalls

Mistakes that cause silent data loss, broken deploys, or complete rewrites.

---

### Pitfall 1: Rolling Back Optimistic Updates During Concurrent Mutations

**What goes wrong:**
The current hooks update local `useState` immediately, then fire Supabase. The plan is to add rollback on failure. The critical mistake is storing the pre-mutation snapshot in a closure variable and then rolling back to it — but if a second mutation fires before the first resolves, the snapshot is stale. Rolling back mutation 1's failure will overwrite the successful result of mutation 2, creating data that neither the user nor the database intended.

**Why it happens:**
JavaScript closures capture the value of state at the time the mutation is called. If two mutations fire within milliseconds (double-click, rapid inline-edit), each captures a different "previous state." Rollback logic that does `setState(previousState)` from the first closure will clobber the second mutation's optimistic update.

**Consequences:**
- User sees their edit revert even though it succeeded
- Or user sees a successful toast but state rolls back silently
- Particularly risky on the `update()` hook where contacts/tasks/notes sub-collections are replaced wholesale

**Prevention:**
- Use a functional state updater for rollback: `setData(current => undoSpecificChange(current, failedMutation))` rather than `setData(snapshot)`
- Or adopt TanStack Query's `onMutate`/`onError` pattern which passes the snapshot through the callback chain, making concurrent rollbacks composable
- Never store `data` array reference as a rollback target — store only the diff

**Detection:**
- Rapid double-clicks on inline edits show unexpected value reversions
- Two simultaneous contact edits produce garbled state

**Phase:** Data Integrity phase (error recovery implementation)

---

### Pitfall 2: delete+reinsert Sub-Collections Creates Window for Data Loss

**What goes wrong:**
`useProspects.update()` still does delete-all + re-insert for interactions, notes, and tasks. If the delete succeeds but the re-insert fails (network drop, Supabase timeout), all records for that sub-collection are gone. The optimistic update hides this from the user until next reload.

**Why it happens:**
The delete and re-insert are two separate Supabase calls, not a transaction. There is no atomicity guarantee client-side.

**Consequences:**
- User loses all interaction history, all notes, or all tasks for a prospect permanently and silently
- Happens during normal saves — not just edge cases

**Prevention:**
- Migrate interactions, notes, and tasks to direct CRUD (individual insert/update/delete per row) — same approach already used for contacts
- Never delete then re-insert when you can upsert or update by ID
- If delete+reinsert is kept for any reason, wrap in a Postgres function/RPC call so the operation is atomic at the DB level

**Detection:**
- Test: open a prospect with 3 interactions, trigger a save that includes `interactions: [...]`, then simulate a network failure mid-save and reload — count the interactions

**Phase:** Data Integrity phase (direct CRUD migration)

---

### Pitfall 3: TanStack Query Migration That Duplicates State Instead of Replacing It

**What goes wrong:**
The most common migration mistake is adding TanStack Query alongside the existing `useState`/`useEffect` hooks rather than replacing them. The result is two sources of truth: `useQuery` cache and the hand-rolled `useState` array. Components that call the old hook see different data than components that call the new `useQuery`. Mutations update one but not the other.

**Why it happens:**
Teams migrate incrementally but forget to fully remove the old hook. Since `TanStack Query` is already installed but unused (confirmed by CONVENTIONS.md), there is a temptation to wire up one query at a time without a clear cutover strategy.

**Consequences:**
- ProspectSheet shows stale data after an add in TerritoryPlanner
- Bugs that only appear after navigating away and back
- `refetchOnWindowFocus: false` is already configured — any cache that should have been invalidated won't be, making stale data permanent

**Prevention:**
- Migrate one hook completely (all reads AND writes) before touching the next
- Remove the `useState` array from the hook the moment `useQuery` takes over — no parallel state
- Establish a single `queryKey` convention before starting: `["prospects", territoryId]`, `["contacts", prospectId]`
- On migration of `useProspects`, also migrate all mutation paths (`update`, `add`, `remove`, `bulkUpdate`) to `useMutation` in the same PR

**Detection:**
- After adding a prospect in one component, open another component that lists prospects — do they show the same count?

**Phase:** Performance & Quality phase (TanStack Query migration)

---

### Pitfall 4: Soft Delete Breaking Supabase RLS Policies

**What goes wrong:**
Adding a `deleted_at` column and filtering it out with `WHERE deleted_at IS NULL` works in direct queries but breaks RLS. Supabase RLS `WITH CHECK` clauses validate against the _new_ row state after an UPDATE. If the RLS policy requires `deleted_at IS NULL` to permit SELECT (to block soft-deleted records), then the UPDATE that sets `deleted_at = now()` internally does a SELECT on the row after mutation — which now fails the IS NULL check, causing a "new row violates row-level security policy" error even though the operation is logically valid.

**Why it happens:**
Supabase RLS UPDATE policies perform implicit SELECT on post-update state. Policies designed to hide soft-deleted rows inadvertently block the soft-delete write itself.

**Consequences:**
- Archive/soft-delete silently fails or returns cryptic RLS error
- Restore operation similarly blocked if the policy is symmetrical

**Prevention:**
- Keep soft-delete RLS policies on SELECT only, not on the UPDATE WITH CHECK
- Alternative: use a Postgres view that filters `deleted_at IS NULL` and apply RLS to the view, not the base table
- Test: create a policy, then call the soft-delete from the client (not service role) and verify no RLS error

**Detection:**
- Supabase returns `406` or RLS violation on `.update({ deleted_at: now })` calls
- Only appears when the user is authenticated (not in service-role testing)

**Phase:** Data Integrity phase (real archive implementation)

---

## Moderate Pitfalls

Mistakes that cause regressions, confusing bugs, or significant rework.

---

### Pitfall 5: God Component Split Creates Prop Drilling Hell

**What goes wrong:**
`TerritoryPlanner.tsx` has 40+ `useState` declarations. The naive extraction approach is to cut out a sub-component (e.g., `FilterBar`) and pass each state variable and setter it needs as props. With 40+ state variables, some sub-components end up needing 10-15 props, and intermediate components become pass-through pipes. The component tree becomes harder to follow than the original god component.

**Why it happens:**
State extraction requires first deciding _where_ state lives, then moving it. When state is not yet categorized (UI state vs. domain state vs. filter state), developers default to "keep it in TerritoryPlanner and drill it down."

**Consequences:**
- Sub-components are not reusable (they need the parent's full state)
- Adding a new filter requires modifying TerritoryPlanner and every intermediate component
- Prop interfaces balloon: `FilterBarProps` has 20 fields

**Prevention:**
- Before writing any code, audit the 40+ state variables and categorize them:
  - **URL/filter state**: `selectedIndustry`, `searchQuery`, `sortField` → lift to URL params or a single `useFilterState` hook
  - **UI interaction state**: `editingCell`, `hoveredRow` → keep local in the sub-component that uses it
  - **Domain data**: already in hooks, don't duplicate
- Only extract a sub-component when its state boundaries are clear
- If 5+ props need to be drilled, use a Context scoped to TerritoryPlanner — not global React context

**Detection:**
- A sub-component's props interface has more than 6-8 entries that are all state variables from the parent
- The sub-component renders fine but never manages any of its own state

**Phase:** UX Polish phase (TerritoryPlanner decomposition)

---

### Pitfall 6: Tests Written for Implementation Details, Not Behavior

**What goes wrong:**
The first instinct when retrofitting tests is to verify internal state: "after calling update(), does `data[0].name` equal the new value?" These tests break the moment implementation changes (e.g., during TanStack Query migration) even though the user-visible behavior is unchanged. The tests become a drag on refactoring rather than a safety net.

**Why it happens:**
Zero test coverage means developers write tests while simultaneously understanding the code for the first time. The temptation is to assert what's easiest to see: local state, specific DOM class names, internal hook variables.

**Consequences:**
- TanStack Query migration breaks 30 tests immediately, even though the app works perfectly
- Tests require constant maintenance during refactoring
- Team loses confidence in the test suite

**Prevention:**
- For `scoreProspect()` and `scoreBreakdown()`: test input/output only — "given this prospect shape, expect this score/grade." Never assert on the internal logic branches.
- For hooks: test observable effects — "after calling `add()`, does the returned `data` array include the new item?" Do not assert on `useState` internals.
- For UI components: test user interactions — "when user clicks Log Activity, does the interaction appear in the list?" Not "does this div have class `glass-card`?"
- Use MSW or `vi.mock` to stub Supabase — never test against the real Supabase instance in unit tests

**Detection:**
- A test that imports and inspects an internal function or reads `result.current._internalState`
- Tests that assert on Tailwind class names

**Phase:** Performance & Quality phase (test coverage)

---

### Pitfall 7: Migrating `any` Types Causes TypeScript Errors in Unrelated Files

**What goes wrong:**
`Prospect.id` is typed `any` and used in every hook, component, and data function. Changing it to `string` with `strictNullChecks: false` still active will cause a cascade of type errors across 14+ files (37 `as any` casts exist). If this is done mid-refactor, the TypeScript compiler reports hundreds of errors, making it impossible to tell real type bugs from migration noise.

**Why it happens:**
`Prospect.id` is a foundational type. Any change to it propagates to every function that accepts or returns a prospect. With `strict: false`, null-related errors are silently suppressed but structural errors surface immediately.

**Consequences:**
- Entire codebase temporarily fails to build
- Engineers give up and revert, or add more `as any` casts to silence errors
- Real type safety problems are hidden in the noise

**Prevention:**
- Fix `Prospect.id: any` → `string` as a standalone PR, nothing else in that PR
- After the PR ships, fix each of the 37 `as any` casts incrementally — one file at a time, in subsequent PRs
- Do not enable `strict: true` or `strictNullChecks: true` until the `as any` audit is complete
- Use ESLint `@typescript-eslint/no-explicit-any` in warn mode (not error) during the migration period

**Detection:**
- `tsc --noEmit` error count jumps from ~0 to 50+ after a single type change

**Phase:** Performance & Quality phase (TypeScript tightening, if in scope)

---

### Pitfall 8: ProspectPage / ProspectSheet Extraction Creates Divergence Risk

**What goes wrong:**
`ProspectPage.tsx` (923 lines) and `ProspectSheet.tsx` (989 lines) are near-duplicates that have already drifted apart. If a shared `ProspectDetail` component is extracted but one file is not fully migrated, bugs fixed in the shared component don't apply to the unmigrated file. The extraction looks complete but one code path is still running the old logic.

**Why it happens:**
Extracting a shared component from two diverged implementations requires reconciling differences first. If the differences are glossed over ("they're basically the same"), the shared component ends up with logic from one file and the other file has subtle behavioral differences that are never surfaced.

**Consequences:**
- User saves a contact in ProspectSheet, it works. Same save in ProspectPage fails silently.
- Bug fixes to contact editing in the sheet don't apply to the page view

**Prevention:**
- Before extracting: diff the two files and document every behavioral difference explicitly
- Write tests for the behaviors that differ before unifying them
- After extraction: delete one of the original files completely — do not leave stubs that call the new component with partial props

**Detection:**
- The two files still exist with >50 lines of unique logic each after "extraction"
- The new shared component has optional props that are only used by one of the two consumers

**Phase:** UX Polish phase (ProspectSheet tabbed layout / ProspectPage unification)

---

### Pitfall 9: Sub-Collection Lazy Loading Creates Flickering in ProspectSheet

**What goes wrong:**
The plan to lazy-load contacts, interactions, notes, and tasks (only when a prospect is opened) is the right performance call. The pitfall is showing the ProspectSheet with empty sections while data loads, causing tabs to pop in and counts to jump. Users interpret empty sections as missing data, not loading state.

**Why it happens:**
Lazy loading means there is an inherent gap between "sheet opens" and "sub-collections arrive." Without explicit loading states for each section, the UI shows empty arrays.

**Consequences:**
- User opens ProspectSheet, sees "No contacts" momentarily, panics
- Task count badge in the tab shows "0" for a second before loading

**Prevention:**
- Add skeleton loaders to each sub-section tab content (contacts list, interaction list, tasks list)
- Show a loading state in tab badges: `•••` instead of `0` while loading
- Prefetch sub-collections on hover over a prospect row (300ms delay), so most opens are instant

**Detection:**
- Open ProspectSheet on a slow 3G throttle (Chrome DevTools) — do sections flash empty?

**Phase:** Performance & Quality phase (lazy loading sub-collections)

---

## Minor Pitfalls

Mistakes that are annoying but recoverable.

---

### Pitfall 10: Mocking Supabase Wrong in Tests Masks Real Query Bugs

**What goes wrong:**
The Supabase JS client uses a builder pattern (`supabase.from("prospects").select("*").eq("user_id", id)`). Simple `vi.mock` of the module returns a flat mock object that doesn't chain. Tests pass because the mock returns data regardless of what the query looks like. When the actual query has a bug (wrong column name, missing filter), the test doesn't catch it.

**Prevention:**
- Use MSW to intercept Supabase REST API calls at the HTTP level — this catches malformed queries that a module mock would not
- Alternatively, build a chainable Supabase mock helper that validates the call chain, not just the final result
- At minimum, assert that the correct query parameters were passed, not just that data was returned

**Phase:** Performance & Quality phase (test coverage)

---

### Pitfall 11: `bulkMerge` Sequential Awaits Not Addressed During Migration

**What goes wrong:**
`bulkMerge()` uses `for...of + await`, making 1-5 Supabase calls per prospect sequentially. If TanStack Query migration wraps this in a `useMutation` but does not fix the sequential pattern internally, the mutation just becomes a slower version of the same problem with a loading state.

**Prevention:**
- Fix the sequential pattern inside `bulkMerge` before or alongside the TanStack Query migration, not as an afterthought
- Use `Promise.all()` for independent prospect updates
- Rate-limit to batches of 10 to avoid hitting Supabase connection limits

**Phase:** Performance & Quality phase (TanStack Query migration)

---

### Pitfall 12: XSS Fix with DOMPurify Applied Inconsistently

**What goes wrong:**
DOMPurify is added to `ProspectSheet.tsx` for the notes `dangerouslySetInnerHTML` call but not to `ProspectPage.tsx`, which has the same pattern. The fix addresses one code path and the vulnerability remains in the other.

**Prevention:**
- Search for ALL `dangerouslySetInnerHTML` usages before writing the fix (there are at least 2: ProspectSheet line 722, ProspectPage)
- Create a `SafeHTML` wrapper component that always sanitizes, and replace all `dangerouslySetInnerHTML` usages with it — one fix, all call sites covered

**Phase:** Data Integrity phase (XSS sanitization)

---

### Pitfall 13: Edge Function for API Key Has CORS/Cold Start Problems

**What goes wrong:**
Moving the Anthropic API call from direct client-side (current) to a Supabase Edge Function is the right call. The pitfall is deploying the Edge Function and then experiencing cold start latency (500ms-2s) on the first call after inactivity. Combined with an LLM call, this means the user sees 3-5 seconds before any response starts.

**Prevention:**
- Stream the response from the Edge Function — start showing tokens as they arrive rather than waiting for the full response
- The current ProspectSheet already uses streaming (`anthropic-dangerous-direct-browser-access`), so the streaming pattern should be preserved through the Edge Function
- Supabase Edge Functions support streaming responses — use `ReadableStream` in the response body

**Phase:** In-App AI Capabilities phase (Edge Function migration)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Error recovery / optimistic rollback | Concurrent mutation snapshot problem (Pitfall 1) | Use functional state updaters, or migrate to TanStack Query mutations first |
| Direct CRUD for sub-collections | delete+reinsert window for data loss (Pitfall 2) | Migrate one sub-collection at a time, test each with network failure simulation |
| Real archive / soft delete | RLS WITH CHECK blocking the soft-delete UPDATE (Pitfall 4) | Test soft-delete with authenticated client, not service role, in staging |
| TerritoryPlanner extraction | Prop drilling explosion (Pitfall 5) | Audit + categorize all 40+ state variables before extracting any component |
| TanStack Query migration | Parallel state (old useState + new useQuery) (Pitfall 3) | Full cutover per hook, remove useState on same PR |
| Test coverage | Tests assert implementation details (Pitfall 6) | Enforce behavior-only testing policy from first test written |
| ProspectSheet tabbed layout | ProspectPage divergence (Pitfall 8) | Diff the two files and document differences before any extraction |
| Sub-collection lazy loading | Empty-section flicker (Pitfall 9) | Add skeleton states before shipping lazy loading |
| XSS fix with DOMPurify | Inconsistent application across files (Pitfall 12) | Create SafeHTML wrapper component, single fix site |
| AI Edge Function | Cold start + streaming not preserved (Pitfall 13) | Use streaming response from Edge Function from day one |

---

## Sources

- [TanStack Query Optimistic Updates — concurrent rollback discussion](https://github.com/TanStack/query/discussions/2734)
- [Concurrent Optimistic Updates in React Query — tkdodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [Supabase Soft Deletes with RLS — official troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/soft-deletes-with-supabase-js)
- [Supabase RLS WITH CHECK and soft delete bug report](https://github.com/supabase/supabase-js/issues/1941)
- [Testing Supabase with React Testing Library and MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw)
- [Enabling TypeScript Strict Mode in Legacy React — gradual approach](https://webdev-sb.blogspot.com/2025/03/enabling-typescript-strict-mode-in.html)
- [React Testing Library + Vitest common mistakes](https://medium.com/@samueldeveloper/react-testing-library-vitest-the-mistakes-that-haunt-developers-and-how-to-fight-them-like-ca0a0cda2ef8)
- [Migrating to TanStack Query v5 — breaking changes](https://www.bigbinary.com/blog/migrating-to-tanstack-query-v5)
- [Shared State Complexity in React — prop drilling vs context tradeoffs](https://www.freecodecamp.org/news/shared-state-complexity-in-react-handbook/)
- [Common Sense Refactoring of a Messy React Component — alexkondov](https://alexkondov.com/refactoring-a-messy-react-component/)
