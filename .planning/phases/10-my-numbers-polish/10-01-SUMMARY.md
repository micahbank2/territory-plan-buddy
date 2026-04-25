---
phase: 10-my-numbers-polish
plan: 01
subsystem: my-numbers
tags: [refactor, tests, comp-math, real-money, storage-extraction, accessibility]
requires: [phase-08-complete]
provides:
  - "src/data/myNumbers/storage.ts as single source of truth for FY27 month list, default quota schedule, default comp settings, default add-ons, all three localStorage keys, NumbersEntry/CompSettings/AddOns types, and loadEntries/loadSettings/loadAddOns readers"
  - "src/data/myNumbers/comp.ts as pure deterministic commission math engine (zero React, zero localStorage, zero DOM, zero clock reads)"
  - "29 regression-tested boundary cases for comp math + storage migration"
  - "Render-pure non-owner gate using useEffect (eliminates React 19 StrictMode hazard)"
  - "EditableCell aria-label support with keyboard activation on the display span"
affects:
  - src/pages/MyNumbersPage.tsx (875 -> 646 lines, -229 lines, -26%)
  - src/components/QuotaHeroBoxes.tsx
  - src/components/PipelineForecastBar.tsx
  - src/hooks/useTerritoryPlannerSelectors.ts
tech-stack:
  added: []
  patterns: [pure-engine + UI shell separation (mirrors Phase 07 forecast.ts), tests-first RED -> GREEN, single-source-of-truth storage extraction, useEffect-based auth redirect]
key-files:
  created:
    - src/data/myNumbers/storage.ts
    - src/data/myNumbers/comp.ts
    - src/test/myNumbers/comp.test.ts
    - src/test/myNumbers/storage.test.ts
  modified:
    - src/pages/MyNumbersPage.tsx
    - src/components/QuotaHeroBoxes.tsx
    - src/components/PipelineForecastBar.tsx
    - src/hooks/useTerritoryPlannerSelectors.ts
decisions:
  - "Tests-first (RED -> GREEN) on pure comp math because the engine computes real personal compensation and had zero existing tests; landed 29 active cases before any function moved out of MyNumbersPage"
  - "Both comp + storage modules in a single src/data/myNumbers/ directory rather than top-level (mirrors RESEARCH.md recommended structure and keeps Plan 10-02 sub-component decomposition aligned)"
  - "Span gets role=button + tabIndex=0 + Enter/Space keyboard handlers as part of NUM-08 — the visual stays identical, but screen-reader and keyboard users now reach the cell. Acts as a small a11y bonus over the strict NUM-08 must-have."
  - "Two render-pure null guards (if (!user) return null; if (!OWNER_EMAILS.includes(...)) return null;) added after the useEffect; the useEffect handles the actual redirect after commit, the guards prevent any flash of MyNumbersPage content for non-owners"
  - "useTerritoryPlannerSelectors's inline DEFAULT_SETTINGS lacked renewalAbove100Rate; the shared one is a superset. Spread-into-merge consumers are unaffected — no fix needed."
metrics:
  duration: ~25min
  completed: 2026-04-25
  commits: 4
  tests-added: 29
  lines-deleted-from-page: 229
  lines-added-to-shared-modules: ~360
---

# Phase 10 Plan 01: My Numbers Foundation — Tests, Storage, Comp Math Summary

Tests-first extraction of six pure commission-math functions and the FY27 storage layer out of the 875-line MyNumbersPage god-file into two tested shared modules — landing 29 regression-tested boundary cases for real-money math, fixing a navigate-in-render React 19 StrictMode hazard, propagating the shared storage module to three sister callers (QuotaHeroBoxes, PipelineForecastBar, useTerritoryPlannerSelectors), and adding aria-label support + keyboard activation to EditableCell.

## What Was Built

### Two new pure modules
- `src/data/myNumbers/storage.ts` (137 lines) — single source of truth for `NumbersEntry` / `CompSettings` / `AddOns` types, FY27 month list, default quota schedule, default comp settings, default add-ons, three localStorage keys, and the three storage readers (loadEntries with legacy `my_numbers` migration path preserved, loadSettings with shallow-merge, loadAddOns with shallow-merge).
- `src/data/myNumbers/comp.ts` (174 lines) — pure deterministic commission math engine. All six functions copied verbatim from MyNumbersPage.tsx:96-225 with explicit return-type annotations: `calcIncrementalForMonth`, `calcAnnualAccel`, `calcRenewalForMonth`, `renewalPayoutPct`, `calcLargeRenewalAddon`, `calcAddOnPayouts`. Zero React imports, zero localStorage reads, zero clock reads, zero side effects.

### Two new test suites
- `src/test/myNumbers/comp.test.ts` (24 active tests):
  - calcIncrementalForMonth: zero-bookings baseline, tier1 boundary ($307,500 fills tier1 exactly), tier2 boundary ($461,250 cumulative crosses tier1Cap), tier3 boundary ($700,000 cumulative crosses tier2Cap), YTD-accelerator OFF, YTD-accelerator ON (3% of this month's bookings)
  - calcAnnualAccel: 0 below 100%, 8% in (100%, 125%], 10% in (125%, 150%], 12% above 150%
  - renewalPayoutPct: 0 -> 0; 50% -> 25%; 75% -> 50%; 100% -> 100%; 150% -> clamp to 200%
  - calcLargeRenewalAddon: 0 when U4R < $1.5M, 0 when retention < target, 0.5% × renewed when both gates pass
  - calcAddOnPayouts: multi-year duration ≤12 → renewal/incremental zero, multi-year >12 → 0.5% renewal + 5% incremental, services 5%, Kong delta clamps to 0 when blendedAcv ≥ exitAcv, Kong delta × baseICR when exitAcv > blendedAcv
  - calcRenewalForMonth: zero-baseline
- `src/test/myNumbers/storage.test.ts` (5 active tests):
  - loadEntries empty → 12 fresh DEFAULT_QUOTAS-shaped entries
  - loadEntries hydrated → returns parsed JSON verbatim
  - loadEntries legacy migration → `my_numbers` key with `quota`/`closedAcv` correctly maps to `incrementalQuota`/`incrementalBookings` and writes to ENTRIES_KEY
  - loadSettings empty → DEFAULT_SETTINGS
  - loadSettings partial → shallow-merges with DEFAULT_SETTINGS

### Edits to MyNumbersPage.tsx (875 → 646 lines, -229 lines, -26%)
- Deleted: 3 type interfaces, 4 constant blocks (FY27_MONTHS, DEFAULT_QUOTAS, DEFAULT_SETTINGS, DEFAULT_ADDONS), 3 storage keys, 3 storage readers, 6 commission math functions
- Replaced with imports from `@/data/myNumbers/storage` and `@/data/myNumbers/comp`
- **NUM-04 (navigate-in-render fix):** non-owner redirect moved into a `useEffect`; render returns null while redirect is pending via two parallel render-pure guards (`if (!user) return null; if (!OWNER_EMAILS.includes(...)) return null;`)
- **NUM-08 (EditableCell aria-label):** `ariaLabel` prop forwarded to both `<input>` (when editing) and `<span>` (when displaying). Span also gets `role="button"`, `tabIndex={0}`, and Enter/Space keyboard activation. All 5 callsites pass meaningful labels: `Quota for {Mar 2026}`, `Bookings for {Mar 2026}`, `Meetings for {Mar 2026}`, `Outreach touches for {Mar 2026}`, `Renewed ACV for {Mar 2026}`.
- **NUM-06 (text-[10px] fix):** the lone arbitrary text-size violation at MyNumbersPage.tsx:722 replaced with `text-xs`
- **Dead-code cleanup:** the shadow `FY27_MONTHS` array inside the renewal-tab IIFE deleted — it now references the imported one

### Edits to three sister callers
- `src/components/QuotaHeroBoxes.tsx`: deletes inline `NumbersEntry` interface, `ENTRIES_KEY`, `FY27_MONTHS`, `DEFAULT_QUOTAS`, and inline `loadEntries`. Imports the shared `FY27_MONTHS` and `loadEntries` from `@/data/myNumbers/storage`. Local `ANNUAL_QUOTA = 615_000`, `ANNUAL_TI = 95_000`, `INCR_TI` left in place — those drive the local `calcPayout` helper and are out of scope for storage extraction.
- `src/components/PipelineForecastBar.tsx`: deletes inline `ENTRIES_KEY`, `FY27_MONTHS`, `DEFAULT_QUOTAS`. Imports them from shared storage. `loadAnnualQuota` body unchanged — it now references the imported names.
- `src/hooks/useTerritoryPlannerSelectors.ts`: hoists `FY27_MONTHS` + `DEFAULT_QUOTAS` + `DEFAULT_SETTINGS` imports to module scope; deletes inline copies inside `useQuotaSummary` useMemo callback.

## Drift Discovered Between the Four Duplicate Copies

Audit of the 4 copies before extraction:

| Location | FY27_MONTHS | DEFAULT_QUOTAS | DEFAULT_SETTINGS | loadEntries |
|----------|-------------|----------------|------------------|-------------|
| MyNumbersPage.tsx | full 12 months | full 12 months | full 7-field shape | full (with migration + try/catch fallback) |
| QuotaHeroBoxes.tsx | full 12 months | full 12 months | n/a (uses local ANNUAL_QUOTA/ANNUAL_TI) | minimal (try/return; no migration; no catch fallback) |
| PipelineForecastBar.tsx | full 12 months | full 12 months | n/a | inline `loadAnnualQuota` (specialized, kept) |
| useTerritoryPlannerSelectors.ts | full 12 months | full 12 months | **6 fields only** (missing `renewalAbove100Rate`) | n/a (does its own JSON.parse) |

**Drift findings:**
1. **DEFAULT_SETTINGS shape drift in useTerritoryPlannerSelectors:** the inline copy was missing `renewalAbove100Rate: 0.08`. Resolution: the shared `DEFAULT_SETTINGS` is a superset; the consumer uses spread-into-merge so the new field is silently included with no behavior change.
2. **loadEntries fallback drift in QuotaHeroBoxes:** the inline `loadEntries` had a `try/return` only — no migration check, no in-`catch` fallback. The shared `loadEntries` is a strict superset (it does both). Behavior change is benign: if a user has the legacy `my_numbers` key with no `my_numbers_v2` key, QuotaHeroBoxes will now correctly migrate (instead of showing a fresh-start UI). All other paths are identical.
3. **No drift in FY27_MONTHS or DEFAULT_QUOTAS:** all 4 copies were byte-identical. Pure copy-paste, zero divergence.

The single-source-of-truth grep gates are now hard:
- `grep -rEn "^const FY27_MONTHS = \[" src/` → 0 matches (was 4)
- `grep -rEn "^export const FY27_MONTHS" src/` → 1 match (storage.ts)
- `grep -rEn "^const DEFAULT_QUOTAS" src/` → 0 matches (was 4)
- `grep -rEn "^export const DEFAULT_QUOTAS" src/` → 1 match (storage.ts)

## Comp Math Regression Coverage

The 29 tests act as a regression-tested boundary on real-money math. Manually verified expected values against MyNumbersPage.tsx:96-225 source for ≥3 hand-calculated cases:

- **Tier 1 boundary:** `307_500 * (95_000 * 0.65 * 0.4) / 307_500 = 24_700`. Test asserts `expect(baseCommission).toBeCloseTo(24_700, 0)`.
- **renewalPayoutPct(1.0):** `att=100 → (50 + 25*2.0) / 100 = 1.00`. Test asserts `toBeCloseTo(1.0, 5)`.
- **Kong delta clamp:** `max(0, exitAcv 50_000 - blendedAcv 60_000) = 0`. Test asserts `kong === 0`.

All passed first try after the GREEN extraction — high confidence the verbatim move did not introduce drift.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` blocks were precise enough that no Rule-1/2/3 deviations were needed. The only "extra" decision was adding a Span keyboard handler (Enter/Space) on top of the strict NUM-08 must-have — a small a11y bonus that costs ~3 lines and matches the React `role="button"` semantics the plan asked for.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired components. The page renders identically to its pre-refactor state with the same data sources.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Plan tests pass | `bunx vitest run myNumbers` | ✅ 29 passed (24 comp + 5 storage) |
| Full suite passes | `bunx vitest run` | ✅ 119 passed, 1 todo, 1 skipped |
| Type-check | `bunx tsc --noEmit` | ✅ clean |
| Production build | `bun run build` | ✅ clean |
| FY27_MONTHS sources | `grep -rEn "^const FY27_MONTHS = \[" src/` | ✅ 0 (only the export in storage.ts) |
| DEFAULT_QUOTAS sources | `grep -rEn "^const DEFAULT_QUOTAS" src/` | ✅ 0 |
| text-[10px] in MyNumbersPage | `grep -n "text-\[10px\]" src/pages/MyNumbersPage.tsx` | ✅ 0 |
| calc functions in MyNumbersPage | `grep -nE "function (calcIncremental\|calcAnnualAccel\|calcRenewal\|renewalPayoutPct\|calcLargeRenewalAddon\|calcAddOnPayouts)"` | ✅ 0 |
| navigate inside useEffect | confirmed by sed at lines 115-120 | ✅ 1 match, inside `useEffect(() => { ... }, [user, navigate])` |
| Page line count | `wc -l src/pages/MyNumbersPage.tsx` | 646 (was 875) |

## Open Follow-ups for Plan 10-02

These items were observed during the foundation pass but are out of scope here:

- **renewalPayoutPct branch coverage above 100%:** the test suite covers 0 / 50 / 75 / 100 / 150 (clamp). Consider adding 101% (just-over) and 110% (mid-range) cases when the branch becomes visible in the Trends tab.
- **F13 from RESEARCH.md (EditableCell parseInt → 0 silent coercion):** at MyNumbersPage.tsx:312-313, fat-fingering "abc" silently overwrites the previous value with 0. This is a data-loss path. Plan 10-02's sub-component decomposition will lift EditableCell into `src/components/myNumbers/EditableCell.tsx`, at which point a `Number.isNaN(parsed) ? value : parsed` guard is the natural fix.
- **F8 from RESEARCH.md (OWNER_EMAILS not shared with useProspects.ts):** drift risk between the two owner checks. Out of scope for Phase 10; flag for v2.
- **Loading-migration silently:** `loadEntries` migrates the legacy `my_numbers` key but never logs the migration. If JSON parsing fails silently the user sees a fresh-start UI with $0 everywhere. Out of scope (no telemetry layer in Phase 10).
- **Sub-component decomposition (NUM-07):** the page is now 646 lines. NUM-07 targets ≤400 lines; that's Plan 10-02's job (extract IncrementalTable, RenewalTable, AddonsSection, EarningsSummary, MyNumbersChart, SettingsDialog, SummaryCardRow plus the new MyNumbersTrendsTab).
- **Trends tab (NUM-05):** unbuilt. Plan 10-02 will add three vertically stacked recharts visualizations (Quota Attainment %, Activity Rate, Pipeline Coverage).

## Self-Check: PASSED

Files verified to exist:
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/data/myNumbers/storage.ts` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/data/myNumbers/comp.ts` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/test/myNumbers/comp.test.ts` ✅
- `/Users/micahbank/territory-plan-buddy/.claude/worktrees/bold-ritchie-621340/src/test/myNumbers/storage.test.ts` ✅

Commits verified to exist (`git log --oneline`):
- b78ec5a `test(10-01): add comp + storage test scaffolds with stub modules (RED)` ✅
- 6b9b093 `feat(10-01): implement comp + storage modules verbatim from MyNumbersPage (GREEN)` ✅
- 89ce8f5 `refactor(10-01): wire MyNumbersPage to shared comp + storage modules` ✅
- d18956a `refactor(10-01): wire 3 sister callers to shared myNumbers/storage module` ✅
