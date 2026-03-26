# Architecture Patterns

**Domain:** React + Supabase SPA hardening — god component decomposition, TanStack Query migration, error boundaries
**Researched:** 2026-03-26
**Confidence:** HIGH (grounded in actual codebase analysis + official TanStack Query v5 docs)

---

## Recommended Architecture

The target architecture has three layers of change, applied in this order because each layer depends on the one before it:

```
1. Data layer:    useState/useEffect custom hooks → TanStack Query useQuery + useMutation
2. Shell layer:   TerritoryPlanner.tsx (2194 lines, 40+ state vars) → composed sub-components
3. Safety layer:  No error boundaries → react-error-boundary at route and feature boundaries
```

Each layer can ship independently. The data layer migration is a prerequisite for reliable optimistic rollback; the shell decomposition can proceed in parallel; error boundaries are additive and require no other changes.

---

## Component Boundaries

### What to Extract from TerritoryPlanner.tsx

TerritoryPlanner.tsx has 40+ `useState` declarations across six clearly identifiable clusters. Each cluster maps to one extraction target.

#### Extraction Map

| Cluster (lines) | State variables owned | Extract to | Communicates with |
|-----------------|----------------------|------------|-------------------|
| Filter bar (400–410) | `q`, `fIndustry`, `fStatus`, `fCompetitor`, `fTier`, `fLocRange`, `fOutreach`, `fPriority`, `fDataFilter`, `sK`, `sD` | `ProspectFilterBar` | TerritoryPlanner (filter state up or via context) |
| Pagination (410–411) | `page`, `viewMode` | `ProspectTableControls` | TerritoryPlanner (computed `filtered`, `totalPages`) |
| Bulk selection (413–422) | `selected`, `bulkStage`, `bulkTier`, `bulkIndustry`, `bulkPriority`, `bulkCompetitor`, `showBulkEdit`, `showBulkOutreach`, `bulkConfirm` | `BulkActionBar` | TerritoryPlanner (receives selected set, mutation callbacks) |
| Dialog launchers (425–477) | `showAdd`, `showUpload`, `showPasteImport`, `showEnrich`, `resetDialogOpen`, `showArchive`, `showShare`, `showNewTerritory` + their form state | `TerritoryDialogGroup` | TerritoryPlanner (dialog open booleans as props) |
| Inline editing (447) | `editingCell` | `ProspectTable` | TerritoryPlanner (update callback) |
| Prospect sheet (460) | `sheetProspectId` | Stays in TerritoryPlanner (it orchestrates the sheet) | ProspectSheet |

**Canonical extracted component tree after decomposition:**

```
TerritoryPlanner (orchestrator — ~300 lines after extraction)
├── TerritoryHeader          (nav, theme toggle, user menu, territory switcher)
├── ProspectFilterBar        (search, multi-selects, loc range slider, saved views)
├── ProspectTableControls    (view mode toggle, pagination, row count)
├── ProspectTable            (table rows, inline editing, aging dots, score badges)
│   └── ProspectRow          (single row, extracted if row logic exceeds ~80 lines)
├── ProspectKanban           (kanban columns — already mostly in OpportunityKanban.tsx pattern)
├── BulkActionBar            (selected count, bulk edit/outreach/delete buttons)
├── TerritoryDialogGroup     (renders all dialogs controlled by TerritoryPlanner state)
│   ├── AddProspectDialog    (already extracted)
│   ├── CSVUploadDialog      (already extracted)
│   ├── BulkEditDialog       (already extracted)
│   ├── BulkOutreachQueue    (already extracted)
│   ├── ShareTerritoryDialog (already extracted)
│   ├── EnrichmentQueue      (already extracted)
│   └── ArchiveDialog        (inline in TerritoryPlanner now — extract to component)
└── ProspectSheet            (already extracted — slide-over detail panel)
```

**What stays in TerritoryPlanner:** hook calls, filter-derived `useMemo` computations, `useEffect` for keyboard shortcuts and `fLocRange` initialization, and the open/close state for each dialog. TerritoryPlanner becomes a coordinator, not a renderer.

#### ProspectSheet Tab Structure

ProspectSheet is 989 lines of vertical scroll. The roadmap item for a tabbed layout maps directly to decomposing it into tab-scoped sub-components:

```
ProspectSheet
├── ProspectSheetHeader     (logo, name, status badges, score, actions)
├── Tabs (Overview | Activity | Contacts | AI)
│   ├── OverviewTab         (fields, notes, signals)
│   ├── ActivityTab         (interaction log, tasks, log-activity widget)
│   ├── ContactsTab         (contact list, add/edit/remove)
│   └── AITab               (readiness card, outreach drafting, competitive intel)
```

**Dependency note:** ProspectSheet tab extraction should come after the TerritoryPlanner decomposition. ProspectSheet already has a clean prop interface; adding tabs is additive, not structural.

---

## Data Flow Changes: useState → TanStack Query

### Current State (Problem)

```
useProspects (useState/useEffect)
  ├── loadData() runs on mount + user/territory change
  ├── update() does optimistic setData() BEFORE Supabase write
  ├── On Supabase failure: console.error, toast — local state stays wrong
  └── No rollback, no cache, no deduplication
```

### Target State

```
useProspects (TanStack Query)
  ├── useQuery(['prospects', territoryId]) — cache, background refetch, dedup
  ├── useMutation for each write operation — onMutate/onError/onSettled rollback
  └── queryClient.invalidateQueries(['prospects']) on settled — server truth wins
```

### Migration Path (incremental — do not big-bang)

TanStack Query v5 is already installed (`^5.83.0`) and `QueryClientProvider` is configured in `App.tsx` with `refetchOnWindowFocus: false`. The migration is a hook-level change, not an app-level change.

**Step 1 — Migrate read path first (zero risk)**

Replace `useState + useEffect + loadData()` in `useProspects` with a single `useQuery`:

```typescript
// Before
const [data, setData] = useState<Prospect[]>([]);
const [ok, setOk] = useState(false);
useEffect(() => { if (user) loadData(); }, [user, loadData]);

// After
const { data = [], isLoading } = useQuery({
  queryKey: ['prospects', territoryId, user?.id],
  queryFn: () => fetchProspects(territoryId, user!.id),
  enabled: !!user,
});
const ok = !isLoading;
```

The public API surface (`data`, `ok`) stays identical. Zero callers need to change.

**Step 2 — Migrate writes with rollback**

Convert each mutation function to `useMutation`. The key pattern for `update()`:

```typescript
const updateProspect = useMutation({
  mutationFn: async ({ id, changes }: { id: string; changes: Partial<Prospect> }) => {
    const { error } = await supabase.from('prospects').update(toDbFields(changes)).eq('id', id);
    if (error) throw error;
  },
  onMutate: async ({ id, changes }) => {
    await queryClient.cancelQueries({ queryKey: ['prospects', territoryId] });
    const previous = queryClient.getQueryData<Prospect[]>(['prospects', territoryId]);
    queryClient.setQueryData<Prospect[]>(['prospects', territoryId], (old = []) =>
      old.map(p => p.id === id ? { ...p, ...changes } : p)
    );
    return { previous };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['prospects', territoryId], context?.previous);
    toast.error('Failed to save changes. Your edit was reverted.');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['prospects', territoryId] });
  },
});
```

**Critical Supabase detail:** Always chain `.throwOnError()` on Supabase queries inside `mutationFn`. Without it, Supabase returns errors in the response object instead of throwing, and `useMutation`'s `onError` never fires.

**Step 3 — Migrate sub-collections (interactions, notes, tasks)**

These are still using delete+re-insert today. Migrating them to direct CRUD (already done for contacts) AND wrapping in `useMutation` gives both data integrity and rollback. This is the highest-value migration step for the core value ("never silently lose data").

**Sub-collection query keys:**

```typescript
['interactions', prospectId]   // useQuery per open ProspectSheet
['notes', prospectId]
['tasks', prospectId]
['contacts', prospectId]
```

Since ProspectSheet receives prospect data via props today, the sub-collections can stay parent-fetched initially. Only move to per-prospect query keys if the ProspectPage (full-page route) needs to fetch independently.

**Step 4 — Expose consistent hook API**

After migration, `useProspects` still returns `{ data, ok, update, add, remove, ... }`. The internal implementation changes; the interface does not. This keeps TerritoryPlanner and all callers untouched during the migration.

### Migration Order Rationale

Migrate `useProspects` first (highest mutation volume), then `useSignals` (simpler, less traffic), then `useOpportunities` (already isolated in its own hook). `useTerritories` last — it has the most complex membership management logic and is lowest risk to defer.

---

## Error Boundary Architecture

### Recommended: react-error-boundary

React error boundaries in 2025 require a class component for the `getDerivedStateFromError` lifecycle. The `react-error-boundary` package (maintained, widely used) wraps this into a functional API. It is not currently installed — add it:

```bash
bun add react-error-boundary
```

### Placement Strategy

Three boundary placements cover the failure surface without over-engineering:

```
App.tsx
└── <ErrorBoundary fallback={<AppCrashScreen />}>    ← catch catastrophic render failures
    └── AuthProvider + BrowserRouter
        └── Routes
            └── / → <ErrorBoundary fallback={<DashboardErrorFallback />}>  ← route-level
                       └── TerritoryPlanner
                           └── ProspectSheet
                               └── <ErrorBoundary fallback={<SheetErrorFallback />}> ← sheet-level
                                      └── ProspectSheet content
```

**Route-level boundary** (highest priority): Wrap `<TerritoryPlanner />` in Index.tsx. This catches rendering errors in any sub-component without crashing the entire app. The fallback shows "Something went wrong loading your territory — reload to retry."

**Sheet-level boundary**: ProspectSheet renders user-supplied data (prospect notes with potential HTML content, AI-generated text). A rendering bug in one prospect's sheet should not crash the table. The fallback shows "Error displaying this prospect — click to dismiss."

**App-level boundary**: Single catch-all in App.tsx for genuine bugs. Shows a branded error screen with a reload button.

### Boundary for Async Errors

Error boundaries do NOT catch async errors (Promise rejections, Supabase failures). Those are handled by TanStack Query's `onError` in mutations and `useQuery`'s `error` state. The boundary/query combination covers the full failure surface:

- Render errors → boundary
- Data fetch errors → useQuery `isError` state
- Mutation failures → useMutation `onError` with rollback + toast

---

## Build Order

The dependency graph determines the order:

```
Phase 1 (data integrity — independent of architecture):
  - Harden interactions/notes/tasks to direct CRUD (not delete+re-insert)
  - Implement soft delete / archive in DB
  - No architecture change required — pure hook-level fixes

Phase 2 (TanStack Query migration — builds on Phase 1):
  - Migrate useProspects read path (useQuery)
  - Migrate useProspects write path (useMutation with rollback)
  - Migrate useSignals, useOpportunities
  - ERROR RECOVERY now works correctly (rollback on failed writes)
  - Add react-error-boundary at route and sheet level

Phase 3 (component decomposition — can overlap with Phase 2):
  - Extract TerritoryHeader from TerritoryPlanner
  - Extract ProspectFilterBar from TerritoryPlanner
  - Extract BulkActionBar from TerritoryPlanner
  - Extract ProspectTable (with inline editing) from TerritoryPlanner
  - Extract ArchiveDialog to its own component file
  - Add tabbed layout to ProspectSheet (OverviewTab, ActivityTab, ContactsTab, AITab)

Phase 4 (AI capabilities — builds on Phase 3 tab structure):
  - AITab in ProspectSheet provides the mounting point for outreach drafting, research tool
  - Edge function calls benefit from useMutation pattern established in Phase 2
```

**Critical dependency:** Phase 3 (decomposition) does NOT require Phase 2 (TanStack Query) to be complete first. They can run in parallel. But Phase 4 (AI tab) benefits from the ProspectSheet tab structure from Phase 3, so Phase 4 should follow Phase 3.

**What must NOT be done first:** Do not start decomposing TerritoryPlanner before identifying which state variables belong to which extracted component. A premature extraction that moves state to a child and then needs it in a sibling requires another refactor pass.

---

## Patterns to Follow

### Pattern 1: Query Key Hierarchy

Use a three-level key structure: `[entity, scope, qualifiers]`.

```typescript
['prospects', territoryId]               // all prospects in territory
['prospect', prospectId]                 // single prospect (ProspectPage)
['interactions', prospectId]             // sub-collection
['contacts', prospectId]
['opportunities', territoryId]
['signals', territoryId]
```

Invalidate at the broadest level that's safe. After an `update`, invalidate `['prospects', territoryId]` — not just the single-prospect key — so the table stays in sync.

### Pattern 2: Keep Hook API Surfaces Stable

Consumers of `useProspects` call `update(id, partial)`, `add(partial)`, `remove(id)`. The migration to TanStack Query is internal to the hook. Expose the same function signatures. This means TerritoryPlanner and ProspectSheet need zero changes during the data layer migration.

```typescript
// Public API stays the same before and after migration
const { data, ok, update, add, remove, addNote, deleteNote, addContact, updateContact, removeContact } = useProspects(territoryId);
```

### Pattern 3: Optimistic Update Then Invalidate

Always follow the three-step pattern in `useMutation`:
1. `onMutate` — snapshot + optimistic cache update
2. `onError` — restore snapshot + show error toast
3. `onSettled` — invalidate to pull server truth (runs whether success or error)

The `onSettled` invalidation is important: even on success, the server might have applied transforms (e.g., `last_touched` auto-update) that the optimistic update didn't know about.

### Pattern 4: Extract Inline Components to Module Level

`LogoImg`, `ScoreBadge`, `SkeletonRows`, `Pagination` are currently defined as functions inside `TerritoryPlanner`. Move them to module level (outside the component function) or to separate files. Inline component definitions re-create the component identity on every render, breaking React's reconciliation and causing unnecessary remounts.

### Pattern 5: Colocate Dialog State with its Opener

Each dialog's `open` boolean and its associated form state should live as close to the dialog as possible. After extraction, `AddProspectDialog` owns its own form state internally rather than receiving `newName`, `newWebsite`, etc. as props from TerritoryPlanner. The only prop TerritoryPlanner needs to provide is `open` + `onSuccess(newProspect)`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Big-Bang Migration

**What:** Migrating all hooks to TanStack Query simultaneously in one PR.
**Why bad:** If a subtle rollback bug surfaces, there is no bisect point. The app's data layer is untestable during the migration window.
**Instead:** Migrate one hook at a time. Ship `useProspects` read-only migration as a standalone commit, verify nothing regressed, then add the mutation migration.

### Anti-Pattern 2: Moving State Up Before Extracting Components

**What:** Lifting all TerritoryPlanner state to a context provider before extracting any sub-components.
**Why bad:** Context is only necessary if sibling components need the same state. Most of TerritoryPlanner's state is local to one extracted component (e.g., `filtersOpen` only matters to `ProspectFilterBar`). Premature context adds indirection with no benefit.
**Instead:** Extract each component with collocated state first. Introduce a `TerritoryPlannerContext` only if, after extraction, you find genuine cross-component state sharing that can't be solved with props.

### Anti-Pattern 3: Wrapping Entire App in One Error Boundary

**What:** A single boundary at the App root.
**Why bad:** Any render error anywhere crashes the entire UI. The user loses context on what failed.
**Instead:** Boundaries at route level + at high-risk leaf nodes (ProspectSheet). The root boundary is a safety net only.

### Anti-Pattern 4: Using useMutation Without onMutate Rollback for Sub-Collections

**What:** Converting sub-collection mutations to useMutation but only implementing onError with a toast (no snapshot/restore).
**Why bad:** The UI shows the wrong state after a failed write. Users see their change "stick" even though it didn't save.
**Instead:** Always snapshot in onMutate, restore in onError. The three-step pattern is non-optional for any mutation that touches visible data.

### Anti-Pattern 5: Defining Components Inside Component Functions

**What:** `const Pagination = () => (...)` inside `TerritoryPlanner` function body.
**Why bad:** New function reference on every render. React sees a new component type, unmounts and remounts the DOM subtree. Input state (focus, scroll position) resets.
**Instead:** Define at module scope or extract to a file. Already done wrong in current code — fix as part of decomposition.

---

## Scalability Considerations

This is a personal tool with one active user. Scalability is not a concern at current scale. The architecture decisions here are about code maintainability and data reliability, not traffic capacity.

| Concern | Current | After Migration |
|---------|---------|----------------|
| Failed write recovery | None — stale state until reload | Rollback + toast on any mutation failure |
| Render crash isolation | None — full app crash | Bounded to route or sheet level |
| Bundle size | TerritoryPlanner is one large chunk | Sub-components enable future code splitting |
| Test surface | God component, hard to test | Extracted components + hooks are unit-testable |

---

## Sources

- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates) — HIGH confidence (official docs)
- [TanStack Query + Supabase Integration Guide](https://makerkit.dev/blog/saas/supabase-react-query) — MEDIUM confidence (community guide, verified against official docs)
- [react-error-boundary (React docs reference)](https://legacy.reactjs.org/docs/error-boundaries.html) — HIGH confidence (official)
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5) — HIGH confidence (official docs)
- Codebase analysis of `TerritoryPlanner.tsx` (2194 lines), `useProspects.ts` (580 lines), `ProspectSheet.tsx` (989 lines) — HIGH confidence (direct inspection)
