# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom
- Globals enabled (`globals: true` -- no need to import `describe`/`it`/`expect` but they can be explicitly imported)

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest API)
- `@testing-library/jest-dom` 6.6.0 for DOM matchers (imported in setup)

**React Testing:**
- `@testing-library/react` 16.0.0 (available but unused)

**Setup file:** `src/test/setup.ts`
- Imports `@testing-library/jest-dom` for DOM matchers
- Polyfills `window.matchMedia` for jsdom (needed by responsive hooks)

**Run Commands:**
```bash
bun run test          # Run all tests once (vitest run)
bun run test:watch    # Watch mode (vitest)
```

## Test File Organization

**Location:** Tests go in `src/test/` directory (not co-located with source).

**Naming:** `*.test.ts` or `*.spec.ts` (configured via `include: ["src/**/*.{test,spec}.{ts,tsx}"]`).

**Current structure:**
```
src/
  test/
    setup.ts           # Global test setup
    example.test.ts    # Placeholder test only
```

## Test Structure

**Only test file (`src/test/example.test.ts`):**
```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

This is a placeholder. No actual application logic is tested.

## Mocking

**Framework:** Vitest built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`) -- available but unused.

**No mocks configured for:**
- Supabase client (`src/integrations/supabase/client.ts`)
- Auth context (`src/hooks/useAuth.tsx`)
- Router (`react-router-dom`)

**To test hooks that call Supabase**, you would need to mock:
```typescript
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({ data: [], error: null }),
      update: vi.fn().mockReturnValue({ data: [], error: null }),
      delete: vi.fn().mockReturnValue({ data: null, error: null }),
    }),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
```

## Fixtures and Factories

**No test fixtures exist.** The codebase has seed data in `src/data/prospects.ts` (309 accounts via `SEED` array) that could serve as test data, but no test-specific factories or fixtures are defined.

**To create test prospects:**
```typescript
import { initProspect } from "@/data/prospects";
const testProspect = initProspect({
  id: "test-1",
  name: "Test Corp",
  industry: "QSR/Fast Casual",
  locationCount: 100,
});
```

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**Current coverage:** Effectively 0%. The only test is a placeholder `expect(true).toBe(true)`.

**View Coverage:**
```bash
bun vitest run --coverage    # Requires @vitest/coverage-v8 or @vitest/coverage-istanbul (not installed)
```

Coverage tooling is not installed as a dependency.

## Test Types

**Unit Tests:**
- Not implemented. Pure functions that could be unit tested:
  - `scoreProspect()` in `src/data/prospects.ts`
  - `scoreBreakdown()` in `src/data/prospects.ts`
  - `getScoreLabel()` in `src/data/prospects.ts`
  - `normalizeUrl()` in `src/lib/utils.ts`
  - `cn()` in `src/lib/utils.ts`
  - `sanitizeForDb()` in `src/hooks/useOpportunities.ts`
  - `dbToProspect()` in `src/hooks/useProspects.ts`
  - `getAgingClass()` in `src/components/TerritoryPlanner.tsx`

**Integration Tests:**
- Not implemented. Hook testing with mocked Supabase would be valuable for:
  - `useProspects` CRUD operations
  - `useOpportunities` DB field sanitization
  - `useTerritories` role management

**E2E Tests:**
- Not implemented. No Playwright, Cypress, or similar framework installed.

**Component Tests:**
- Not implemented. `@testing-library/react` is installed but unused.

## Test Gaps

**Critical gaps (high risk, no coverage):**
- `src/hooks/useProspects.ts` -- All CRUD operations, optimistic updates, sub-collection sync. Any bug here corrupts user data.
- `src/data/prospects.ts` -- Scoring logic (`scoreProspect`, `scoreBreakdown`). Score drives UI prioritization.
- `src/hooks/useOpportunities.ts` -- DB field sanitization (`sanitizeForDb`). Bad sanitization = failed inserts or data loss.

**Important gaps (medium risk):**
- `src/lib/utils.ts` -- `normalizeUrl()` has edge case handling that should be verified
- `src/hooks/useTerritories.ts` -- Territory sharing, role enforcement
- `src/components/TerritoryPlanner.tsx` -- Filtering, sorting, saved views logic (2194 lines of untested UI logic)

**Lower priority gaps:**
- `src/components/ProspectSheet.tsx` -- UI interactions, inline editing
- `src/components/ContactBadges.tsx` -- Display logic
- `src/hooks/useAuth.tsx` -- Auth state management, token refresh deduplication

**Known testing debt:**
- The entire codebase has zero meaningful test coverage
- No CI integration runs tests on push
- No pre-commit hooks enforce testing
- Test infrastructure (vitest + testing-library) is fully set up but completely unused

---

*Testing analysis: 2026-03-26*
