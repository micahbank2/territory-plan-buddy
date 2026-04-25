---
phase: 10-my-numbers-polish
plan: 02
subsystem: my-numbers
tags: [trends-tab, recharts, component-decomposition, ux-polish, refactor]
requires: [10-01-complete]
provides:
  - "src/components/myNumbers/MyNumbersTrendsTab.tsx — three vertically stacked recharts (Quota Attainment %, Activity Rate, Pipeline Coverage) closing CLAUDE.md priority #10"
  - "src/components/myNumbers/{IncrementalTab,RenewalTab,SummaryCardRow,AddonsSection,EarningsSummary,MyNumbersChart,SettingsDialog,EditableCell}.tsx as props-driven sub-components"
  - "MyNumbersPage.tsx coordinator slimmed to 297 lines (target ≤400) — owns state, memos, callbacks, owner gate; sub-components are pure presentation"
  - "ResizeObserver polyfill in src/test/setup.ts so any future recharts-based component tests run cleanly under jsdom"
affects:
  - src/pages/MyNumbersPage.tsx (646 -> 297 lines, -349 lines, -54%)
  - src/test/setup.ts
tech-stack:
  added: []
  patterns:
    - "Coordinator + props-driven sub-components (Phase 03 UX-04 precedent)"
    - "Recharts ResponsiveContainer + LineChart + ReferenceLine for trend visualizations"
    - "Test environment polyfill (ResizeObserver) to support recharts under jsdom"
key-files:
  created:
    - src/components/myNumbers/MyNumbersTrendsTab.tsx
    - src/components/myNumbers/SummaryCardRow.tsx
    - src/components/myNumbers/IncrementalTab.tsx
    - src/components/myNumbers/RenewalTab.tsx
    - src/components/myNumbers/AddonsSection.tsx
    - src/components/myNumbers/EarningsSummary.tsx
    - src/components/myNumbers/MyNumbersChart.tsx
    - src/components/myNumbers/SettingsDialog.tsx
    - src/components/myNumbers/EditableCell.tsx
    - src/test/myNumbers/MyNumbersTrendsTab.test.tsx
  modified:
    - src/pages/MyNumbersPage.tsx
    - src/test/setup.ts
decisions:
  - "Two commits, not nine — Task 1 lands the new Trends tab + 7 typed-stub sub-components in one commit; Task 2 lands all 7 GREEN implementations + coordinator slim-down in one commit. Per-sub-component commits would have been cleaner for review but the plan said 'if possible'; the type contracts on every stub kept the GREEN commit safe and reviewable as a single unit (full vitest suite + tsc + build green)."
  - "Dropped the unused `settings` prop from MyNumbersTrendsTab signature (YAGNI per the plan's recommendation) — chart math only needs entries + pipelineByMonth + incrementalCalcs"
  - "Polyfilled ResizeObserver in src/test/setup.ts (Rule 3 deviation) — recharts' ResponsiveContainer needs ResizeObserver and jsdom does not provide one. Added once globally so any future recharts component tests work without per-test workarounds."
  - "EditableCell extracted into its own file rather than passed by reference between tabs — both IncrementalTab and RenewalTab import it. Mirrors how shadcn/ui leaves shared cells in dedicated files. Closed RESEARCH.md decomposition order suggestion 1 (leaf first)."
  - "Local fmt/pct/formatMonth helpers duplicated into the 4 sub-components that need them rather than exported from storage.ts — keeps sub-components self-contained and matches the 'sub-components do not own shared math' boundary while not exposing presentation helpers in the data layer. Cost: ~8 lines duplicated; benefit: clear separation."
metrics:
  duration: ~5min
  completed: 2026-04-25
  commits: 2
  tests-added: 3
  lines-deleted-from-page: 349
  lines-added-to-sub-components: 1136
  page-line-count: 297
---

# Phase 10 Plan 02: My Numbers Trends Tab + Decomposition Summary

Closes CLAUDE.md priority #10 ("Quota attainment, activity rate, pipeline coverage tracked over time") by adding a Trends tab with three vertically stacked recharts visualizations, and decomposes the now-646-line MyNumbersPage into a 297-line coordinator + 9 props-driven sub-components in `src/components/myNumbers/`. Wraps Phase 10 — all 8 NUM-* requirements are now closed.

## What Was Built

### New Trends tab (NUM-05)

`src/components/myNumbers/MyNumbersTrendsTab.tsx` (186 lines) — wired into MyNumbersPage as a third TabsTrigger ("Trends") next to Incremental and Renewal. Renders three vertically stacked LineCharts via recharts:

1. **Quota Attainment %** (cumulative YTD bookings ÷ cumulative YTD quota × 100): single Line on the YTD attainment percentage at each month, with a `<ReferenceLine y={100}>` dashed reference at 100%. Returns 0 when ytdQuota=0 (avoids div-by-zero).
2. **Activity Rate** (per month): dual Line on `Meetings` (solid primary) + `Touches` (dashed muted). Both are counts on a shared y-axis — no second yAxis (per RESEARCH.md Pitfall 4).
3. **Pipeline Coverage** (monthly pipeline ÷ monthly quota): single Line on the per-month coverage ratio, with a `<ReferenceLine y={3}>` dashed reference at 3x target (per RESEARCH.md Open Question #3 / sales-ops standard). Returns 0 when monthly quota=0.

Each chart is a `<ResponsiveContainer width="100%" height={220}>` inside a `rounded-lg border border-border p-5 bg-card` panel, mirroring the existing Bookings vs Quota chart pattern (`MyNumbersChart.tsx`).

### Coordinator decomposition (NUM-07)

The 646-line MyNumbersPage was sliced into 9 props-driven sub-components:

| Sub-component | Lines | Role |
|---------------|-------|------|
| `SummaryCardRow.tsx` | 134 | 4-card summary row at top of page (Incremental, Renewal, Earnings, Pace) + internal `SummaryCard` helper |
| `IncrementalTab.tsx` | 164 | Incremental ACV tab content — full Table with EditableCell rows + totals row |
| `RenewalTab.tsx` | 210 | Renewal ACV tab content — quarter-grouped Table with expand/collapse + large-renewal-addon callout |
| `MyNumbersTrendsTab.tsx` | 186 | NEW: 3 trend charts (above) |
| `AddonsSection.tsx` | 140 | Add-ons & SPIFFs toggle + 3-column input cards (Multi-Year, 1x Services, Kong) |
| `EarningsSummary.tsx` | 71 | FY27 Total Variable Compensation rollup card |
| `MyNumbersChart.tsx` | 52 | Existing Bookings vs Quota chart |
| `SettingsDialog.tsx` | 110 | Comp Plan Settings modal + internal `SettingsField` helper |
| `EditableCell.tsx` | 69 | Inline-edit cell (used by both Incremental and Renewal tabs) |

**Total sub-component lines:** 1,136 (vs ~349 lines deleted from page) — net delta +787 lines across the codebase, but the page is now 297 lines and every sub-component is independently readable.

The coordinator (`src/pages/MyNumbersPage.tsx`, 297 lines) now owns only:
- Imports
- `OWNER_EMAILS` constant
- All `useState` (entries, settings, addons, showSettings, showAddOns, activeTab, expandedQuarter)
- The owner-gate `useEffect` redirect (NUM-04 carry-over from 10-01)
- All `useMemo`s (pipelineByMonth, incrementalCalcs, renewalCalcs, annualAccel, largeRenewalAddon, addonPayouts, ytdTotals, chartData)
- All `useCallback`s (save, saveSettings, saveAddOns, updateEntry)
- Two render-pure null guards (`if (!user) return null;` and the OWNER_EMAILS check)
- Derived calcs (incrAttainment, renewalRetention, activeMonths, monthlyPace, projectedAnnual, projectedAttainment)
- JSX layout: header bar + `<SummaryCardRow />` + 3-tab `<Tabs>` + `<AddonsSection />` + `<EarningsSummary />` + `<MyNumbersChart />` + `<SettingsDialog />`

### Test infrastructure (incidental)

`src/test/setup.ts` was patched with a `ResizeObserver` polyfill class. recharts' `ResponsiveContainer` reads `window.ResizeObserver` and jsdom does not provide one — without the polyfill, smoke render tests on any chart component throw "ReferenceError: ResizeObserver is not defined". Added a `class ResizeObserverPolyfill { observe() {} unobserve() {} disconnect() {} }` global. Polyfill is global so any future chart-component tests work out of the box.

### Test coverage (NUM-05)

`src/test/myNumbers/MyNumbersTrendsTab.test.tsx` (95 lines, 3 active cases):
1. **Renders three chart sections** — assert `data-testid="trends-attainment"`, `"trends-activity"`, `"trends-coverage"` are all in the document
2. **Renders chart headers** — assert "Quota Attainment", "Activity Rate", "Pipeline Coverage" headers appear
3. **Does not crash on zero quotas** — passes a NumbersEntry with `incrementalQuota: 0` and a non-zero pipeline value; assert `render()` does not throw (covers the div-by-zero guard on the Coverage chart)

Test factory helpers (`makeEntries`, `makeIncrementalCalcs`) reuse `FY27_MONTHS` + `DEFAULT_QUOTAS` from the shared storage module — single source of truth maintained.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking test infra] Polyfill ResizeObserver in jsdom test environment**
- **Found during:** Task 1 first vitest run
- **Issue:** `MyNumbersTrendsTab` smoke test threw "ReferenceError: ResizeObserver is not defined" when rendering recharts `ResponsiveContainer` under jsdom. Without a polyfill the new tests cannot pass and any future chart smoke tests inherit the same failure.
- **Fix:** Added a minimal `ResizeObserverPolyfill` class (no-op `observe`/`unobserve`/`disconnect`) and assigned it to `globalThis.ResizeObserver` in `src/test/setup.ts`. The polyfill runs for all tests so future recharts-based smoke tests do not need per-suite workarounds.
- **Files modified:** `src/test/setup.ts`
- **Commit:** `72b83b6` (bundled with Task 1's RED+wire commit since the test infra is what enables the new tests)

### Plan-Recommended Decisions

**1. Dropped `settings` prop from `MyNumbersTrendsTab`** — the plan's `<action>` block explicitly recommended dropping it (YAGNI). The component derives all chart data from `entries`, `pipelineByMonth`, and `incrementalCalcs`. If a future plan wants a target-attainment line, settings can be re-added.

**2. Two commits instead of nine** — the plan suggested per-sub-component commits "if possible". I batched all 7 sub-component implementations into a single GREEN commit because the type-contracted stubs in Task 1 made the lift safe (each sub-component's signature was already typed and tsc-checked before the GREEN commit landed). The full vitest + tsc + build run after the single commit confirmed zero regression. If a per-sub-component review trail becomes needed, the diff for any single sub-component is trivially extractable from commit `87652e0`.

## Authentication Gates

None. Plan executed without any auth-gate detours.

## Known Stubs

None. Every sub-component is wired to real data via typed props from the coordinator. `MyNumbersPage.tsx` reads localStorage on mount via `loadEntries`/`loadSettings`/`loadAddOns` (10-01 contract); writes go through `save`/`saveSettings`/`saveAddOns` callbacks. No placeholder text, no hardcoded empty values that flow to UI.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Plan tests pass | `bunx vitest run myNumbers` | ✅ 32 passed (24 comp + 5 storage + 3 trends) |
| Full suite passes | `bunx vitest run` | ✅ 122 passed, 1 todo, 1 skipped |
| Type-check | `bunx tsc --noEmit` | ✅ clean |
| Production build | `bunx vite build` | ✅ clean (built in 3.04s) |
| Page line count | `wc -l src/pages/MyNumbersPage.tsx` | ✅ 297 (target ≤400) |
| Sub-component count | `ls src/components/myNumbers/*.tsx \| wc -l` | ✅ 9 (8 plan-required + EditableCell) |
| Trends tab mounted | `grep -n "MyNumbersTrendsTab" src/pages/MyNumbersPage.tsx` | ✅ 2 matches (import + JSX mount) |
| EditableCell still works | covered by IncrementalTab + RenewalTab JSX (manual UAT pending) | – |

## Trends Tab UAT (deferred to user)

UAT is owner-only (`/my-numbers` is gated to `micahbank2@gmail.com` / `mbank@yext.com`). Manual UAT to confirm during the next dev-server session:

1. **Tab navigation:** Open `/my-numbers`, click Trends → 3 charts render
2. **Quota Attainment chart:** Hover early-FY27 months → tooltip shows attainment % (likely 0% if no bookings logged); the y=100 reference line is visible as a dashed line across the chart
3. **Activity chart:** Solid line is Meetings, dashed line is Touches; if Micah has logged meetings in March 2026, that month's solid-line value matches the Meetings cell on the Incremental tab
4. **Pipeline Coverage chart:** Y-axis labeled in `Nx` units; dashed reference line at 3x. If Micah has open Net New / Order Form deals with close dates in any FY27 month, that month's ratio = (sum of incremental_acv) ÷ (incrementalQuota for that month). Confirm the 3x target framing matches Micah's expectation; per RESEARCH.md Open Question #3 the 3x target is sales-ops standard ("3x quota cover") — flag for v2 if Micah wants this configurable.
5. **State preservation:** Edit a Mar-2026 quota cell on Incremental tab → switch to Trends → confirm Mar-2026 Attainment value updated immediately (coordinator owns state, no re-load from localStorage on tab switch)
6. **No regression:** Open Settings → change Annual TI → Done → all numbers update immediately. Edit a Bookings cell on Incremental → reload page → number persists.

## Open Follow-ups

These items are observations during this plan but are out of scope:

- **NUM-V2-01 (configurable activity targets):** The Activity chart has no target line. RESEARCH.md Open Question #1 — defer to v2 pending Micah's UAT preference.
- **NUM-V2-02 (smart-default tab when attainment <70%):** Currently always defaults to Incremental. RESEARCH.md Open Question #2 — defer.
- **NUM-V2-03 (additional Trends tests):** Current 3 tests cover smoke + zero-safety; future plans should add tests for Attainment data-shape (cumulative ratio matches calc) and Coverage data-shape (per-month pipeline ÷ quota matches input).
- **F13 from RESEARCH.md (EditableCell parseInt → 0 silent coercion):** still present in `src/components/myNumbers/EditableCell.tsx:18-19` and `:25-27`. Fat-fingering "abc" silently overwrites previous value with 0. Now that EditableCell is its own file, the natural fix is `const parsed = parseInt(draft); onChange(Number.isNaN(parsed) ? value : parsed);` — defer to v2 since 10-02 was a pure refactor commit.
- **renewalPayoutPct branch coverage above 100%:** still as in 10-01 — covers 0 / 50 / 75 / 100 / 150 (clamp). Add 101% (just-over) and 110% (mid-range) when relevant.
- **Page coordinator could go lower:** 297 lines includes the relatively long header JSX, the 8-prop SummaryCardRow mount, and the chunky JSX layout block. If future work adds another tab, consider extracting the header bar into `MyNumbersHeader.tsx` to keep room.

## Phase 10 Wrap-up

All 8 NUM-* requirements are now Complete:

| Requirement | Plan | Status |
|-------------|------|--------|
| NUM-01: comp.ts pure module | 10-01 | ✅ Complete |
| NUM-02: ≥12 comp tests | 10-01 | ✅ Complete (24 active) |
| NUM-03: shared storage.ts | 10-01 | ✅ Complete |
| NUM-04: useEffect owner gate | 10-01 | ✅ Complete |
| NUM-05: Trends tab with 3 charts | 10-02 | ✅ Complete |
| NUM-06: text-[10px] -> text-xs | 10-01 | ✅ Complete |
| NUM-07: page ≤400 lines | 10-02 | ✅ Complete (297 lines) |
| NUM-08: EditableCell aria-label | 10-01 | ✅ Complete |

**CLAUDE.md priority #10 ("My Numbers Tab — Quota attainment, activity rate, pipeline coverage tracked over time") is now closed.** All 10 priority roadmap items are now complete.

## Self-Check: PASSED

Files verified to exist:
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/MyNumbersTrendsTab.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/SummaryCardRow.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/IncrementalTab.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/RenewalTab.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/AddonsSection.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/EarningsSummary.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/MyNumbersChart.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/SettingsDialog.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/components/myNumbers/EditableCell.tsx` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/test/myNumbers/MyNumbersTrendsTab.test.tsx` ✅

Commits verified to exist (`git log --oneline`):
- `72b83b6` `feat(10-02): add Trends tab with 3 charts + scaffold sub-component stubs` ✅
- `87652e0` `refactor(10-02): decompose MyNumbersPage into 9 sub-components (646 -> 297 lines)` ✅
