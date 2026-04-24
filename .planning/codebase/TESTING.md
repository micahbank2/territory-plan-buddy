# Testing Patterns

**Analysis Date:** 2026-04-24

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom
- Globals enabled (`globals: true` — `describe`/`it`/`expect` available without import, but most tests import them explicitly for clarity)
- Setup file: `src/test/setup.ts`
- Test file pattern: `src/**/*.{test,spec}.{ts,tsx}` (co-located with source)

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible API)
- `@testing-library/jest-dom` ^6.6.0 — DOM matchers (`toBeInTheDocument`, `toBeDisabled`, `toBeChecked`, etc.)

**React Testing:**
- `@testing-library/react` ^16.0.0 — `render`, `screen`, `fireEvent`
- Used actively in component tests (`SafeHTML.test.tsx`, `PendingOutreachDialog.test.tsx`)

**Setup file** (`src/test/setup.ts`):
- Imports `@testing-library/jest-dom` globally
- Polyfills `window.matchMedia` for jsdom (required by responsive hooks and shadcn media queries)

**TypeScript:** `tsconfig.app.json` includes `"types": ["vitest/globals"]` so global APIs type-check without imports.

**Run Commands:**
```bash
bun run test          # Run all tests once (vitest run)
bun run test:watch    # Watch mode (vitest)
```

## Test File Organization

**Location:** Tests are co-located with the source file they cover (not in a separate `__tests__/` or `src/test/` tree, aside from the shared `setup.ts` and one placeholder).

```
src/
  components/
    SafeHTML.tsx
    SafeHTML.test.tsx
    ProspectSheet.tsx
    ProspectSheet.test.tsx
    TerritoryPlanner.tsx
    TerritoryPlanner.test.tsx
    PendingOutreachDialog.tsx
    PendingOutreachDialog.test.tsx
  hooks/
    useProspects.ts
    useProspects.test.ts
  lib/
    pendingBatch.ts
    pendingBatch.test.ts
  test/
    setup.ts
    example.test.ts    # legacy placeholder
```

**Naming:** `*.test.ts` or `*.test.tsx` (prefer `.tsx` for component tests, `.ts` for pure module tests).

**Phase tracking in test names:** Tests reference the originating phase ticket ID in describe blocks and docstrings. Pattern: `describe("useProspects rollback contracts (DATA-01)", ...)`, `describe("SafeHTML (SEC-03)", ...)`. Ticket prefixes: `DATA-*`, `SEC-*` (Phase 01), `AI-*` (Phase 04).

## Test Structure

**Pure module test** (`src/lib/pendingBatch.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { savePendingBatch, loadPendingBatch, clearPendingBatch } from "@/lib/pendingBatch";

describe("pendingBatch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("savePendingBatch writes JSON to localStorage under tp-pending-outreach", () => {
    const batch: PendingBatch = { entries: [], savedAt: new Date().toISOString() };
    savePendingBatch(batch);
    const raw = localStorage.getItem("tp-pending-outreach");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(batch);
  });
});
```

**Component rendering test** (`src/components/PendingOutreachDialog.test.tsx`):
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PendingOutreachDialog } from "./PendingOutreachDialog";

describe("PendingOutreachDialog", () => {
  it("Test 1: renders contact entries grouped by prospect name", () => {
    render(<PendingOutreachDialog {...defaultProps} />);
    expect(screen.getByText("Shake Shack")).toBeInTheDocument();
  });

  it("Test 3: Mark as Sent button is enabled when at least one contact is checked", () => {
    render(<PendingOutreachDialog {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(screen.getByRole("button", { name: /mark as sent/i })).not.toBeDisabled();
  });
});
```

**Supabase hook contract test** (`src/hooks/useProspects.test.ts`):
```typescript
// Mock Supabase client at module level
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

// Build chainable query mock
function makeQueryMock(resolveWith: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveWith).then(resolve);
  return chain;
}
```

**Source-string assertion test** (`src/components/ProspectSheet.test.tsx`) — used to enforce architectural invariants without instantiating heavy components:
```typescript
import * as fs from "fs";
import * as path from "path";

describe("ProspectSheet (SEC-01, SEC-02)", () => {
  it("generateMeetingPrep calls functions.invoke('meeting-prep') not direct fetch", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "ProspectSheet.tsx"), "utf-8");
    expect(source).not.toContain("api.anthropic.com");
    expect(source).not.toContain("VITE_ANTHROPIC_API_KEY");
    expect(source).toContain('supabase.functions.invoke("meeting-prep"');
  });
});
```
Use this pattern to lock down "never call X directly" security invariants when full component rendering is too expensive or brittle.

**Stub/todo placeholder** (`src/components/TerritoryPlanner.test.tsx`, soft-delete cases in `useProspects.test.ts`):
```typescript
it.todo("DATA-05: remove() calls .update({ deleted_at }) not .delete()");
it.todo("shows archived prospects when toggle is active");
```
Use `it.todo(...)` to reserve a test slot for functionality that is stubbed pending schema changes. These render as pending in the Vitest output without failing the run.

## Mocking

**Framework:** Vitest built-in (`vi.mock`, `vi.fn`, `vi.spyOn`).

**Standard mock set for hook tests:**
```typescript
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1", email: "test@test.com" } })),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

// Keep real domain constants, stub only SEED to avoid loading 309 accounts
vi.mock("@/data/prospects", async () => {
  const actual = await vi.importActual<typeof import("@/data/prospects")>("@/data/prospects");
  return { ...actual, SEED: [] };
});
```

**Supabase chain mock pattern:** The Supabase SDK's fluent API (`.from().update().eq()`) requires the mock to be chainable AND awaitable. The `makeQueryMock` helper in `src/hooks/useProspects.test.ts` assigns `chain.then = (resolve) => Promise.resolve(resolveWith).then(resolve)` to make the chain thenable so `await supabase.from(...).update(...).eq(...)` resolves properly.

**Per-test overrides:** Replace the whole `from` mock per test rather than configuring return values on a shared mock:
```typescript
const insertMock = vi.fn().mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [{ id: "new-int-1" }], error: null }),
});
(supabase.from as any) = vi.fn().mockReturnValue({ insert: insertMock });
```

**What to mock:**
- External boundaries: Supabase client, auth context, `sonner` toast, `react-router-dom`
- Heavy seed data: `SEED` array in `src/data/prospects.ts` (otherwise 309 accounts load per test)

**What NOT to mock:**
- `cn()` and other pure utilities in `src/lib/utils.ts`
- Domain constants (`STAGES`, `INDUSTRIES`, etc.) — use `vi.importActual` and only override the heavy parts
- `initProspect`, `scoreProspect`, and other pure functions in `src/data/prospects.ts`

## Fixtures and Factories

**No dedicated fixtures directory.** Test data is inlined per-test. Example from `PendingOutreachDialog.test.tsx`:
```typescript
const sampleBatch: PendingBatch = {
  savedAt: "2026-03-30T12:00:00Z",
  entries: [
    { contactId: "c1", contactName: "Alice Smith", contactTitle: "VP Marketing",
      prospectId: "p1", prospectName: "Shake Shack" },
    // ...
  ],
};
```

**Factory function:** `initProspect()` in `src/data/prospects.ts` is the canonical way to build a Prospect with all defaults:
```typescript
import { initProspect } from "@/data/prospects";
const testProspect = initProspect({
  id: "test-1",
  name: "Test Corp",
  industry: "QSR/Fast Casual",
  locationCount: 100,
});
```

**When writing a new test that needs Prospect-shaped data,** prefer `initProspect({...})` over hand-constructing objects so required fields and defaults stay in sync with schema changes.

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**Current coverage (as of 2026-04-24):** 7 test files, concentrated in Phase 01 (data integrity + XSS) and Phase 04 (pending outreach) work:
- `src/lib/pendingBatch.test.ts` — localStorage CRUD (7 tests)
- `src/hooks/useProspects.test.ts` — rollback + direct CRUD contracts (5 tests + 4 `it.todo`)
- `src/components/SafeHTML.test.tsx` — DOMPurify sanitization (4 tests)
- `src/components/PendingOutreachDialog.test.tsx` — dialog interactions (5 tests)
- `src/components/ProspectSheet.test.tsx` — source-level security invariants (1 test)
- `src/components/TerritoryPlanner.test.tsx` — archive placeholder (`it.todo`)
- `src/test/example.test.ts` — legacy placeholder

**View Coverage:**
```bash
bun vitest run --coverage    # Requires @vitest/coverage-v8 or @vitest/coverage-istanbul (not installed)
```
Coverage tooling is not installed. Add `@vitest/coverage-v8` when coverage enforcement becomes a goal.

## Test Types

**Unit Tests (pure modules):**
- `src/lib/pendingBatch.test.ts` — localStorage serialization
- Candidates for new tests: `scoreProspect`, `scoreBreakdown`, `getScoreLabel`, `normalizeUrl`, `cn`, `sanitizeForDb` (in `useOpportunities.ts`), `dbToProspect` (in `useProspects.ts`)

**Hook Contract Tests:**
- `src/hooks/useProspects.test.ts` — verifies Supabase call shape rather than full hook behavior. Tests use `vi.mock` + chain mocks to assert that certain table/column/operation combinations are invoked.

**Component Tests:**
- `src/components/PendingOutreachDialog.test.tsx` — full render + fireEvent interaction
- `src/components/SafeHTML.test.tsx` — render + DOM content assertion

**Invariant/Lint-style Tests:**
- `src/components/ProspectSheet.test.tsx` — reads source file as text and asserts forbidden strings (`api.anthropic.com`, `VITE_ANTHROPIC_API_KEY`) are absent. Used to lock security boundaries.

**E2E Tests:**
- Not implemented. No Playwright, Cypress, or similar framework installed.

## Test Gaps

**High-priority gaps (critical logic, no coverage):**
- `src/data/prospects.ts` — `scoreProspect`, `scoreBreakdown`, `getScoreLabel`, `initProspect` (pure functions, easy to test)
- `src/hooks/useProspects.ts` — bulk operations (`bulkUpdate`, `bulkRemove`, `bulkAdd`, `bulkMerge`) have rollback logic but no tests
- `src/hooks/useOpportunities.ts` — `sanitizeForDb` field filtering, `remove` rollback
- `src/hooks/useTerritories.ts` — role enforcement, sharing, member management
- `src/hooks/useSignals.ts` — rollback on update failure
- `src/lib/utils.ts` — `normalizeUrl` edge cases

**Medium-priority gaps:**
- Soft-delete behavior (`it.todo` placeholders exist in `useProspects.test.ts` — fill in when `deleted_at` column is added)
- Direct contact CRUD (`addContact`, `updateContact`, `removeContact`) — mirror the interaction/task test pattern
- Archive view rendering (`TerritoryPlanner.test.tsx` placeholder exists)

**Lower-priority gaps:**
- Full `TerritoryPlanner` render (large component, filtering/sorting/saved views logic)
- `ProspectSheet` tabbed layout + inline editing
- Edge Function response handling in components (`draft-outreach`, `meeting-prep`, `chat`)

**Testing-debt notes:**
- No CI runs tests on push (Lovable Cloud deploys without test gate)
- No pre-commit hooks enforce testing
- Coverage tooling uninstalled
- Most tests assert on mock call shape rather than full state/DB interaction — reasonable for fast feedback, but integration tests would catch wiring bugs the current suite misses

## Writing New Tests — Quick Reference

**For a new pure function in `src/lib/` or `src/data/`:**
1. Create `{name}.test.ts` co-located with source
2. Import `describe, it, expect` from `vitest`
3. Use `initProspect`, `initContact`, etc. factories for domain shapes
4. No mocking needed

**For a new hook mutation:**
1. Create/extend `src/hooks/{hook}.test.ts`
2. Copy the mock block from `useProspects.test.ts` (supabase + useAuth + sonner)
3. Use `makeQueryMock` or inline chain mocks
4. Assert: Supabase called with correct table/columns/where clause + `toast.error` called on failure path

**For a new component with interactions:**
1. Create `{Component}.test.tsx` co-located
2. Import `render`, `screen`, `fireEvent` from `@testing-library/react`
3. Pass all props explicitly (use `vi.fn()` for callbacks)
4. Assert via `screen.getByText`, `screen.getByRole`, etc.

**For a security/architecture invariant:**
1. Use the source-string pattern from `ProspectSheet.test.tsx`
2. Read the file via `fs.readFileSync(path.resolve(__dirname, "File.tsx"), "utf-8")`
3. Assert forbidden patterns are absent, required patterns are present

---

*Testing analysis: 2026-04-24*
