---
phase: 03-component-decomposition-ux-polish
plan: 01
subsystem: ui
tags: [react, shadcn, sheet, drawer, vaul, vitest, testing-library, responsive]

# Dependency graph
requires:
  - phase: 04-ai-capabilities
    provides: ContactPickerDialog, draft-outreach + meeting-prep edge functions, status filter — must keep working as nested Dialogs inside the new Sheet/Drawer
provides:
  - ProspectSheet wrapped in useIsMobile() ? Drawer : Sheet (Dialog-on-every-viewport gap closed)
  - src/test/ProspectSheet.responsive.test.tsx — 3 live tests covering Drawer (mobile), Sheet (desktop), no body scroll-lock
  - src/test/ProspectSheet.tab.test.tsx — 4 it.todo placeholders ready for Plan 02 (UX-01 + UX-02)
affects: [03-02 (tabs implementation), 03-03 (TerritoryPlanner decomposition)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Responsive sheet wrapper: const isMobile = useIsMobile(); if (isMobile) return <Drawer/>; return <Sheet/>; (matches OpportunitySheet.tsx:450-466)"
    - "Test scaffold strategy: it.skip() for tests with real bodies that the next task activates; it.todo() for tests whose API doesn't exist yet"

key-files:
  created:
    - src/test/ProspectSheet.responsive.test.tsx
    - src/test/ProspectSheet.tab.test.tsx
  modified:
    - src/components/ProspectSheet.tsx

key-decisions:
  - "Keep top-level Dialog import in ProspectSheet — still used for two nested dialogs (Outreach Draft, Meeting Prep) inside sheetContent"
  - "Tab tests stay it.todo() not it.skip() — they reference props (activeTab/onTabChange) that don't exist yet, todo is the more honest state"
  - "Mock useIsMobile via vi.mock() per-test — matchMedia mock in setup.ts only flips one direction (matches:false), not enough to test both branches"

patterns-established:
  - "Per-test mobile-mode override: vi.mock('@/hooks/use-mobile') + mockedUseIsMobile.mockReturnValue(true|false) — used by every responsive test going forward"
  - "Responsive component pattern matched verbatim from OpportunitySheet — single source of truth for the Sheet/Drawer convention"

requirements-completed: []

# Metrics
duration: 2m 23s
completed: 2026-04-24
---

# Phase 03 Plan 01: ProspectSheet Responsive Wrapper Summary

**ProspectSheet now slides in as a shadcn Sheet on desktop and a vaul Drawer on mobile — closing the CLAUDE.md vs reality gap and seeding plan 02's tab tests.**

## Performance

- **Duration:** 2m 23s
- **Started:** 2026-04-24T21:28:35Z
- **Completed:** 2026-04-24T21:30:58Z
- **Tasks:** 2
- **Files modified:** 3 (1 component + 2 test scaffolds)

## Accomplishments
- ProspectSheet wrapped in `useIsMobile() ? Drawer : Sheet` — pattern copied verbatim from `OpportunitySheet.tsx:450-466`. Audit gap from `.planning/audits/AUDIT-APPWIDE.md` resolved; CLAUDE.md claim ("Sheet on desktop, Drawer on mobile") is now true.
- Three live responsive tests — Drawer renders on mobile, Sheet renders on desktop, body does not get scroll-locked on desktop.
- Four `it.todo()` placeholders for Plan 02 — Test D (4 tab triggers), Test E (controlled `activeTab` prop), Test F (UX-02 SC-3 persistence), Test G (`onTabChange` callback).
- Zero regressions across the full suite (28 passed + 5 todo, 0 failures).

## Task Commits

1. **Task 1: Add test scaffolds for responsive + tab behavior** — `6015834` (test)
2. **Task 2: Swap ProspectSheet Dialog wrapper for responsive Sheet/Drawer** — `7a4930d` (feat)

_Note: Task 2 was a TDD GREEN-only task — Task 1 wrote the failing/skipped tests first, Task 2 made them pass plus shipped the implementation in one commit._

## Files Created/Modified
- `src/components/ProspectSheet.tsx` — added Sheet, Drawer, useIsMobile imports; added `const isMobile = useIsMobile()` near top of component body; replaced final Dialog wrapper return with `if (isMobile) Drawer; return Sheet;` pattern
- `src/test/ProspectSheet.responsive.test.tsx` — 3 tests with full bodies (Drawer/mobile, Sheet/desktop, no overflow:hidden); started as `it.skip`, flipped to `it` in Task 2
- `src/test/ProspectSheet.tab.test.tsx` — 4 `it.todo` placeholders documenting Plan 02 acceptance contract

## Decisions Made
- **Kept the `Dialog` import:** the sheetContent JSX still contains two nested `<Dialog>` instances (Outreach Draft Dialog ~line 1072, Meeting Prep Dialog ~line 1104) and the ContactPickerDialog. Removing the Dialog import would break those.
- **Used `it.todo()` for tab tests, not `it.skip()`:** the test bodies for tabs reference props (`activeTab`, `onTabChange`) that don't exist on `ProspectSheetProps` yet. `it.todo` accurately conveys "this test has no body yet"; Plan 02 fills bodies in.
- **Mocked `useIsMobile` with `vi.mock()` per test instead of touching `setup.ts`'s `matchMedia`:** the global mock in setup.ts always returns `matches:false`, so Test A (mobile) needs its own override. `vi.mock("@/hooks/use-mobile")` keeps the mock co-located with the test.
- **Sheet sizing matches OpportunitySheet exactly** (`w-full sm:w-[700px] sm:max-w-[50vw]`) — single convention across both sheets.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Pre-existing accessibility warnings** (DialogContent missing DialogTitle / Description) surfaced from the nested Outreach Draft and Meeting Prep Dialogs during test runs. These are NOT regressions — they exist on `main` already. Logged as deferred (out-of-scope per scope-boundary rule).

## Self-Check

Verified files exist:
- src/components/ProspectSheet.tsx (modified)
- src/test/ProspectSheet.responsive.test.tsx (created)
- src/test/ProspectSheet.tab.test.tsx (created)

Verified commits exist:
- 6015834 — test(03-01): add scaffolds for ProspectSheet responsive + tab behavior
- 7a4930d — feat(03-01): swap ProspectSheet Dialog wrapper for responsive Sheet/Drawer

## Next Phase Readiness
- Plan 02 has a concrete target list: 4 `it.todo` tests in `ProspectSheet.tab.test.tsx`. Convert each to `it(...)` after wiring `<Tabs>` + `activeTab`/`onTabChange` props.
- Plan 02 also needs to add `activeTab: string`, `onTabChange: (tab: string) => void` to `ProspectSheetProps` and lift `sheetTab` state into `TerritoryPlanner.tsx`.
- ProspectSheet now has a clean `sheetContent` block — Plan 02 can wrap that in `<Tabs>` without fighting the wrapper component.
- Plan 03 (TerritoryPlanner decomposition) is unaffected by this plan and unblocked.

---
*Phase: 03-component-decomposition-ux-polish*
*Completed: 2026-04-24*
