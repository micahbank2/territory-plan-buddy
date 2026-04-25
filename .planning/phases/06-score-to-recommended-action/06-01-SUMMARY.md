---
phase: 06-score-to-recommended-action
plan: 01
subsystem: ProspectSheet / recommendation engine
tags: [rec, score, prospect-sheet, tdd]
requires:
  - src/data/prospects.ts (scoreProspect, getScoreLabel, Prospect interface)
  - src/components/territory/agingHelpers.ts (date-math pattern)
provides:
  - src/data/recommendation.ts — pure getRecommendation(p) -> Recommendation
  - src/components/RecommendationCard.tsx — Overview-tab "why call this account" block
affects:
  - src/components/ProspectSheet.tsx (mount + inline whyActParts removed)
tech-stack:
  added: []
  patterns:
    - Pure-TS deterministic templating (no LLM, no async, no side effects)
    - Severity-sorted callouts with cap-3
    - Math.floor((Date.now() - latestMs) / 86400000) — mirrors agingHelpers.ts:6 to avoid UTC drift
key-files:
  created:
    - src/data/recommendation.ts (235 lines)
    - src/components/RecommendationCard.tsx (75 lines)
    - src/test/recommendation.test.ts (212 lines, 14 tests)
    - src/test/RecommendationCard.test.tsx (43 lines, 3 tests)
  modified:
    - src/components/ProspectSheet.tsx (+3 lines: 1 import + 2 mount lines; -25 lines: whyActParts memo + its render)
decisions:
  - Engine returns a plain object; the card wraps the call in useMemo([prospect]) so only the card re-renders
  - Competitor severity map hard-codes SOCi/Birdeye/Reputation.com as warn; all others (including stripped "Other: X") default to info
  - Header score number + label + breakdown tooltip preserved; only the amber whyActParts paragraph beneath the score was removed
  - "Hot + 14d stale" → going-cold wins over stale-30 (exclusive chain), preventing duplicate staleness chips
metrics:
  duration: ~6min
  completed: 2026-04-24
requirements: [REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07]
---

# Phase 06 Plan 01: Score → Recommended Action Summary

Promoted the inline `whyActParts` block in ProspectSheet.tsx into a tested, dedicated `RecommendationCard` mounted at the top of the Overview tab, backed by a pure `getRecommendation()` engine with 17 passing tests covering staleness thresholds, contact-coverage gaps, competitor normalization, severity capping, and suggested-action templates.

## Changes

### New files

- **`src/data/recommendation.ts`** (235 lines, 0 React imports) — pure deterministic engine exporting `CalloutSeverity`, `CalloutKind`, `Callout`, `Recommendation`, and `getRecommendation(p)`. Mirrors `agingHelpers.ts:6` date math (`Math.floor((Date.now() - latestMs) / 86400000)`) to avoid the Phase 05 UTC drift bug. Internal helpers `buildCompetitorCallout` (strips `"Other: "` prefix, silent on `Yext`/`Unknown`/empty) and `buildSuggestedAction` (12-step template chain, first match wins).

- **`src/components/RecommendationCard.tsx`** (75 lines) — read-only React card rendering: Target icon + "Why call this account" header + score/label (right-aligned), severity-colored chip row (hidden when empty), and suggested-action paragraph. Uses only existing tokens (`border-border`, `bg-card/40`, `backdrop-blur-sm`, `bg-destructive/15`, `bg-amber-500/15`, `bg-muted`). `compact` prop shrinks padding + font for mobile Drawer.

- **`src/test/recommendation.test.ts`** (212 lines, 14 tests) — table-driven Vitest suite under fixed system time (`vi.useFakeTimers().setSystemTime(new Date("2026-04-24"))`). Cases: hot-not-started critical, missing-decision-maker at score 60+, never-contacted critical at score 40+, 90+ day stale with day count, Hot + 14d going-cold (not stale-30), Cold + score 60+ high-potential, competitor Yext/Unknown silent, `"Other: PowerListings"` → `"On PowerListings"` info, `"SOCi"` → warn, cap-3 on 4+ candidates, Meeting Booked action, never-contacted gated by score >= 40, Customer status info chip.

- **`src/test/RecommendationCard.test.tsx`** (43 lines, 3 tests) — render smoke. Hot + Not Started + SOCi asserts "Hot, not started" chip + action sentence; ideal prospect mounts without crashing; `compact` prop mounts without crashing.

### Modified

- **`src/components/ProspectSheet.tsx`** — added `import { RecommendationCard } from "@/components/RecommendationCard";`; mounted `<RecommendationCard prospect={prospect} />` as first child of `<TabsContent value="overview">`; deleted the `whyActParts` `useMemo` (was 20 lines) and its amber-paragraph render inside the header score block (was 5 lines). Header score number + label + score-breakdown tooltip preserved. Net ~22-line reduction in ProspectSheet body.

## Verification

### Automated

- `bunx vitest run src/test/recommendation.test.ts src/test/RecommendationCard.test.tsx` → **17 passed, 0 failed**
- `bunx vitest run` (full suite) → **66 passed, 1 pre-existing todo, 0 failed** across 14 test files
- `bunx tsc --noEmit` → clean
- `bunx vite build` → clean (2.89s, 2039 kB bundle — no size regression attributable to this plan)
- `rg -n whyActParts src/` → **zero matches** (REC-07)
- `rg -n "<RecommendationCard" src/components/ProspectSheet.tsx` → **exactly 1 match** at line 528 (REC-01)

### Manual UAT (flagged — dev server running on :8080 for visual confirmation)

| Step | Req | Expected | Status |
|------|-----|----------|--------|
| Open app → click any prospect → Overview tab | REC-01 | RecommendationCard renders at top, above Account Details | PENDING visual |
| Open Hot + Not Started prospect | REC-03 | "Hot, not started" critical chip + "start a first-touch sequence today" action | PENDING visual |
| Open prospect with 90+ day stale interaction | REC-04 | stale-90 chip with day count; action mentions "re-engagement" | PENDING visual |
| Open prospect with `competitor="Other: PowerListings"` | REC-05 | `"On PowerListings"` info chip (prefix stripped) | PENDING visual |
| Open prospect with `competitor="Yext"` | REC-05 | No competitor chip | PENDING visual |
| Header score + label still visible; no amber paragraph beneath it | REC-07 | Confirmed via render test + grep | PASSED |
| Mobile viewport (<768px) — Drawer wraps card cleanly | REC-06 | Chips wrap on narrow widths via `flex flex-wrap gap-1.5` | PENDING visual |

## Deviations from Plan

None — plan executed as written. The suggested-action template for `missing-decision-maker` includes the raw `p.competitor` string (not the stripped display form) since the action sentence is about the competitive pressure, not the chip label; this matches the planner's spec verbatim.

## Known Stubs

None. The engine is fully implemented, the card is fully wired, and inline `whyActParts` is deleted. No data stubs, no placeholder props, no "coming soon" text.

## Pitfalls Encountered

- **UTC drift (pre-empted):** Phase 05's SUMMARY flagged the `new Date('yyyy-MM-dd')` UTC drift bug. Engine avoids it by mirroring `agingHelpers.ts:6` exactly — `Math.floor((Date.now() - Math.max(...ms)) / 86400000)` — keeping both sides in UTC ms. All 14 engine tests pass under fixed system time without flake.
- **Defensive `|| []`:** applied to both `contacts` and `interactions` at engine entry so a Prospect arriving mid-optimistic-update (with undefined arrays for one frame) doesn't crash.
- **"Other: " prefix:** Phase 03's inline-edit allows free-text competitor values like `"Other: PowerListings"`. Engine strips the prefix for display while keeping the raw string in the `suggestedAction` copy template (for `missing-decision-maker` sentence).

## Self-Check: PASSED

Verified created files and commits:

- [x] `src/data/recommendation.ts` — FOUND (235 lines)
- [x] `src/components/RecommendationCard.tsx` — FOUND (75 lines)
- [x] `src/test/recommendation.test.ts` — FOUND (212 lines)
- [x] `src/test/RecommendationCard.test.tsx` — FOUND (43 lines)
- [x] ProspectSheet.tsx contains `<RecommendationCard` — FOUND at line 528
- [x] ProspectSheet.tsx contains no `whyActParts` — CONFIRMED via grep
- [x] Task 1 commit (250ad48 test(06-01): scaffold...) — FOUND in git log
- [x] Task 2 commit (26062a0 feat(06-01): mount...) — FOUND in git log
