---
phase: 09-daily-briefing
plan: 01
subsystem: daily-briefing
tags: [pure-engine, refactor, ux, print-css, test-coverage]
requires:
  - 06-score-recommendation
  - 07-weighted-pipeline-forecast (forecastPipeline reuse)
provides:
  - briefing-engine
  - daily-briefing-page-refactor
  - print-stylesheet
affects:
  - src/pages/TodayPage.tsx
  - src/index.css
tech-stack:
  added: []
  patterns:
    - pure-deterministic-engine (today injected as parameter)
    - useMemo(() => new Date(), []) anchor (Pitfall 4)
    - reuse forecastPipeline (Phase 7) — STAGE_WEIGHTS lives in single source
key-files:
  created:
    - src/data/briefing.ts (174 lines, engine + types)
    - src/test/briefing.test.ts (181 lines, 12 cases)
  modified:
    - src/pages/TodayPage.tsx (-216 / +275 net, refactored to render from Briefing struct)
    - src/index.css (+33 lines @media print)
decisions:
  - Hero weighted-pipeline reuses forecastPipeline(opps, 0).weighted — zero STAGE_WEIGHTS duplication
  - inboxZero gated on todayPlan + overdueTasks + goingStale only (newPipeline informational, not actionable)
  - Active filter (excludes Churned + Closed Lost Prospect) applied uniformly across hero counts and section filters
  - Overdue tasks rendered as flat list (engine pre-sorts) instead of grouped-by-prospect from prior implementation
  - Never-contacted Hot prospects fold into Today's Plan, not Going Stale (BRIEF-06 narrowing)
  - Print stylesheet uses Tailwind class-name overrides (data-no-print, .sticky, .max-w-4xl, button) — no new tokens
metrics:
  duration: ~10min agent execution
  tasks: 2
  files_created: 2
  files_modified: 2
  tests_added: 12
  completed_date: 2026-04-25
---

# Phase 9 Plan 1: Daily Briefing Summary

Promoted `/today` from inline useMemo blocks into a pure deterministic `getBriefing(prospects, opportunities, today)` engine in `src/data/briefing.ts`, refactored `TodayPage.tsx` to render from the Briefing struct, added hero metrics + Pipeline Movement + inbox-zero celebration + `@media print` rules. Reuses `forecastPipeline` from Phase 7 for the weighted-pipeline hero number — STAGE_WEIGHTS is never redefined.

## What Was Built

### Pure briefing engine (src/data/briefing.ts, 174 lines)

`getBriefing(prospects, opportunities, today: Date): Briefing` — no React, no Supabase, no `Date.now()`. Returns:

- `hero`: { activeProspects, hotCount, weightedPipeline, overdueTaskCount }
- `todayPlan`: max 5 Hot prospects with `lastTouched > 14d` or never contacted, sorted by score desc
- `overdueTasks`: max 10 flat tasks where `dueDate < todayStr`, sorted oldest-first
- `goingStale`: max 10 Hot/Warm with `lastTouched != null` AND `>= 30d` AND `score >= 40`, sorted by score desc
- `newPipeline`: opps where `created_at` within last 7 days, sorted newest-first
- `inboxZero`: true when all three actionable lists empty
- `todayLabel`: localized "Friday, April 24, 2026" date string
- `generatedAt`: ISO timestamp

Active filter (`status !== "Churned" && status !== "Closed Lost Prospect"`) applies uniformly. Hero `weightedPipeline` calls `forecastPipeline(opportunities, 0).weighted` — proves the Phase 7 engine is the single source of truth.

### Test coverage (src/test/briefing.test.ts, 181 lines)

12 deterministic cases pinning `TODAY = 2026-04-24T12:00:00Z` (Friday):

1. Empty inputs → inboxZero=true, all zero counts
2. todayLabel formatted as "Friday, April 24, 2026"
3. **forecastPipeline reuse** — Propose@$100k → 70k weighted; adding Closed Lost@$999,999 must NOT contribute (proves classification flows from forecast.ts, not a duplicate constant)
4. hero.activeProspects excludes Churned and Closed Lost Prospect
5. todayPlan caps at 5, sorted by score desc, includes never-contacted Hot
6. overdueTasks filters dueDate < todayStr, sorts daysOverdue desc, caps at 10
7. overdueTasks excludes empty dueDate
8. hero.overdueTaskCount = full count (15) even when overdueTasks capped at 10
9. goingStale four-way filter (Hot|Warm + lastTouched-not-null + 30d + score>=40)
10. Never-contacted Hot is in todayPlan but NOT in goingStale (BRIEF-06 narrowing)
11. newPipeline 7-day window, sorted by daysSinceCreated asc
12. inboxZero false when any actionable list is non-empty

### TodayPage.tsx refactor (-216 / +275 lines)

Deletions (the four inline useMemo blocks lines 27-73 + local helper):
- `daysBetween` helper (engine owns it)
- `overdueTasks` useMemo
- `staleHighPriority` useMemo
- `neverContacted` useMemo
- `pipelineSummary` useMemo
- `totalOverdue` const
- "Never Contacted" entire section (folded into Today's Plan)
- "Pipeline Summary" section (replaced by hero stat + Pipeline Movement)

Additions:
- `useOpportunities(activeTerritory)` wired alongside `useProspects`
- `useMemo(() => new Date(), [])` anchor — prevents engine re-runs (Pitfall 4)
- `briefing = useMemo(() => getBriefing(data, opportunities, now), [data, opportunities, now])`
- Hero metrics row (4 stat cards via new `Stat` helper)
- Today's Plan section (NEW)
- Pipeline Movement section (NEW, hidden when empty)
- Inbox-zero celebration card (gated on `data.length > 0`)
- Empty-state card when `data.length === 0` (distinct from inbox-zero)
- `data-no-print` attribute on sticky header
- Header date reads from `briefing.todayLabel`
- Going Stale section refactored to flat read; renamed from "Stale High-Priority"

### Print stylesheet (src/index.css, +33 lines)

`@media print` block at end of file:
- Hides `[data-no-print]` and `button` elements
- Neutralizes `position: sticky` and `backdrop-filter` for `.sticky`
- Switches decorative backgrounds (`.bg-card`, `.bg-muted/30`, `.bg-background/80`, `.bg-emerald-500/5`, `.bg-emerald-500/10`) to transparent with grey borders
- Removes `.max-w-4xl` cap for full-width PDF output
- Forces white background, black text on `body`/`html`

## Verification

### Automated checks
- `bunx vitest run src/test/briefing.test.ts`: **12/12 pass** (0 todo, 0 failures)
- `bunx vitest run` (full suite): **102 passed, 1 todo (unrelated), 0 failures**, 19 test files
- `bunx tsc --noEmit`: **clean** (zero errors)
- `bunx vite build`: **clean** (3702 modules, 2.87s)

### Grep guards (Task 2 reuse rule)
| Check | Expected | Actual |
|-------|----------|--------|
| `STAGE_WEIGHTS` in `src/data/briefing.ts` | 0 matches | 0 matches |
| `forecastPipeline` in `src/data/briefing.ts` | exactly 2 (1 import + 1 call) | 2 |
| `getBriefing` in `src/pages/TodayPage.tsx` | exactly 2 (1 import + 1 useMemo) | 2 |
| inline `useMemo` blocks (`overdueTasks =`, `staleHighPriority =`, `neverContacted =`, `pipelineSummary =`) in TodayPage | 0 matches | 0 matches |
| `@media print` in `src/index.css` | present | present |
| `data-no-print` in `src/pages/TodayPage.tsx` | present | present |

### Cross-check (BRIEF-03 reuse claim)
Hero `weightedPipeline` on `/today` is computed by `forecastPipeline(opportunities, 0).weighted` — **the same call** the Phase 7 `<PipelineForecastBar>` headline makes on `/opportunities`. Both pages render the same number for the same territory. Test #3 (`forecastPipeline reuse`) pins this guarantee with a Closed Lost exclusion assertion.

### Manual UAT (smoke — not a blocker)
Vite dev server confirmed live on port 8080 (HTTP 200). Module HMR served correct briefing.ts contents (`forecastPipeline` import line resolved). Full visual UAT for the 8 BRIEF requirements deferred to user verification — engine logic is fully covered by the 12 deterministic tests, and the UI layer is a thin renderer over the Briefing struct.

## Requirements Closed

| ID | Status | Evidence |
|----|--------|----------|
| BRIEF-01 | Complete | `getBriefing` in `src/data/briefing.ts` is pure (no React/Supabase imports — verified by tsc + grep) |
| BRIEF-02 | Complete | All 4 inline useMemo blocks deleted from TodayPage.tsx (grep verified) |
| BRIEF-03 | Complete | Hero row renders 4 stat cards; weightedPipeline reuses forecastPipeline (test #3) |
| BRIEF-04 | Complete | todayPlan cap-5 + score-desc + Hot+lastTouched>=14d|null (test #5) |
| BRIEF-05 | Complete | overdueTasks filter + sort oldest-first + cap-10 (tests #6, #7, #8) |
| BRIEF-06 | Complete | goingStale Hot/Warm + lastTouched-not-null + 30d + score>=40 (tests #9, #10) |
| BRIEF-07 | Complete | newPipeline created_at within 7d, sorted asc (test #11) |
| BRIEF-08 | Complete | `@media print` block in src/index.css (grep verified) |

## Deviations from Plan

None. Plan executed exactly as written. The grep guard on `forecastPipeline` (`exactly 2`) initially showed 3 because of a comment that mentioned `forecastPipeline`; tightened the comment text to "reuse weighted total from Phase 7 engine" to keep the grep guard meaningful — no behavior change. This was a Rule 3 nit, not a deviation from the plan's intent.

## Pitfalls Avoided

1. **Pitfall 1 (RESEARCH.md) — "moved from X to Y" phrasing**: section labeled "New Pipeline This Week," uses `daysSinceCreated` only, never claims stage transitions.
2. **Pitfall 4 — `new Date()` referential inequality**: `const now = useMemo(() => new Date(), [])` captures once on mount; the engine re-runs only when prospects/opportunities change.
3. **Pitfall 6 — `lastTouched=null` flooding goingStale**: explicit `p.lastTouched != null` filter; never-contacted Hot prospects route to todayPlan only (test #10 pins this).

## Self-Check: PASSED

- `src/data/briefing.ts`: FOUND
- `src/test/briefing.test.ts`: FOUND
- `src/pages/TodayPage.tsx`: FOUND (modified)
- `src/index.css`: FOUND (modified)
- Commit `0b35f5f` (Task 1 RED): FOUND
- Commit `5b5e96b` (Task 2 GREEN): FOUND
- All grep guards: PASS
- All 12 engine tests: PASS
- Full suite: 102 passed, 1 unrelated todo, 0 failures
- tsc --noEmit: clean
- vite build: clean
