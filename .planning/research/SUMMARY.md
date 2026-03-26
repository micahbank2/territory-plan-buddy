# Project Research Summary

**Project:** Territory Plan Buddy — Hardening & Quality Pass
**Domain:** Brownfield React + Supabase SPA — data integrity, security, and UX polish
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

Territory Plan Buddy is a mature personal sales productivity tool that has outgrown its initial implementation quality. The app has working features but carries three classes of serious technical debt: silent data loss on write failures (no rollback), security vulnerabilities from unsanitized HTML rendering and a client-exposed API key, and a god-component architecture that makes every change high-risk. The hardening milestone is not about adding net-new features — it is about making what exists reliable enough to build on.

The recommended approach is a sequenced four-phase plan: fix data integrity first (direct CRUD for sub-collections, optimistic rollback, soft delete, XSS sanitization, API key security), then migrate the data layer to TanStack Query for structural correctness, then decompose the god components into maintainable units, and finally land AI capabilities in the clean tab structure that decomposition creates. Each phase is independently shippable and the order is dependency-driven, not arbitrary.

The key risk is attempting too many migrations at once. The codebase has zero test coverage, two near-duplicate 900+ line components, and TanStack Query already installed but unused. The path to failure is a big-bang refactor that breaks everything simultaneously. The path to success is incremental: complete one hook, verify it, move to the next. Every phase in this plan has been designed to deliver user-visible value on its own.

---

## Key Findings

### Recommended Stack

The base stack (React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase JS v2, TanStack Query v5) is correct and should not change. The hardening pass adds four targeted packages and two configuration changes on top of the existing foundation.

The most important non-obvious insight from stack research: TanStack Query v5 is already installed and `QueryClientProvider` is already configured in `App.tsx` with `refetchOnWindowFocus: false`. The migration from custom `useState` hooks to `useQuery`/`useMutation` is a hook-level change, not an app-level one, and the public API surface of each hook can remain unchanged throughout the migration so callers never need updating.

**Core additions:**

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `react-error-boundary` | ^6.1.1 | Render error isolation | Functional API, `useErrorBoundary()` hook for async errors |
| `dompurify` + `@types/dompurify` | ^3.3.3 | XSS sanitization | DOM-only, whitelist-based, de-facto standard |
| `msw` | ^2.12.14 | Network-level API mocking for tests | Intercepts at HTTP layer, catches real query bugs |
| `rollup-plugin-visualizer` | ^7.0.1 | Bundle size audit | One-time analysis, identifies large chunk offenders |

**Configuration changes (no new packages):**
- Enable TypeScript `strictNullChecks` then `noImplicitAny` then `strict: true` incrementally — currently disabled, 37 `as any` casts exist
- Route remaining direct Anthropic calls through the existing `draft-outreach` Edge Function — `VITE_ANTHROPIC_API_KEY` is currently exposed in the client bundle

**What NOT to add:** Playwright/Cypress (overkill for single-user tool), Storybook (no design system use case), Sentry (personal tool), Redux Toolkit Query (TanStack Query already installed), Immer (unnecessary for this data scale).

---

### Expected Features

The research distinguishes features by urgency: some are table stakes for a reliable tool (currently broken), some are differentiators for daily workflow value, and some are anti-features that should not be built in this pass.

**Must have — table stakes (currently broken or missing):**

| Feature | Current State | Why Urgent |
|---------|--------------|-----------|
| Optimistic update rollback on write failure | Silently loses edits on Supabase error | #1 trust destroyer |
| Error toast on failed write | Fails silently | User cannot retry what they don't know failed |
| Real soft delete with restore | Archive stubs do nothing — hard-deletes | Broken UI promise |
| DOMPurify on rich text | `dangerouslySetInnerHTML` unsanitized | XSS in shared territories |
| AI key through Edge Function | `VITE_ANTHROPIC_API_KEY` in client bundle | Live security issue |
| Tabbed layout in ProspectSheet | 989-line vertical scroll | Every major CRM uses tabs; shadcn Tabs already present |
| Direct CRUD for interactions/notes/tasks | Delete+re-insert with no atomicity | Data loss window on every save |

**Should have — differentiators:**

| Feature | Value | Complexity |
|---------|-------|-----------|
| Log Activity widget (interaction + follow-up in one submit) | Workflow accelerator for daily use | Medium |
| AI outreach drafting UI | Edge Function exists; UI is the only gap | Medium |
| Score → Recommended Action block | Pure frontend, no new data needed | Medium |
| Lazy-load sub-collections | Cuts initial load time 60-80% on mobile | Medium |
| ProspectSheet/ProspectPage deduplication | Two 900-line near-duplicates, bugs fixed once | Medium |
| Mobile card view at small breakpoints | Data table with 10+ columns unusable on mobile | Medium |

**Defer to later (anti-features for this pass):**

| Anti-Feature | Reason to Defer |
|-------------|----------------|
| Full TanStack Query mutation migration all at once | Large blast radius, zero test coverage, do incrementally |
| TerritoryPlanner decomposition (all at once) | Must audit 40+ state variables first, requires tests |
| Offline support / service workers | Single user, reliable connection, months of added complexity |
| Real-time multi-user Supabase Realtime | Sharing use case is view-only, not concurrent editing |
| AI chat / conversational UI | Wrong paradigm; targeted contextual buttons work better |
| Server-side pagination | 300-500 accounts fits in memory; breaks existing filter/sort |

**Feature dependency order (hard constraints):**
- API key must move to Edge Function before any new AI UI
- Tabbed ProspectSheet must land before ProspectPage deduplication
- ProspectPage deduplication must land before AI tabs (add once, render both places)
- Direct CRUD for sub-collections should precede TanStack Query migration (migrate correct code)
- Test coverage is a prerequisite for TerritoryPlanner decomposition

---

### Architecture Approach

The target architecture applies three independent layers of change in dependency order. The data layer (TanStack Query migration) fixes data reliability. The shell layer (TerritoryPlanner decomposition) reduces blast radius of changes. The safety layer (error boundaries) isolates failures. All three can ship incrementally; the safety layer is purely additive and can land any time.

**Current state:**
- `TerritoryPlanner.tsx` — 2194 lines, 40+ `useState` declarations, all rendering and state in one file
- `ProspectSheet.tsx` / `ProspectPage.tsx` — 989 and 923 lines respectively, near-duplicates with drifted behavior
- `useProspects` — `useState`/`useEffect` with no rollback, sub-collections via delete+re-insert
- No error boundaries, no test coverage

**Target component tree after decomposition:**

```
TerritoryPlanner (~300 lines — orchestrator only)
├── TerritoryHeader
├── ProspectFilterBar         (owns: q, fIndustry, fStatus, fCompetitor, fTier, fLocRange, fOutreach, fPriority)
├── ProspectTableControls     (owns: page, viewMode)
├── ProspectTable             (owns: editingCell, inline editing callbacks)
├── BulkActionBar             (owns: selected, bulk action state)
└── TerritoryDialogGroup      (owns: all dialog open booleans)

ProspectSheet → ProspectDetail (shared with ProspectPage)
├── ProspectSheetHeader
└── Tabs: Overview | Activity | Contacts | AI
    ├── OverviewTab
    ├── ActivityTab           (includes Log Activity widget)
    ├── ContactsTab
    └── AITab                 (outreach drafting, research tool, competitive intel)
```

**Data flow after TanStack Query migration:**
```
useProspects
  ├── useQuery(['prospects', territoryId]) — cache + background refetch
  └── useMutation (per write op)
        ├── onMutate: snapshot + optimistic update
        ├── onError: restore snapshot + toast.error()
        └── onSettled: invalidateQueries (server truth always wins)
```

**Error boundary placement (three levels):**
1. App-level boundary in `App.tsx` — catch catastrophic render failures
2. Route-level boundary wrapping `<TerritoryPlanner />` in `Index.tsx` — isolates dashboard failures
3. Sheet-level boundary inside `ProspectSheet` — one bad prospect's data can't crash the table

**Critical patterns to follow:**
- Keep hook API surfaces stable during migration (`update(id, partial)` stays identical externally)
- Always chain `.throwOnError()` on Supabase queries inside `mutationFn` — without it, `onError` never fires
- Define sub-components at module scope, never inside a component function body (causes remount on every render)
- Full cutover per hook (remove `useState` in the same PR that adds `useQuery`) — no parallel state

---

### Critical Pitfalls

**Top 5 pitfalls with prevention strategies:**

1. **Concurrent mutation rollback clobbers successful writes** — If two inline edits fire within milliseconds, rolling back failure-1 with a closure snapshot will overwrite success-2's optimistic update. Prevention: Use TanStack Query's `onMutate`/`onError` chain (snapshot passed through callback, not captured in closure) rather than hand-rolled `setState(snapshot)` rollback.

2. **Delete+re-insert sub-collections creates an unrecoverable data loss window** — If the delete succeeds but the re-insert fails (network drop mid-operation), all interactions, notes, or tasks for that prospect are permanently gone. Optimistic update hides this until reload. Prevention: Migrate to direct CRUD (update by ID, insert new, delete removed) as the first action in Phase 1 — contacts are already correct, apply the same pattern to interactions, notes, tasks.

3. **Soft delete RLS WITH CHECK blocks the archive write itself** — Adding `deleted_at IS NULL` to RLS policy will cause the UPDATE that sets `deleted_at = now()` to fail with an RLS violation, because Supabase's WITH CHECK validates post-update row state. Prevention: Apply the `deleted_at IS NULL` filter only to SELECT policies, not UPDATE WITH CHECK. Test soft-delete with an authenticated client (not service role) before shipping.

4. **TanStack Query migration leaves parallel state (old `useState` + new `useQuery` coexist)** — The temptation to add `useQuery` incrementally without removing `useState` creates two sources of truth. Components on the old hook see different data than components on the new cache. With `refetchOnWindowFocus: false` already configured, stale data becomes permanent. Prevention: Migrate one hook completely (reads AND all writes) in one PR, remove `useState` in the same commit.

5. **TerritoryPlanner decomposition causes prop drilling explosion** — Extracting sub-components without first categorizing which state belongs where results in 20-field prop interfaces. Prevention: Before writing any code, audit all 40+ state variables and classify them as filter state (lift to custom hook or URL params), UI interaction state (keep local in extracted component), or domain data (already in hooks). Only extract when state boundaries are clear.

---

## Implications for Roadmap

Based on combined research, the dependency graph forces a specific phase order. Each phase delivers standalone value and unblocks the next.

### Phase 1: Data Integrity & Security

**Rationale:** These are the highest-severity issues. Silent data loss and a live API key exposure are not polish — they are correctness failures. This phase does not require architecture changes; all fixes are hook-level and additive.

**Delivers:** A reliable app that doesn't silently lose data and doesn't expose secrets.

**Addresses (from FEATURES.md):**
- Optimistic update rollback + error toast
- Direct CRUD for interactions, notes, tasks (replaces delete+re-insert)
- Real soft delete with restore (`deleted_at` schema change)
- DOMPurify XSS fix via `SafeHTML` wrapper component
- API key moved to Edge Function

**Avoids (from PITFALLS.md):**
- Pitfall 2 (delete+re-insert data loss window)
- Pitfall 4 (RLS breaking soft delete — test with authenticated client)
- Pitfall 12 (DOMPurify applied to only one file — use SafeHTML wrapper)
- Pitfall 13 (Edge Function streaming must be preserved)

**Research flags:** Standard patterns, no deep research needed. Direct CRUD pattern is already demonstrated by contacts implementation in the codebase.

---

### Phase 2: TanStack Query Migration

**Rationale:** TanStack Query is already installed. Once Phase 1 has direct CRUD in place (correct code to migrate), this phase upgrades the data layer to get structural rollback, cache invalidation, and proper `isPending`/`isError` states. This is the prerequisite for reliable error recovery.

**Delivers:** Structural correctness — failed writes roll back, cache stays in sync, no stale data.

**Addresses (from FEATURES.md):**
- Proper optimistic rollback via `onMutate`/`onError`/`onSettled` pattern
- Cache invalidation on mutations (removes stale-data class of bugs)

**Avoids (from PITFALLS.md):**
- Pitfall 1 (concurrent mutation snapshot — solved by TanStack Query's callback chain)
- Pitfall 3 (parallel state — full cutover per hook in one PR)
- Pitfall 11 (bulkMerge sequential awaits — fix to `Promise.all` in same migration)

**Stack (from STACK.md):**
- TanStack Query v5 `useQuery` + `useMutation` with rollback pattern
- `react-error-boundary` installed and placed at three boundary levels
- `msw` wired into Vitest for hook-level tests

**Migration order:** `useProspects` first (highest mutation volume) → `useSignals` → `useOpportunities` → `useTerritories` last (most complex membership logic).

**Research flags:** Standard pattern — official TanStack Query v5 docs cover this exactly. The critical implementation detail is `.throwOnError()` on Supabase queries; without it, `onError` never fires.

---

### Phase 3: Component Decomposition & UX Polish

**Rationale:** With a stable data layer, component surgery is safe. This phase reduces the blast radius of future changes and delivers the highest-impact UX improvements (tabs, mobile, Log Activity).

**Delivers:** Maintainable components with clear boundaries. Tabbed ProspectSheet that unblocks AI feature placement.

**Addresses (from FEATURES.md):**
- Tabbed layout in ProspectSheet (Overview | Activity | Contacts | AI)
- ProspectSheet/ProspectPage deduplication into shared `ProspectDetail` component
- Mobile touch target audit and card view at small breakpoints
- Log Activity widget (interaction + follow-up in one submit)
- TerritoryPlanner decomposition (ProspectFilterBar, BulkActionBar, ProspectTable, TerritoryDialogGroup)

**Avoids (from PITFALLS.md):**
- Pitfall 5 (prop drilling — audit + categorize 40+ state variables before extracting)
- Pitfall 8 (ProspectPage divergence — diff the two files and document differences first)
- Pitfall 9 (sub-collection lazy loading flicker — add skeleton states, consider hover prefetch)

**Ordering note:** Tabbed ProspectSheet must land before ProspectPage deduplication. ProspectPage deduplication must land before AI tab additions (add once, render in both).

**Research flags:** Standard patterns for tabbed panels (shadcn Tabs already present). The ProspectPage/ProspectSheet diff needs a manual review pass before any extraction to document behavioral differences.

---

### Phase 4: AI Capabilities

**Rationale:** Phase 3's AITab in ProspectSheet is the mounting point. Edge Function security fix from Phase 1 is the security prerequisite. This phase is mostly UI work since the `draft-outreach` Edge Function already exists.

**Delivers:** In-app AI tools that eliminate context-switching during account research and outreach.

**Addresses (from FEATURES.md):**
- AI outreach drafting UI (Edge Function exists, UI only)
- Score → Recommended Action block ("Why call this account" summary)
- Prospect research tool (requires new Edge Function)
- Competitive intel quick-reference (static battlecard content per competitor, no AI call needed)

**Avoids (from PITFALLS.md):**
- Pitfall 13 (cold start — use streaming response from Edge Function from day one; pattern already exists in `draft-outreach`)

**Anti-features to resist:** AI chat interface, general conversational UI. Each AI action should be a targeted button with specific context, not a chat box.

**Research flags:** Streaming response from Supabase Edge Function needs implementation verification. The pattern is documented but exact setup should be validated against the existing `draft-outreach` function before building new Edge Functions.

---

### Phase Ordering Rationale

- **Phase 1 before everything:** Data loss and security issues cannot wait. These are not polish.
- **Phase 2 before Phase 3:** Migrating to TanStack Query while TerritoryPlanner is still a god component is easier than migrating after decomposition moves mutation calls into sub-components. Do the data layer while callers are in one place.
- **Phase 3 before Phase 4:** The AITab is the mount point for AI features. Building AI features into a 989-line scroll before tabs exist means doing the work twice.
- **Test coverage spans all phases:** Write tests for each hook as it is migrated (Phase 2), and for each extracted component (Phase 3). Do not accumulate a test backlog.

### Research Flags

**Needs verification during implementation:**
- **Phase 1 (soft delete):** Test RLS policy with authenticated client before shipping — Pitfall 4 is a known gotcha in the Supabase community with a specific failure mode
- **Phase 2 (TanStack Query):** Verify `.throwOnError()` behavior with Supabase JS v2 before migrating all mutations — this is the critical detail that determines whether `onError` fires
- **Phase 4 (streaming Edge Function):** Validate streaming response setup with the existing `draft-outreach` function before building new AI Edge Functions

**Standard patterns (skip deep research):**
- **Phase 1 (direct CRUD, DOMPurify, error toasts):** Contacts implementation is already the correct pattern; replicate it for interactions/notes/tasks
- **Phase 2 (TanStack Query read path):** Official docs cover `useQuery` migration exactly, zero ambiguity
- **Phase 3 (shadcn Tabs):** Component already installed; tabbed layout is a mechanical implementation

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack additions | HIGH | All packages verified via npm registry and official docs; versions current as of 2026-03-26 |
| Feature priorities | HIGH | Table stakes derived from direct codebase analysis; differentiators cross-referenced against CRM industry patterns |
| Architecture migration path | HIGH | TanStack Query v5 docs are authoritative; codebase analyzed directly (line counts, state variable audit confirmed) |
| Pitfalls | HIGH | Top pitfalls sourced from official Supabase troubleshooting docs and TanStack Query maintainer blog posts; not inference |

**Overall confidence:** HIGH

### Gaps to Address

- **Soft delete RLS policy exact syntax:** The prevention strategy is clear but the exact policy SQL needs to be written and tested against the real Supabase instance. Cannot validate against a local instance (Lovable Cloud only).
- **AI streaming Edge Function setup:** The streaming pattern exists in `draft-outreach` but the exact implementation details (response headers, ReadableStream usage with Anthropic SDK) need to be read from that file before building new Edge Functions.
- **ProspectPage vs ProspectSheet behavioral differences:** Research flags this as a risk but the exact diff was not performed. Before Phase 3 extraction, a file-level diff must be done and documented. Unknown until that diff runs.
- **`bulkMerge` concurrent fix:** Changing `for...of + await` to `Promise.all` with batch size 10 is the right call, but the exact Supabase connection limit needs confirmation before setting the batch size.

---

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 official docs — optimistic updates, mutation rollback, migration guide
- Supabase official docs — soft deletes with RLS, Edge Functions, AI models
- react-error-boundary GitHub (bvaughn) — functional API, `useErrorBoundary` hook
- DOMPurify GitHub (cure53) — XSS sanitization, browser DOM approach
- MSW official docs (mswjs.io) — Node.js integration, Vitest setup
- TypeScript official docs — strict mode incremental migration
- Direct codebase analysis — `TerritoryPlanner.tsx` (2194 lines), `useProspects.ts` (580 lines), `ProspectSheet.tsx` (989 lines), `ProspectPage.tsx` (923 lines)

### Secondary (MEDIUM confidence)
- tkdodo.eu/blog — concurrent optimistic updates in React Query (TanStack maintainer)
- nygaard.dev/blog — testing Supabase with React Testing Library and MSW
- makerkit.dev — TanStack Query + Supabase integration guide (verified against official docs)
- uxmovement.medium.com — stacked list pattern for mobile tables
- cloudscape.design — GenAI loading states and streaming UX

### Tertiary (LOW confidence)
- Edge Function streaming exact implementation — needs validation against existing `draft-outreach` code before Phase 4

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
