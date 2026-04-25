# Phase 10: My Numbers Polish — Research

**Researched:** 2026-04-25
**Domain:** Brownfield React refactor + commission math test coverage + recharts trend visualizations
**Confidence:** HIGH

## Summary

`src/pages/MyNumbersPage.tsx` is 875 lines and houses the FY27 compensation tracker
(owner-gated to `micahbank2@gmail.com` / `mbank@yext.com`). It owns six pure commission
functions (`calcIncrementalForMonth`, `calcAnnualAccel`, `calcRenewalForMonth`,
`renewalPayoutPct`, `calcLargeRenewalAddon`, `calcAddOnPayouts`) that compute *real-money*
variable comp — and **zero of those functions have a single test** in `src/test/`. The
file also contains a `navigate("/")` call inside the render body
(`MyNumbersPage.tsx:347-350`), which is React's classic "side effect during render"
anti-pattern. The same `my_numbers_v2` localStorage shape is read from four different
files with **four duplicated copies** of `FY27_MONTHS` and `DEFAULT_QUOTAS` — schema drift
risk is high.

The CLAUDE.md priority #10 mandate is "Quota attainment, activity rate, pipeline coverage
tracked **over time**." The page currently has only one chart (Bookings vs Quota in dollars,
`MyNumbersPage.tsx:778-791`). It captures `meetings` and `outreachTouches` per month but
never visualizes them. It captures `pipelineByMonth` but only as a column total. The
extension scope is therefore well-defined: three new trend lines/charts, sourced from data
the page already collects.

**Primary recommendation:** Two-plan phase. Plan 1 = foundation (extract shared
`my-numbers/storage.ts` reader + `comp-math.ts` engine, add ≥20-case test suite, fix
navigate-in-render via `useEffect`, fix arbitrary text size). Plan 2 = extension (Trends
tab with three new recharts visualizations: Activity Rate, Pipeline Coverage, Attainment
%). Tests-first (RED) is mandatory because comp math is real money — any extraction
without tests is reckless.

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 10 (no `/gsd:discuss-phase` was run). The phase prompt and
scope are derived from the orchestrator brief and CLAUDE.md priority #10. Treat the
extension scope below as Claude's discretion subject to UAT confirmation.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NUM-01 | Pure comp-math functions extracted to `src/data/myNumbers/compMath.ts` | `MyNumbersPage.tsx:96-225` — six functions are already pure (no React, no DOM, no localStorage); extraction is a move-and-export, no logic change |
| NUM-02 | Comp-math test suite at `src/test/compMath.test.ts` (≥20 representative cases) | Tier boundaries (`MyNumbersPage.tsx:103-108`), YTD accelerator (`:142-143`), retention curve (`:190-200`), large-renewal floor (`:202-208`), Kong delta (`:210-225`) all have branch points worth testing |
| NUM-03 | Shared `src/data/myNumbers/storage.ts` module owns `FY27_MONTHS`, `DEFAULT_QUOTAS`, `loadEntries/loadSettings/loadAddOns`, `ENTRIES_KEY/SETTINGS_KEY/ADDONS_KEY`; `MyNumbersPage`, `QuotaHeroBoxes`, `PipelineForecastBar`, `useTerritoryPlannerSelectors` all import from it | 4 duplicate copies of `FY27_MONTHS` exist (`MyNumbersPage.tsx:48-52`, `QuotaHeroBoxes.tsx:17-21`, `useTerritoryPlannerSelectors.ts:159-162`, `PipelineForecastBar.tsx`); 4 duplicate copies of `DEFAULT_QUOTAS` (`MyNumbersPage.tsx:54-59`, `QuotaHeroBoxes.tsx:23-28`, `useTerritoryPlannerSelectors.ts:163-167`, `PipelineForecastBar.tsx`) |
| NUM-04 | Owner gate uses `useEffect` redirect (no navigate-in-render) | `MyNumbersPage.tsx:347-350` calls `navigate()` synchronously during render — violates React's "render must be pure" rule and triggers the dev warning "Cannot update a component while rendering a different component" |
| NUM-05 | A "Trends" tab is added next to Incremental and Renewal, containing three new charts: Activity Rate (meetings + touches per month, dual-line), Pipeline Coverage (pipeline ACV / monthly quota ratio over time), Attainment % (cumulative bookings / cumulative quota over time) | All source data already exists on the `NumbersEntry` rows (`meetings`, `outreachTouches`, `pipelineByMonth.incr.get(month)`); current chart at `:778-791` is the rendering pattern to mirror |
| NUM-06 | One arbitrary text-size violation fixed (`text-[10px]` → `text-xs`) | `MyNumbersPage.tsx:722` is the only `text-[1Npx]` arbitrary size in the file — small but consistent with quick task `260424-mn5` precedent |
| NUM-07 | Page coordinator under 400 lines after extraction | Current 875 lines minus extracted helpers (~120 lines), commission engine (~130 lines), summary card / settings field sub-components (~50 lines), Incremental/Renewal/Trends tab content (~250 lines combined) leaves ~325-line `MyNumbersPage.tsx` shell |
| NUM-08 | `EditableCell` accepts an `aria-label` prop and the table-driven editable cells pass meaningful labels (e.g., `Quota for Mar 2026`) | `MyNumbersPage.tsx:292-327` — `EditableCell` has zero a11y attributes; `<input type="number">` and `<span>` are clickable but have no accessible name for screen readers |

## Standard Stack

### Core (already installed and in active use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.4 | LineChart / dual-axis / ReferenceLine | Already used by current chart and InsightsPage |
| Vitest | ^3.2.4 | Test runner | Already used by 14 existing test files in `src/test/` |
| @testing-library/react | ^16.0.0 | Component tests | Already used (e.g., `RecommendationCard.test.tsx`) |
| shadcn Tabs | bundled | Tab navigation | Already wraps Incremental/Renewal at `MyNumbersPage.tsx:499-503` — adding a third TabsTrigger is a one-liner |

### No new libraries required
The phase is a pure refactor + test + visualization pass. Don't add anything.

## Architecture Patterns

### Recommended Module Structure
```
src/
├── data/
│   └── myNumbers/
│       ├── storage.ts       # FY27_MONTHS, DEFAULT_QUOTAS, NumbersEntry,
│       │                    # CompSettings, AddOns, ENTRIES_KEY etc.,
│       │                    # loadEntries / loadSettings / loadAddOns
│       └── compMath.ts      # calcIncrementalForMonth, calcAnnualAccel,
│                            # calcRenewalForMonth, renewalPayoutPct,
│                            # calcLargeRenewalAddon, calcAddOnPayouts
├── components/
│   └── myNumbers/
│       ├── IncrementalTable.tsx   # the Incremental tab
│       ├── RenewalTable.tsx       # the Renewal tab (with quarterly drill-down)
│       ├── TrendsCharts.tsx       # NEW: 3 charts
│       ├── AddOnsPanel.tsx        # the multi-year + services + Kong inputs
│       ├── TotalCompCard.tsx      # the "FY27 Total Variable Compensation" rollup
│       ├── SettingsDialog.tsx     # the Settings modal
│       ├── EditableCell.tsx       # the inline-edit cell
│       └── SummaryCard.tsx        # the four cards at the top
├── pages/
│   └── MyNumbersPage.tsx          # coordinator only — owner gate, state, layout
└── test/
    ├── compMath.test.ts          # NEW: ≥20 cases
    ├── myNumbers.storage.test.ts # NEW: migration + fallback paths
    └── TrendsCharts.test.tsx     # NEW: smoke render + axis assertions
```

This mirrors the precedent set by Phase 03 (component decomposition) and Phase 07
(`src/data/forecast.ts` for pure math, components separate).

### Pattern 1: Pure-engine + UI shell separation (Phase 07 precedent)
**What:** Mirror `src/data/forecast.ts` (pure, deterministic, zero React/DOM) + the
component that renders it. Comp math is even more critical than forecast math because it
is real personal compensation.

**When to use:** Always — testing the pure engine without rendering the page is the only
sane path to coverage.

**Example:**
```typescript
// Source: src/data/forecast.ts:53-83 (verified)
export function forecastPipeline(opps: Opportunity[], quota: number): Forecast {
  // ...pure, deterministic, no side effects
}
```

### Pattern 2: useEffect-based redirect for auth gates (React docs)
**What:** Move `navigate()` out of render and into `useEffect`. Keep render pure.
**Why:** Calling `navigate()` during render synchronously triggers React Router's history
push, which queues a re-render of `<Routes>` while the *current* component is still
rendering. React logs "Cannot update a component while rendering a different component."
**Example:**
```tsx
// Replace MyNumbersPage.tsx:347-350
useEffect(() => {
  if (user && !OWNER_EMAILS.includes(user.email ?? "")) {
    navigate("/", { replace: true });
  }
}, [user, navigate]);

if (!user) return null;
if (!OWNER_EMAILS.includes(user.email ?? "")) return null;
```

### Anti-Patterns to Avoid
- **Logic change inside extraction commits.** Move first, verify tests still green, then refactor. Don't combine.
- **Recomputing derived state in three places.** The current page has `incrementalCalcs`, `renewalCalcs`, `addonPayouts` already memoized — keep that contract on extraction.
- **Bumping a `text-[Npx]` arbitrary size to a different `text-[Mpx]` arbitrary size.** Use the Tailwind scale (`text-xs` = 12px). The mn5 quick task precedent (commit 40ecea5) used `text-xs` everywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-line trend chart | Custom SVG / D3 | `<LineChart>` from recharts | Already used at `MyNumbersPage.tsx:781-790`; adding a second `<Line dataKey="…" />` is the smallest possible diff |
| Dual y-axis (touches as count, attainment as %) | Hand-rolled axis math | `<YAxis yAxisId="left">` + `<YAxis yAxisId="right" orientation="right">` | Standard recharts API, supported in v2.15 |
| 100% reference line on attainment chart | Custom span overlay | `<ReferenceLine y={100}>` | Already imported at `MyNumbersPage.tsx:12` |
| Auth redirect | Hand-rolled router state | `useEffect` + `navigate(..., { replace: true })` | React Router v6 idiom, no edge cases |
| Test runner / DOM | Custom mocha config | Vitest with `src/test/setup.ts` | Already in place, 14 test files passing |

**Key insight:** every required primitive is already imported, configured, and proven.
This phase is pure additive composition.

## Common Pitfalls

### Pitfall 1: Refactor without tests = silent comp-math drift
**What goes wrong:** A six-function comp engine that has *zero* tests and computes real
personal income gets refactored. A subtle edit (e.g., extracting helpers, changing a
`Math.min` to a `Math.max`, dropping a `Math.round`) breaks payout math by 5%. The user
doesn't notice until the next pay period.
**Why it happens:** Pure functions look harmless; refactor confidence is high.
**How to avoid:** Land the test suite **before** the extraction commit. Tests-first (RED
→ extract → still GREEN). This is non-negotiable on real-money math.
**Warning signs:** "I'll add tests after" — never works.

### Pitfall 2: Inconsistent `FY27_MONTHS` between callers
**What goes wrong:** When FY28 is added, four files need to be edited. The most-likely
miss is one of `useTerritoryPlannerSelectors.ts:159-162` or `QuotaHeroBoxes.tsx:17-21`.
Result: QuotaHeroBoxes counts a different year than the table.
**Why it happens:** Copy-paste was the path of least resistance during initial Phase 10
build; nobody extracted a shared module.
**How to avoid:** Extract `src/data/myNumbers/storage.ts` and convert all four callers in
the same plan as part of NUM-03. Verify with `grep -nE "FY27_MONTHS|DEFAULT_QUOTAS"
src/` returning ≤2 hits (declaration + a single import test).

### Pitfall 3: navigate-in-render warning becomes a hard error in StrictMode
**What goes wrong:** `MyNumbersPage.tsx:347-350` works today but logs a console warning.
In React 19 StrictMode, side effects during render are run twice — `navigate()` fires
twice and the URL bar flickers; in some setups it becomes an infinite loop.
**Why it happens:** "Early return on auth fail" pattern looks correct but mutates router
state during render.
**How to avoid:** `useEffect` redirect (see Pattern 2 above).
**Warning signs:** "Cannot update a component while rendering" in dev console — already
present today.

### Pitfall 4: Dual-axis chart confuses users
**What goes wrong:** Activity Rate chart with meetings (count) + touches (count) +
attainment % all on one y-axis means percentages look like "1" next to "47" touches and
disappear.
**How to avoid:** Either keep the three new charts as **three separate `<LineChart>` blocks**
(simpler, less ambiguity), or use `yAxisId` for true dual-axis. Recommendation: three
separate charts in a vertical stack — matches the "trend over time" framing better than a
single mashed chart.

### Pitfall 5: Settings dialog refactor breaks the controlled-uncontrolled toggle
**What goes wrong:** Extracting `SettingsField` and `SettingsDialog` into separate files
and passing `settings` + `onSave` props introduces stale-closure bugs (the dialog reads
old settings).
**How to avoid:** Pass the typed `settings` value, the typed `onSave: (next: CompSettings)
=> void` callback, and an `open: boolean` + `onOpenChange` pair. Don't pass setters.

## Code Examples

### NUM-04: Owner gate via useEffect (replaces lines 347-350)
```tsx
// Source: React Router v6 docs, mirrors quick-task pattern
useEffect(() => {
  if (user && !OWNER_EMAILS.includes(user.email ?? "")) {
    navigate("/", { replace: true });
  }
}, [user, navigate]);

if (!user) return null;
if (!OWNER_EMAILS.includes(user.email ?? "")) return null;
```

### NUM-02: Tier-boundary test (representative)
```typescript
// Source: derived from MyNumbersPage.tsx:103-108 (50% / 75% / 100% tiers on $615k quota)
import { calcIncrementalForMonth } from "@/data/myNumbers/compMath";

it("pays tier 1 ICR through 50% of annual quota", () => {
  const entries = makeEntries({ "2026-02": 307_500 }); // hits exactly tier1Cap
  const result = calcIncrementalForMonth(entries, 0, DEFAULT_SETTINGS);
  // tier1Cap = 615_000 * 0.5 = 307_500
  // icr1 = (95_000 * 0.65 * 0.4) / 307_500
  expect(result.monthT1).toBe(307_500);
  expect(result.monthT2).toBe(0);
  expect(result.monthT3).toBe(0);
  expect(result.baseCommission).toBeCloseTo(24_700, 0);
});
```

### NUM-05: Activity Rate chart (new, mirrors existing pattern at :781-790)
```tsx
// Source: pattern verbatim from MyNumbersPage.tsx:781-790
const activityChartData = entries.map(e => ({
  month: formatMonth(e.month),
  Meetings: e.meetings,
  Touches: e.outreachTouches,
}));

<ResponsiveContainer width="100%" height={250}>
  <LineChart data={activityChartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
    <RechartsTooltip />
    <Line type="monotone" dataKey="Meetings" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
    <Line type="monotone" dataKey="Touches" stroke="hsl(var(--violet-500))" strokeWidth={2} dot={{ r: 3 }} />
  </LineChart>
</ResponsiveContainer>
```

## Audit Findings (current state of the page)

| # | Finding | Location | Severity | Fix in |
|---|---------|----------|----------|--------|
| F1 | `navigate("/")` called synchronously during render | `MyNumbersPage.tsx:347-350` | High (StrictMode hazard) | NUM-04 |
| F2 | 0 tests on six pure comp-math functions | `MyNumbersPage.tsx:96-225`, `src/test/` (no `compMath` file) | Critical (real money) | NUM-02 |
| F3 | `FY27_MONTHS` duplicated 4× | `MyNumbersPage.tsx:48-52`, `QuotaHeroBoxes.tsx:17-21`, `useTerritoryPlannerSelectors.ts:159-162`, plus `PipelineForecastBar.tsx` | Medium (drift risk) | NUM-03 |
| F4 | `DEFAULT_QUOTAS` duplicated 4× | same files | Medium | NUM-03 |
| F5 | 875-line single-file page | `MyNumbersPage.tsx` (entire) | Medium (Phase 03 precedent set 400-line ceiling) | NUM-01 + NUM-07 |
| F6 | `text-[10px]` arbitrary size | `MyNumbersPage.tsx:722` | Low | NUM-06 |
| F7 | `EditableCell` has no `aria-label` | `MyNumbersPage.tsx:292-327` | Medium (a11y) | NUM-08 |
| F8 | Inline `OWNER_EMAILS` not shared with `useProspects.ts` owner check | `MyNumbersPage.tsx:331` | Low (drift risk; 2 separate constants) | not in scope, log for v2 |
| F9 | `if (!user) return null` at `:434` after hooks — fine, but order with the gate at `:347` is awkward and only works because both are pure-conditional returns | `MyNumbersPage.tsx:347-350, :434` | Low | NUM-04 cleanup |
| F10 | Chart only shows dollars; no attainment % / activity rate / pipeline coverage trend | `MyNumbersPage.tsx:778-791` | High (CLAUDE.md priority #10 mandate not met) | NUM-05 |
| F11 | `loadEntries()` migrates from old `my_numbers` key but never logs the migration; if migration fails silently the user sees a fresh-start UI with $0 everywhere | `MyNumbersPage.tsx:233-274` | Low (no telemetry to validate) | not in scope; flag for monitoring |
| F12 | `pipelineByMonth` uses `opp.incremental_acv ?? opp.potential_value` for non-renewal types but uses raw `potential_value` for renewals — asymmetry between fields not documented | `MyNumbersPage.tsx:361-365` | Low (intentional, but worth a code comment) | NUM-05 cleanup (add comment) |
| F13 | `EditableCell` `parseInt(draft) \|\| 0` silently coerces "abc" to 0 — overwrites previous value when user fat-fingers | `MyNumbersPage.tsx:312-313` | Medium (data loss path) | flag for future, not in NUM-08 scope |
| F14 | No total/sanity check that `incrementalSplit + renewalSplit === 1` in Settings | `MyNumbersPage.tsx:803-804` | Low (user-input invariant) | not in scope; flag for v2 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single ~1000-line page file | Decomposed into coordinator + sub-components ≤400 lines | Phase 03 (UX-04, complete) | Sets precedent — MyNumbersPage should follow |
| Inline pipeline weighting math | Pure `forecastPipeline()` engine + UI component | Phase 07 (FORECAST-02, complete) | Sets precedent — comp math should follow same pattern |
| Inline `whyActParts` memo | Pure `getRecommendation()` engine | Phase 06 (REC-02, complete) | Sets precedent — purity + tests for any logic on the user-facing edge |
| Render-time `navigate()` for auth | `useEffect` redirect | React Router v6 standard | Required to silence StrictMode warning |

**Deprecated/outdated:**
- "I'll add tests later" pattern: not acceptable for comp math (real money)
- Copy-pasting `FY27_MONTHS` and `DEFAULT_QUOTAS` into new files: adds drift surface area

## Open Questions

1. **Should activity goals (e.g., "20 meetings/month target") be a settable target?**
   - What we know: the page captures meetings + touches but has no target line.
   - What's unclear: whether Micah wants a target line on the activity chart, or just the trend.
   - Recommendation: ship without a target in Phase 10; add a "monthly activity target"
     setting in v2 if Micah requests it during UAT.

2. **Should the Trends tab default-select if attainment is below 70%?**
   - What we know: defaultTab is "incremental" today.
   - What's unclear: whether a smart-default helps or annoys.
   - Recommendation: keep "incremental" as default — Micah opens this page to check his
     primary metric, not the trend story.

3. **Pipeline Coverage Trend math — denominator is monthly quota or annual quota?**
   - Industry standard is "weighted pipeline / quota remaining". For monthly trend:
     monthly pipeline / monthly quota gives a per-month coverage ratio (target = 3.0x).
   - Recommendation: monthly pipeline / monthly quota, with a `<ReferenceLine y={3}>` at
     3x — matches the standard sales-ops definition.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test -- compMath` (or `vitest run compMath`) |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NUM-01 | comp-math functions remain pure (importable, no side effects) | unit | `vitest run compMath -t "purity"` | ❌ Wave 0 |
| NUM-02 | tier 1/2/3 boundary cases | unit (table-driven, ≥20) | `vitest run compMath` | ❌ Wave 0 |
| NUM-02 | YTD accelerator triggers iff YTD bookings > YTD quota | unit | `vitest run compMath -t "ytdAccel"` | ❌ Wave 0 |
| NUM-02 | renewal payout curve: 50% / 75% / 100% / >100% breakpoints | unit | `vitest run compMath -t "renewalPayoutPct"` | ❌ Wave 0 |
| NUM-02 | large renewal add-on: U4R floor + retention floor | unit | `vitest run compMath -t "calcLargeRenewalAddon"` | ❌ Wave 0 |
| NUM-02 | Kong delta: clamps negative deltas to 0 | unit | `vitest run compMath -t "calcAddOnPayouts"` | ❌ Wave 0 |
| NUM-03 | `loadEntries` migrates from `my_numbers` legacy key | unit | `vitest run myNumbers.storage` | ❌ Wave 0 |
| NUM-03 | `loadSettings` merges with DEFAULT on partial JSON | unit | `vitest run myNumbers.storage -t "merge"` | ❌ Wave 0 |
| NUM-04 | Non-owner is redirected to "/" | smoke (testing-library + memoryRouter) | `vitest run MyNumbersPage` | ❌ Wave 0 |
| NUM-05 | Trends tab renders with three charts (smoke) | render | `vitest run TrendsCharts` | ❌ Wave 0 |
| NUM-05 | Activity chart points match entry data | unit | `vitest run TrendsCharts -t "activity data"` | ❌ Wave 0 |
| NUM-06 | No `text-\[\d+px\]` matches in MyNumbersPage subtree | grep gate | `! grep -rE "text-\[[0-9]+px\]" src/pages/MyNumbersPage.tsx src/components/myNumbers/` | ❌ Wave 0 |
| NUM-07 | `MyNumbersPage.tsx` ≤ 400 lines after extraction | grep gate | `[ $(wc -l < src/pages/MyNumbersPage.tsx) -le 400 ]` | ❌ Wave 0 |
| NUM-08 | EditableCell exposes `aria-label` to its `<input>` and `<span>` | render | `vitest run EditableCell -t "aria-label"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test -- compMath` (covers NUM-01, NUM-02; <5s)
- **Per wave merge:** `bun run test` (full suite green)
- **Phase gate:** Full suite green before `/gsd:verify-work`; manual UAT loads `/my-numbers`,
  edits a Mar-2026 quota and bookings, opens Trends tab, confirms three charts render.

### Wave 0 Gaps
- [ ] `src/test/compMath.test.ts` — covers NUM-01, NUM-02
- [ ] `src/test/myNumbers.storage.test.ts` — covers NUM-03
- [ ] `src/test/MyNumbersPage.test.tsx` — covers NUM-04 (smoke + redirect)
- [ ] `src/test/TrendsCharts.test.tsx` — covers NUM-05 (smoke + data shape)
- [ ] `src/test/EditableCell.test.tsx` — covers NUM-08

## Plan Breakdown Recommendation

**Two plans** (foundation + extension):

### Plan 10-01: Foundation — Tests, Storage, Comp Math
- Wave 0: failing tests for compMath, storage, EditableCell, owner-redirect
- Wave 1: extract `src/data/myNumbers/storage.ts` + `src/data/myNumbers/compMath.ts` + `src/components/myNumbers/EditableCell.tsx` + fix navigate-in-render → tests turn GREEN
- Wave 2: convert QuotaHeroBoxes / PipelineForecastBar / useTerritoryPlannerSelectors to import from the shared module → grep-gate that `FY27_MONTHS` and `DEFAULT_QUOTAS` appear ≤2× across `src/`
- Covers NUM-01, NUM-02, NUM-03, NUM-04, NUM-06, NUM-08

### Plan 10-02: Extension — Trends Tab + Decomposition
- Wave 0: failing render tests for TrendsCharts and decomposed sub-components
- Wave 1: extract `IncrementalTable.tsx`, `RenewalTable.tsx`, `AddOnsPanel.tsx`, `TotalCompCard.tsx`, `SettingsDialog.tsx`, `SummaryCard.tsx`
- Wave 2: build `TrendsCharts.tsx` with three new recharts (Activity Rate, Pipeline Coverage, Attainment %); wire third TabsTrigger
- Covers NUM-05, NUM-07

This split keeps the foundation independently mergeable — if Plan 02 hits a surprise, the
test+storage value is already shipped.

## Decomposition Order (Plan 02)

1. **Leaf first** (no dependencies on each other): `EditableCell` (already in Plan 01),
   `SummaryCard`, `SettingsField`, `TrendsCharts`
2. **Mid-level**: `SettingsDialog` (consumes `SettingsField`), `AddOnsPanel`,
   `TotalCompCard` (read-only consumers)
3. **Tab content**: `IncrementalTable`, `RenewalTable` (these are big — ~150 lines each)
4. **Coordinator slim-down**: `MyNumbersPage` retains only state, owner gate, layout, tab
   state, and prop wiring. Target ≤400 lines.

The coordinator must continue to own:
- `entries`, `settings`, `addons` state
- `save`, `saveSettings`, `saveAddOns` callbacks
- `pipelineByMonth` memo (depends on opportunities)
- `incrementalCalcs`, `renewalCalcs`, `ytdTotals` memos (depends on entries+settings)
- `activeTab`, `expandedQuarter`, `showSettings`, `showAddOns` UI state

## Risk Profile

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Comp math drift during extraction | High without tests | Critical (real money) | Tests-first (Wave 0 RED before Wave 1 GREEN); never combine extract + edit in one commit |
| Schema-shape mismatch when refactoring shared `loadEntries` | Medium | High (breaks 3 other consumers) | TypeScript types on the shared module + tests for each consumer's read path |
| Trends chart extends Tabs in a way that breaks layout on mobile | Low | Medium | Use the same `<ResponsiveContainer width="100%">` wrapper that the existing chart uses |
| navigate-in-render fix causes brief flash of MyNumbersPage for non-owners | Medium | Low | Render `null` until `useEffect` fires; alternatively wrap routes in an `<OwnerOnly>` guard component (out of scope for Phase 10) |
| Increase in test count blows out CI time | Low | Low | Vitest is fast; ≥20 unit tests on pure functions runs <500ms |

## Sources

### Primary (HIGH confidence)
- `src/pages/MyNumbersPage.tsx:1-875` — full file read, all comp math + render logic
- `src/components/QuotaHeroBoxes.tsx:1-211` — duplicate `FY27_MONTHS`, `DEFAULT_QUOTAS`, `loadEntries`
- `src/data/forecast.ts:1-83` — Phase 07 precedent for pure-engine pattern
- `src/hooks/useTerritoryPlannerSelectors.ts:156-257` — third copy of FY27 constants + sister `useQuotaSummary`
- `src/test/` (14 files via Glob) — confirms zero `compMath` / `MyNumbersPage` / `EditableCell` test files exist
- `.planning/REQUIREMENTS.md` — confirms no NUM-* IDs exist; new IDs are unblocked
- `.planning/STATE.md:78` — confirms Phase 10 was added 2026-04-25
- `CLAUDE.md` priority #10 — defines extension scope (quota attainment, activity rate, pipeline coverage tracked over time)

### Secondary (MEDIUM confidence)
- React Router v6 docs — `navigate({ replace: true })` from `useEffect` is the canonical auth-redirect pattern
- recharts ^2.15.4 — `<ReferenceLine>`, `yAxisId`, dual-line patterns verified via existing usage at `MyNumbersPage.tsx:12, 781-790`

### Tertiary (LOW confidence)
- "Pipeline coverage target = 3x" — sales ops convention; flag for Micah's UAT confirmation

## Metadata

**Confidence breakdown:**
- Audit findings: HIGH — every finding cites a file:line in this codebase
- Standard stack: HIGH — every library is already installed and in use
- Architecture: HIGH — pattern matches Phase 03 + Phase 07 precedents the codebase already shipped
- Pitfalls: HIGH — all five pitfalls are derived from the actual code, not generic advice
- Extension scope (3 new charts): MEDIUM — based on CLAUDE.md priority #10 wording; UAT will confirm whether all three are wanted at once vs phased

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days; codebase + comp plan stable)
