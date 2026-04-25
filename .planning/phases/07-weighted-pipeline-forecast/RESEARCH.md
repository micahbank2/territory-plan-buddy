# Phase 07: Weighted Pipeline Forecast — Research

**Researched:** 2026-04-24
**Domain:** Pure-TS deterministic forecast engine, segmented progress bar, quota math from localStorage, reuse of existing stage colors and tokens, Vitest table-driven tests
**Confidence:** HIGH — all findings sourced from direct code inspection of OpportunitiesPage, useOpportunities, QuotaHeroBoxes, OpportunityKanban, and the recently-landed Phase 06 recommendation engine pattern.

---

<phase_requirements>
## Phase Requirements (Proposed — to be added to REQUIREMENTS.md by planner)

| ID | Description | Research Support |
|----|-------------|------------------|
| FORECAST-01 | A pure function `forecastPipeline(opps: Opportunity[], quota: number): Forecast` returns a deterministic shape `{ rawOpen, weighted, booked, byStage[], pctOfQuota, openCount }` with no side effects | Existing `STAGE_WEIGHTS` constant at `src/pages/OpportunitiesPage.tsx:45-53` and `weightedACV` memo at `:274-279` already encode the math; Phase 07 promotes it into a tested module. |
| FORECAST-02 | A `PipelineForecastBar` component renders above the Opportunities table, between `<QuotaHeroBoxes />` and the List View section, showing: headline weighted number, raw open total, % of annual quota, and a horizontal segmented bar with one segment per active stage | Existing inline "Forecast Bar" at `src/pages/OpportunitiesPage.tsx:340-357` (raw + weighted only, no segmentation, no quota %) is the seed; Phase 07 expands and extracts it. |
| FORECAST-03 | The segmented bar uses the same stage color palette as `OpportunitiesPage.tsx` text colors (`stageColors` at `:61-72`) and `OpportunityKanban.tsx` border colors (`:23-30`), reused — not redefined | Stage colors documented at `:61-72` (text variants) and `OpportunityKanban.tsx:23-30` (border-t variants). Reuse keeps app consistent. |
| FORECAST-04 | Stage weights are codified once in `src/data/forecast.ts` covering all 10 OPP_STAGES (Develop, Discovery, Business Alignment, Validate, Propose, Negotiate, Won, Closed Won, Closed Lost, Dead). Closed Won and Won count as `booked` (separate field), not `weighted`; Closed Lost and Dead are excluded entirely. | `OPP_STAGES` at `src/hooks/useOpportunities.ts:25-28`; existing `STAGE_WEIGHTS` is incomplete (missing Business Alignment; Won and Closed Won both at 1.0 which is correct for booked but blurs "weighted pipeline") |
| FORECAST-05 | Quota source is `localStorage["my_numbers_v2"]` summed across all FY27 month entries via `incrementalQuota`, falling back to the FY27 `DEFAULT_QUOTAS` map if no override exists. The annual figure is the FY27 total (~$615,000 per `QuotaHeroBoxes.tsx:31`). | `QuotaHeroBoxes.tsx:35-44` shows the load pattern; `:174` shows the year sum; `:31` defines `ANNUAL_QUOTA = 615_000`. NOT hardcoded $625,000. The phase scope brief said "$625,000" but the code says $615,000 — research confirms $615k is the correct value to read. |
| FORECAST-06 | The component shows a friendly empty state when `opportunities.filter(open).length === 0`: a single "No active pipeline" card with a CTA-style icon, no segmented bar | Pattern reference: `OpportunitiesPage.tsx:365-370` shows the existing "No opportunities yet" empty state for the table. The bar reuses the conditional-render pattern at `:341` (`!loading && opportunities.length > 0`). |
| FORECAST-07 | Engine + component covered by `src/test/forecast.test.ts` (10–12 cases, table-driven) and `src/test/PipelineForecastBar.test.tsx` (≥2 render cases). Tests run under existing Vitest infra. | Vitest config at `vitest.config.ts`, setup at `src/test/setup.ts`, pattern reference at `src/test/recommendation.test.ts` (Phase 06) and `src/test/RecommendationCard.test.tsx`. |
| FORECAST-08 | The existing inline `STAGE_WEIGHTS` constant at `src/pages/OpportunitiesPage.tsx:45-53` and `weightedACV` memo at `:274-279` are removed (replaced by `forecastPipeline()` import); the inline "Forecast Bar" JSX at `:340-357` is replaced by `<PipelineForecastBar opportunities={opportunities} />` | Direct code reference. The inline implementation is a strict subset of what FORECAST-02 delivers. |
</phase_requirements>

---

<user_constraints>
## User Constraints (no CONTEXT.md exists for this phase)

This phase was research-driven without a prior `/gsd:discuss-phase` step. Constraints below come from the phase scope brief, ROADMAP.md, REQUIREMENTS.md, and CLAUDE.md priority roadmap item #7.

### Locked Decisions

- **Read-only:** the bar does NOT mutate opportunity data. No writes, no `update()` calls.
- **Mount target:** Opportunities page, between `<QuotaHeroBoxes />` (currently at `OpportunitiesPage.tsx:333-338`) and the List View section. Replaces the existing inline Forecast Bar at `:340-357`.
- **Pure-TS engine:** `forecastPipeline()` is deterministic — no async, no LLM, no `Date.now()` reads inside the engine itself (pass quota in as an argument; computed in component scope).
- **Stage weights:** Develop=10%, Discovery=20%, Validate=50%, Propose=70%, Negotiate=85% per CLAUDE.md priority #7 + existing inline map. Research proposes weights for the 5 stages CLAUDE.md does not pin.
- **Use existing tokens:** stage colors from `OpportunitiesPage.tsx:61-72` and `OpportunityKanban.tsx:23-30`. No new CSS classes.
- **No new deps:** lucide-react, clsx, tailwind-merge, vitest, @testing-library/react, shadcn `Tooltip` and `Progress` already installed.

### Claude's Discretion

- **Engine file location:** `src/data/forecast.ts` (sibling to `src/data/prospects.ts` and `src/data/recommendation.ts`). Matches Phase 05/06 pattern.
- **Component file:** `src/components/PipelineForecastBar.tsx`. Matches Phase 06's `RecommendationCard.tsx` pattern.
- **Stage weight proposals (5 unset stages):**
  - **Business Alignment:** 35% (between Discovery=20 and Validate=50; this stage means a budget owner has signed off on direction but solution validation is incomplete).
  - **Won:** 100% (legacy stage; some users mark deals "Won" before MSA signature — treat identical to Closed Won → counts as `booked`).
  - **Closed Won:** 100% (counts as `booked`, NOT in `weighted`).
  - **Closed Lost:** 0% (excluded from both `weighted` and `booked`).
  - **Dead:** 0% (excluded from both).
- **Segmentation visual:** horizontal bar split into segments proportional to each stage's `weighted` contribution. Stage labels appear in tooltip on hover. `shadcn/ui` `Tooltip` primitive.
- **Quota source:** Read once on mount via `useMemo` from `localStorage["my_numbers_v2"]`. NO direct hook into `MyNumbersPage` state — same load-on-mount pattern as `QuotaHeroBoxes.tsx:35-44`. If the user edits quota on `/my-numbers` and returns, the bar re-reads on next mount of OpportunitiesPage.
- **Plan/task split:** 1 plan, 2 tasks (RED scaffold + GREEN fill). Matches Phase 05/06 cadence.
- **Period scope:** v1 shows ANNUAL weighted forecast vs ANNUAL quota. Quarter/month variants out of scope (deferred — `QuotaHeroBoxes` already covers month/quarter/year for *bookings*, separate concern).

### Deferred Ideas (OUT OF SCOPE)

- Per-stage drill-down tables / clickable segments (display-only v1)
- Tunable per-user weights (locked at the stage-weight constants in v1)
- Weighted forecast by month / quarter (annual only — `QuotaHeroBoxes` already handles cadence for bookings)
- "Pipeline coverage" multiplier (3x quota target) — defer to v2
- Animated bar fill / count-up animation — static render, transition only on data change via Tailwind `transition-all duration-500` already used in `QuotaHeroBoxes.tsx:147`
- Persisting "user dismissed" state — render fresh every visit
</user_constraints>

---

## Summary

A primitive version of this feature **already exists** at `src/pages/OpportunitiesPage.tsx:45-53` (`STAGE_WEIGHTS` constant), `:274-279` (`weightedACV` memo), and `:340-357` (the inline two-column "Raw Pipeline / Weighted Forecast" card). It works but: it is incomplete (5 of 10 stages missing weights), it lacks a segmented bar, it does not show quota %, and it cannot be unit-tested in isolation. Phase 07 is therefore primarily a **promotion + extraction + expansion** of the inline math, identical in pattern to Phase 06's promotion of `whyActParts`.

The proposed shape is two new files and one in-place edit:

1. `src/data/forecast.ts` (NEW, ~80 lines) — pure function `forecastPipeline(opps: Opportunity[], quota: number): Forecast` returning `{ rawOpen, weighted, booked, byStage: ByStage[], pctOfQuota, openCount }`. No async, no side effects, no React.
2. `src/components/PipelineForecastBar.tsx` (NEW, ~120 lines) — renders engine output as a card with: headline weighted number, raw open + booked secondary numbers, quota progress strip, segmented horizontal bar (one tinted segment per active stage with hover tooltip showing `{stage}: {count} deals · ${weighted} weighted`).
3. `src/pages/OpportunitiesPage.tsx` (EDIT) — remove `STAGE_WEIGHTS` (`:45-53`), remove `weightedACV` memo (`:274-279`), replace inline Forecast Bar JSX (`:340-357`) with `<PipelineForecastBar opportunities={opportunities} />`. Keep `QuotaHeroBoxes` unchanged — it covers bookings, this covers pipeline.

No new dependencies. No schema changes. No hook signature changes. No Edge Function work.

**Primary recommendation:** Single plan, 2 tasks (RED scaffold + GREEN fill). Estimated execution: 60–90 minutes.

---

## Standard Stack

### Core (already installed — no new deps required)

| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| `lucide-react` | ^0.462.0 | TrendingUp / Target / DollarSign icons in headline | Already imported throughout `OpportunitiesPage.tsx` and `QuotaHeroBoxes.tsx` | `package.json` |
| `clsx` + `tailwind-merge` (`cn()`) | ^2.1.1 / ^2.6.0 | Conditional class composition for segment widths | Already used everywhere via `@/lib/utils` | `src/lib/utils.ts` |
| `@radix-ui/react-tooltip` (via shadcn) | latest | Hover tooltips on segment hover | Already wrapped at `src/components/ui/tooltip.tsx` and `<TooltipProvider>` mounted at `App.tsx` | inspected `App.tsx` provider tree |
| Vitest | ^3.2.4 | Engine + component tests | Already configured (jsdom, globals enabled) | `vitest.config.ts` |
| `@testing-library/react` | ^16.0.0 | Component render test | Already used by Phase 03/05/06 tests | `src/test/RecommendationCard.test.tsx` |

### What NOT to install

| Library | Why Skip |
|---------|----------|
| `recharts` | Already installed for InsightsPage, but a single horizontal segmented bar is a one-line flex of divs with width%. Recharts adds 20kb+ for nothing. |
| Any animation lib (`framer-motion`) | Existing pattern uses `transition-all duration-500` on width — sufficient. |
| `zod` | Engine input is `Opportunity[]` (typed); engine output is `Forecast` (we own the type). |
| `date-fns` for fiscal year math | Annual quota total is the sum of 12 months from `localStorage` — no date math required in engine. |

---

## Architecture Patterns

### Where the bar mounts

The Opportunities page header layout at `src/pages/OpportunitiesPage.tsx:300-358`:

```
300  <div className="min-h-screen bg-background">
302    <div className="sticky top-0 z-30 ..."> Header — title + search + Add Deal </div>
333    {/* Quota Hero Boxes */}
334    {!loading && opportunities.length > 0 && (
335      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-5 pb-0">
336        <QuotaHeroBoxes />
337      </div>
338    )}
340    {/* Forecast Bar */}              <-- inline today, replace with component
341    {!loading && opportunities.length > 0 && (
342      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-4 pb-0">
343        <div className="rounded-lg border border-border bg-muted/30 p-4">
344          ... Raw Pipeline / Weighted Forecast inline ...
357        </div>
358    )}
```

After the change:

```
333  {/* Quota Hero Boxes — bookings */}
334  {!loading && opportunities.length > 0 && <QuotaHeroBoxes />}
340  {/* Pipeline Forecast Bar — open deals */}
341  {!loading && opportunities.length > 0 && (
       <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-4 pb-0">
         <PipelineForecastBar opportunities={opportunities} />
       </div>
     )}
```

`QuotaHeroBoxes` already shows YTD bookings vs quota (closed-won money). `PipelineForecastBar` is the **complementary view**: weighted *open pipeline* vs the same quota. Together: "you've banked $X of $615k, and your weighted pipeline says $Y more is on the way."

### Engine architecture

```typescript
// src/data/forecast.ts (NEW)
import type { Opportunity } from "@/hooks/useOpportunities";

export type StageWeight = {
  stage: string;
  weight: number;        // 0..1
  classification: "open" | "booked" | "lost";
};

// Single source of truth — replaces inline STAGE_WEIGHTS in OpportunitiesPage
export const STAGE_WEIGHTS: Record<string, StageWeight> = {
  "Develop":             { stage: "Develop",             weight: 0.10, classification: "open" },
  "Discovery":           { stage: "Discovery",           weight: 0.20, classification: "open" },
  "Business Alignment":  { stage: "Business Alignment",  weight: 0.35, classification: "open" },
  "Validate":            { stage: "Validate",            weight: 0.50, classification: "open" },
  "Propose":             { stage: "Propose",             weight: 0.70, classification: "open" },
  "Negotiate":           { stage: "Negotiate",           weight: 0.85, classification: "open" },
  "Won":                 { stage: "Won",                 weight: 1.00, classification: "booked" },
  "Closed Won":          { stage: "Closed Won",          weight: 1.00, classification: "booked" },
  "Closed Lost":         { stage: "Closed Lost",         weight: 0,    classification: "lost" },
  "Dead":                { stage: "Dead",                weight: 0,    classification: "lost" },
};

// Stage colors — keyed to OpportunityKanban.tsx:23-30 (border) for the segmented bar
export const STAGE_BAR_COLORS: Record<string, string> = {
  "Develop":            "bg-slate-400",
  "Discovery":          "bg-blue-500",
  "Business Alignment": "bg-indigo-500",
  "Validate":           "bg-violet-500",
  "Propose":            "bg-amber-500",
  "Negotiate":          "bg-orange-500",
  "Won":                "bg-emerald-500",
  "Closed Won":         "bg-emerald-500",
};

export interface ByStage {
  stage: string;
  count: number;
  raw: number;             // sum of potential_value
  weighted: number;        // sum of potential_value * weight
  weight: number;          // 0..1
  classification: "open" | "booked" | "lost";
}

export interface Forecast {
  rawOpen: number;          // sum of potential_value across open stages only
  weighted: number;         // sum of weighted contributions across open stages only
  booked: number;           // sum of potential_value across booked stages (Won/Closed Won)
  openCount: number;        // count of open opps
  byStage: ByStage[];       // all stages that have at least one opp, sorted by weighted desc
  pctOfQuota: number;       // weighted / quota * 100, 0 if quota <= 0
}

export function forecastPipeline(opps: Opportunity[], quota: number): Forecast {
  const buckets = new Map<string, ByStage>();

  for (const o of opps) {
    const stage = o.stage || "Develop";
    const weight = STAGE_WEIGHTS[stage]?.weight ?? 0;
    const classification = STAGE_WEIGHTS[stage]?.classification ?? "open";
    const acv = o.potential_value || 0;

    if (!buckets.has(stage)) {
      buckets.set(stage, { stage, count: 0, raw: 0, weighted: 0, weight, classification });
    }
    const b = buckets.get(stage)!;
    b.count += 1;
    b.raw += acv;
    b.weighted += Math.round(acv * weight);
  }

  const byStage = Array.from(buckets.values()).sort((a, b) => b.weighted - a.weighted);

  let rawOpen = 0, weighted = 0, booked = 0, openCount = 0;
  for (const b of byStage) {
    if (b.classification === "open")   { rawOpen += b.raw; weighted += b.weighted; openCount += b.count; }
    if (b.classification === "booked") { booked  += b.raw; }
  }

  const pctOfQuota = quota > 0 ? (weighted / quota) * 100 : 0;

  return { rawOpen, weighted, booked, openCount, byStage, pctOfQuota };
}
```

**Why pure function, not hook:** the engine reads no clock and no localStorage. Quota is passed in. Tests can table-drive without `vi.useFakeTimers()`. The component does the localStorage read with `useMemo`.

### Component shape

```typescript
// src/components/PipelineForecastBar.tsx (NEW)
import { useMemo } from "react";
import { TrendingUp, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { forecastPipeline, STAGE_BAR_COLORS } from "@/data/forecast";
import type { Opportunity } from "@/hooks/useOpportunities";

const ENTRIES_KEY = "my_numbers_v2";

const FY27_MONTHS = [
  "2026-02","2026-03","2026-04","2026-05","2026-06","2026-07",
  "2026-08","2026-09","2026-10","2026-11","2026-12","2027-01",
];

const DEFAULT_QUOTAS: Record<string, number> = {
  "2026-02": 30000, "2026-03": 30000, "2026-04": 60000,
  "2026-05": 38000, "2026-06": 38000, "2026-07": 77000,
  "2026-08": 40000, "2026-09": 40000, "2026-10": 80000,
  "2026-11": 48000, "2026-12": 48000, "2027-01": 96000,
};

function loadAnnualQuota(): number {
  try {
    const stored = localStorage.getItem(ENTRIES_KEY);
    if (stored) {
      const entries: Array<{ month: string; incrementalQuota: number }> = JSON.parse(stored);
      return entries.reduce((s, e) => s + (e.incrementalQuota ?? 0), 0);
    }
  } catch {}
  return FY27_MONTHS.reduce((s, m) => s + (DEFAULT_QUOTAS[m] ?? 0), 0);
}

export function PipelineForecastBar({ opportunities }: { opportunities: Opportunity[] }) {
  const quota = useMemo(() => loadAnnualQuota(), []);
  const f = useMemo(() => forecastPipeline(opportunities, quota), [opportunities, quota]);

  const openByStage = f.byStage.filter(b => b.classification === "open" && b.weighted > 0);
  const totalSegmentWeight = openByStage.reduce((s, b) => s + b.weighted, 0) || 1;

  if (f.openCount === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
        <TrendingUp className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground opacity-60" />
        <div className="text-sm font-semibold text-foreground">No active pipeline</div>
        <div className="text-xs text-muted-foreground mt-0.5">Add a deal to see your weighted forecast.</div>
      </div>
    );
  }

  const pctClamp = Math.min(f.pctOfQuota, 100);
  const pctColor =
    f.pctOfQuota >= 100 ? "bg-emerald-500" :
    f.pctOfQuota >= 70  ? "bg-amber-500"   :
    "bg-primary";

  return (
    <div data-testid="pipeline-forecast-bar" className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      {/* Headline */}
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Weighted Pipeline
          </div>
          <div className="text-2xl font-black font-mono text-primary">${f.weighted.toLocaleString()}</div>
        </div>
        <div className="w-px h-10 bg-border hidden sm:block" />
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw Open</div>
          <div className="text-xl font-black font-mono text-foreground">${f.rawOpen.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">{f.openCount} deal{f.openCount !== 1 ? "s" : ""}</div>
        </div>
        {f.booked > 0 && (
          <>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked</div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">${f.booked.toLocaleString()}</div>
            </div>
          </>
        )}
        <div className="ml-auto text-right">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 justify-end">
            <Target className="w-3 h-3" /> % of FY27 Quota
          </div>
          <div className="text-xl font-black font-mono text-foreground">{f.pctOfQuota.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Quota: ${quota.toLocaleString()}</div>
        </div>
      </div>

      {/* Quota progress strip */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", pctColor)}
          style={{ width: `${pctClamp}%` }}
        />
      </div>

      {/* Segmented stage bar */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline by Stage</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {openByStage.map((b) => {
            const widthPct = (b.weighted / totalSegmentWeight) * 100;
            return (
              <Tooltip key={b.stage}>
                <TooltipTrigger asChild>
                  <div
                    className={cn("h-full transition-all duration-500", STAGE_BAR_COLORS[b.stage] ?? "bg-slate-400")}
                    style={{ width: `${widthPct}%` }}
                    aria-label={`${b.stage}: ${b.count} deals, $${b.weighted.toLocaleString()} weighted`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">{b.stage}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.count} deal{b.count !== 1 ? "s" : ""} · ${b.weighted.toLocaleString()} ({(b.weight * 100).toFixed(0)}%)
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {openByStage.map((b) => (
            <span key={b.stage} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn("inline-block w-2 h-2 rounded-sm", STAGE_BAR_COLORS[b.stage] ?? "bg-slate-400")} />
              {b.stage} · ${b.weighted.toLocaleString()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Empty state

When `f.openCount === 0` (no open opportunities — only Closed Won / Closed Lost / Dead), the segmented bar is meaningless. Return a friendly stub card with a `TrendingUp` icon and "No active pipeline" copy. Skip rendering all other sections.

### Removal of inline math

`OpportunitiesPage.tsx` edits (single edit pass):

1. Remove `STAGE_WEIGHTS` (`:45-53`).
2. Remove `weightedACV` memo (`:274-279`).
3. Replace JSX block (`:340-357`) with `<PipelineForecastBar opportunities={opportunities} />`.
4. Keep `totalACV` and `totalIncrementalACV` (`:271-272`) — these are used by the table footer (`:518-521`), unrelated to the forecast.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stage colors | Define a third copy in `forecast.ts` | Mirror `OpportunityKanban.tsx:23-30` color names (slate-400, blue-500, violet-500, amber-500, orange-500, emerald-500), adding indigo-500 for Business Alignment | Single visual vocabulary across kanban + bar |
| Quota loader | Re-read `MyNumbersPage` localStorage with custom shape | Inline `loadAnnualQuota()` matching `QuotaHeroBoxes.tsx:35-44` exactly | Two implementations of the same load = drift on schema change |
| Tooltip | Custom tooltip via `position: absolute` + state | shadcn `Tooltip` already wired with `TooltipProvider` in `App.tsx` | Accessible, keyboard-supported, themed |
| Progress strip | Custom div with width transition | Existing pattern at `QuotaHeroBoxes.tsx:143-149` | Identical to existing UX; copy pattern |
| Segmented bar | `recharts` `<BarChart>` | Plain flex divs with `width: ${pct}%` | One-line of HTML; recharts adds bundle + ceremony |
| Annual quota constant | Hardcode `615_000` in two places | `loadAnnualQuota()` derives it from FY27 month sum (so future schedule edits propagate) | Source of truth = `localStorage` + `DEFAULT_QUOTAS` map |

---

## Common Pitfalls

### Pitfall 1: Empty `STAGE_WEIGHTS` lookup yields silent zero
**What goes wrong:** A user types a custom stage value via inline edit (e.g., "Custom Stage X"). `STAGE_WEIGHTS["Custom Stage X"]` is `undefined`, weight defaults to 0, deal silently disappears from forecast. No warning.
**Prevention:** Default unknown stage to `"Develop"` classification + 10% weight inside `forecastPipeline()` (already in code: `const stage = o.stage || "Develop"`, then `STAGE_WEIGHTS[stage]?.weight ?? 0`). Better: log to `console.warn` in dev when stage is not in the map, but don't throw.
**Warning sign:** Forecast number drops mysteriously after a stage rename or typo.

### Pitfall 2: Won + Closed Won double-counting
**What goes wrong:** Both stages exist in `OPP_STAGES` (`useOpportunities.ts:25-28`). If a deal is in "Won" and another is in "Closed Won," summing both into `weighted` would produce inflated numbers. CLAUDE.md priority #7 specifies **only Develop / Validate / Propose / Discovery weights** — does not address Won/Closed Won.
**Prevention:** Classify both as `booked`, NOT `open`. They contribute to `f.booked`, not `f.weighted`. Tests must cover a deal in "Won" AND a deal in "Closed Won" — only `booked` accumulates.
**Warning sign:** A user reports the weighted number went up after marking a deal "Closed Won."

### Pitfall 3: Closed Lost / Dead included in totals
**What goes wrong:** `Closed Lost` deals retain a `potential_value` for historical reasons. If included even at weight 0, they still inflate `byStage` length and clutter the segmented bar.
**Prevention:** Filter `openByStage = f.byStage.filter(b => b.classification === "open" && b.weighted > 0)` before rendering segments. Engine still includes them in `byStage` for completeness (some test may want to assert "0 weighted for closed lost"), but the component skips them visually.
**Warning sign:** A grey segment for "Dead" deals appears in the bar.

### Pitfall 4: Pre-Phase-7 deals with stage="Won" (legacy)
**What goes wrong:** `OPP_STAGES` includes both "Won" and "Closed Won." Pre-existing data may have either. The kanban only renders deals in `KANBAN_STAGES = ["Develop", "Discovery", "Validate", "Propose", "Negotiate", "Closed Won"]` (`OpportunityKanban.tsx:21`) — no "Won" column.
**Prevention:** Treat both Won and Closed Won as `booked` in the engine. Component shows them in the same emerald color. Don't try to deprecate "Won" — that's a separate cleanup.
**Warning sign:** A deal in "Won" stage shows up in `f.booked` but not in the kanban — that's expected, not a bug.

### Pitfall 5: localStorage SSR / private mode failure
**What goes wrong:** Vitest jsdom env supports `localStorage`, but production hits Safari Private Mode where `localStorage.getItem` may throw on quota or be locked. Untrapped, this crashes the page.
**Prevention:** Wrap `localStorage.getItem(ENTRIES_KEY)` in `try { ... } catch {}` — pattern from `QuotaHeroBoxes.tsx:36-44`.
**Warning sign:** Sentry / Lovable error logs reporting `SecurityError: The operation is insecure.` on the Opportunities page.

### Pitfall 6: Tooltip `<TooltipProvider>` mounting
**What goes wrong:** `<Tooltip>` requires `<TooltipProvider>` somewhere up the tree. If the test render doesn't mount it, tooltips throw.
**Prevention:** App-level provider already exists at `App.tsx` (third in the provider tree). For component tests, wrap `render(<TooltipProvider>...<PipelineForecastBar /></TooltipProvider>)`.
**Warning sign:** Test fails with `Cannot read properties of null (reading 'tooltip')` in `useTooltip`.

### Pitfall 7: Quota fetched once at mount becomes stale after edit
**What goes wrong:** User edits FY27 month quotas on `/my-numbers`, navigates back to `/opportunities`. Component is still mounted — the `useMemo([])` quota cache holds the old value.
**Prevention:** This is acceptable in v1 (consistent with `QuotaHeroBoxes` behavior). Document the constraint. Workaround: navigate away and back, which unmounts the component. If/when the user reports it, switch to a custom-event listener pattern (out of scope for v1).
**Warning sign:** User reports "I changed my quota but the % didn't update."

### Pitfall 8: Math.round per-stage drops precision in edge cases
**What goes wrong:** `Math.round(b.acv * weight)` per-deal could accumulate ~$1 rounding error per 100 deals. Acceptable for display, but tests asserting exact totals will tilt.
**Prevention:** Keep `Math.round` per-deal (matches existing inline `weightedACV` math at `:275-279`). Tests use whole-number ACVs (e.g., $50,000) where weights produce whole-number weighted values.
**Warning sign:** A test fails with `expected 12345 but received 12346`.

---

## Code Examples

### Engine usage in component

```typescript
const quota = useMemo(() => loadAnnualQuota(), []);
const f = useMemo(() => forecastPipeline(opportunities, quota), [opportunities, quota]);
// f = { rawOpen, weighted, booked, openCount, byStage, pctOfQuota }
```

### Engine test scaffold

```typescript
// src/test/forecast.test.ts
import { describe, it, expect } from "vitest";
import { forecastPipeline, STAGE_WEIGHTS } from "@/data/forecast";
import type { Opportunity } from "@/hooks/useOpportunities";

const make = (overrides: Partial<Opportunity>): Opportunity => ({
  id: crypto.randomUUID(),
  territory_id: "t1",
  user_id: "u1",
  name: "Deal",
  type: "Net New",
  potential_value: 100_000,
  incremental_acv: null,
  point_of_contact: "",
  stage: "Discovery",
  notes: "",
  products: "",
  close_date: "",
  prospect_id: null,
  website: "",
  created_at: "",
  ...overrides,
});

describe("forecastPipeline", () => {
  it("empty pipeline returns zeros", () => {
    const f = forecastPipeline([], 615_000);
    expect(f.weighted).toBe(0);
    expect(f.rawOpen).toBe(0);
    expect(f.booked).toBe(0);
    expect(f.openCount).toBe(0);
    expect(f.byStage).toEqual([]);
    expect(f.pctOfQuota).toBe(0);
  });

  it("Develop=10% weight", () => {
    const f = forecastPipeline([make({ stage: "Develop", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(10_000);
    expect(f.rawOpen).toBe(100_000);
  });

  it("Propose=70% weight", () => {
    const f = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(70_000);
  });

  it("Negotiate=85% weight", () => {
    const f = forecastPipeline([make({ stage: "Negotiate", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(85_000);
  });

  it("Closed Won goes to booked, not weighted", () => {
    const f = forecastPipeline([make({ stage: "Closed Won", potential_value: 100_000 })], 615_000);
    expect(f.booked).toBe(100_000);
    expect(f.weighted).toBe(0);
    expect(f.openCount).toBe(0);
  });

  it("Won (legacy) classified same as Closed Won", () => {
    const f = forecastPipeline([make({ stage: "Won", potential_value: 50_000 })], 615_000);
    expect(f.booked).toBe(50_000);
    expect(f.weighted).toBe(0);
  });

  it("Closed Lost excluded from all totals", () => {
    const f = forecastPipeline([
      make({ stage: "Closed Lost", potential_value: 100_000 }),
      make({ stage: "Dead", potential_value: 100_000 }),
    ], 615_000);
    expect(f.weighted).toBe(0);
    expect(f.booked).toBe(0);
    expect(f.rawOpen).toBe(0);
  });

  it("byStage sorted by weighted desc", () => {
    const f = forecastPipeline([
      make({ stage: "Develop",   potential_value: 100_000 }),  // 10k weighted
      make({ stage: "Propose",   potential_value: 100_000 }),  // 70k weighted
      make({ stage: "Discovery", potential_value: 100_000 }),  // 20k weighted
    ], 615_000);
    expect(f.byStage.map(b => b.stage)).toEqual(["Propose", "Discovery", "Develop"]);
  });

  it("multiple deals in same stage aggregate", () => {
    const f = forecastPipeline([
      make({ stage: "Validate", potential_value: 50_000 }),
      make({ stage: "Validate", potential_value: 50_000 }),
    ], 615_000);
    const v = f.byStage.find(b => b.stage === "Validate")!;
    expect(v.count).toBe(2);
    expect(v.raw).toBe(100_000);
    expect(v.weighted).toBe(50_000);
  });

  it("pctOfQuota computes correctly", () => {
    const f = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 200_000);
    expect(f.pctOfQuota).toBe(35); // 70k / 200k * 100
  });

  it("pctOfQuota is 0 when quota is 0", () => {
    const f = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 0);
    expect(f.pctOfQuota).toBe(0);
  });

  it("unknown stage defaults to weight 0 and 'open' classification", () => {
    const f = forecastPipeline([make({ stage: "Mystery Stage", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(0);
    expect(f.openCount).toBe(1);  // still counted as open by default
  });

  it("Business Alignment=35% weight", () => {
    const f = forecastPipeline([make({ stage: "Business Alignment", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(35_000);
  });

  it("STAGE_WEIGHTS covers all OPP_STAGES", () => {
    const expected = ["Develop","Discovery","Business Alignment","Validate","Propose","Negotiate","Won","Closed Won","Closed Lost","Dead"];
    for (const s of expected) expect(STAGE_WEIGHTS[s]).toBeDefined();
  });
});
```

### Component render test scaffold

```typescript
// src/test/PipelineForecastBar.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PipelineForecastBar } from "@/components/PipelineForecastBar";

const make = (overrides: any = {}) => ({
  id: crypto.randomUUID(), territory_id: "t1", user_id: "u1", name: "Deal",
  type: "Net New", potential_value: 100_000, incremental_acv: null,
  point_of_contact: "", stage: "Propose", notes: "", products: "",
  close_date: "", prospect_id: null, website: "", created_at: "",
  ...overrides,
});

const renderBar = (opps: any[]) =>
  render(<TooltipProvider><PipelineForecastBar opportunities={opps} /></TooltipProvider>);

describe("PipelineForecastBar", () => {
  beforeEach(() => localStorage.clear());

  it("renders headline weighted total + raw open", () => {
    renderBar([make({ stage: "Propose", potential_value: 100_000 })]);
    expect(screen.getByTestId("pipeline-forecast-bar")).toBeInTheDocument();
    expect(screen.getByText(/\$70,000/)).toBeInTheDocument();   // weighted
    expect(screen.getByText(/\$100,000/)).toBeInTheDocument();  // raw open
  });

  it("renders empty state when no open opportunities", () => {
    renderBar([make({ stage: "Closed Lost", potential_value: 100_000 })]);
    expect(screen.getByText(/no active pipeline/i)).toBeInTheDocument();
  });

  it("renders quota % when localStorage has FY27 entries", () => {
    localStorage.setItem("my_numbers_v2", JSON.stringify([
      { month: "2026-04", incrementalQuota: 60_000, incrementalBookings: 0, renewedAcv: 0, pipelineAcv: 0, meetings: 0, outreachTouches: 0 },
    ]));
    renderBar([make({ stage: "Propose", potential_value: 30_000 })]);
    // weighted = 21,000; quota = 60,000; pct = 35.0%
    expect(screen.getByText(/35\.0%/)).toBeInTheDocument();
  });
});
```

---

## Plan Breakdown Recommendation

**Single plan: 07-01-PLAN.md — Weighted Pipeline Forecast bar with engine, component, tests, and OpportunitiesPage rewire**

Rationale: same shape as Phase 06. Engine is the load-bearing piece; component and rewire are thin wrappers. Two-task RED/GREEN cadence per project convention:

1. **Task 1 (RED, ~25 min):**
   - Create `src/data/forecast.ts` with type exports (`Forecast`, `ByStage`, `StageWeight`), `STAGE_WEIGHTS` constant, `STAGE_BAR_COLORS` constant, and a stub `forecastPipeline()` that returns a hardcoded `Forecast` shape.
   - Create `src/test/forecast.test.ts` with 12 cases as `it.todo` (or `it.skip` with bodies).
   - Create `src/components/PipelineForecastBar.tsx` shell that calls the stub and renders `<div data-testid="pipeline-forecast-bar" />` with placeholder text.
   - Create `src/test/PipelineForecastBar.test.tsx` with 3 cases as `it.todo`.
   - Verify: `bunx vitest run src/test/forecast.test.ts src/test/PipelineForecastBar.test.tsx` reports 15 todos, no failures.

2. **Task 2 (GREEN, ~50 min):**
   - Fill `forecastPipeline` body (bucket aggregation, classification, sort, totals).
   - Fill `PipelineForecastBar` JSX (headline, quota strip, segmented bar with tooltips, legend).
   - In `src/pages/OpportunitiesPage.tsx`: import `PipelineForecastBar`, replace `:340-357` JSX, remove `STAGE_WEIGHTS` (`:45-53`) and `weightedACV` memo (`:274-279`).
   - Convert the 15 test placeholders to runnable assertions.
   - Verify: `bunx vitest run` green; manual smoke (open `/opportunities`, see bar with segments, hover for tooltip).

**Total estimated effort:** 60–90 minutes of agent execution time.

---

## Mobile considerations

- **Headline row** uses `flex-wrap` so chips reflow at narrow widths — already pattern at `OpportunitiesPage.tsx:344`.
- **Vertical separators** are hidden on `<sm` via `hidden sm:block` — pattern at `:349`.
- **Segmented bar** is a fixed-height (`h-3`) flex; segments shrink proportionally. Tooltips are touch-tappable via Radix.
- **Legend chips** use `flex-wrap` and shrink to a 2-row layout on mobile.
- **Quota right-aligned** column drops to a left-aligned new row at narrow widths via `ml-auto` + `flex-wrap` — same pattern as Hero Boxes.
- No `compact` prop needed — the layout is naturally responsive.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `STAGE_WEIGHTS` map at `OpportunitiesPage.tsx:45-53`, missing 5 stages | `STAGE_WEIGHTS` exported from `src/data/forecast.ts`, complete coverage of all 10 OPP_STAGES with classification | This phase | Single source of truth; testable; future stages added in one place |
| Two-stat card (Raw + Weighted) | Four-stat card (Weighted, Raw, Booked, % Quota) + segmented bar + legend | This phase | Quota visibility was missing; segmentation surfaces the shape of the pipeline |
| `weightedACV` memo in OpportunitiesPage | `forecastPipeline()` pure function | This phase | Engine testable in isolation; no React render dependency for math |

**Deprecated/outdated:** the inline `STAGE_WEIGHTS` and `weightedACV` are fully replaced — FORECAST-08 explicitly removes them. The CLAUDE.md priority #7 weights are preserved (Develop=10, Discovery=20, Validate=50, Propose=70) and extended.

---

## Open Questions

1. **Should "Pipeline Coverage" (e.g., 3x quota target) be surfaced?**
   - Industry rule of thumb: weighted pipeline should be 3x remaining quota.
   - **Recommendation (deferred):** v1 just shows `% of quota`. If user feedback wants coverage ratio, add `coverageRatio = weighted / (quota - booked)` in v2. The math is trivial; the UX decision is what's deferred.

2. **Should the bar persist a "drill" state (clicked stage segment → filter table)?**
   - **Recommendation (deferred):** v1 is display-only. Phase 07's locked decision is "read-only." Adding drill makes the bar an interactive control which expands scope.

3. **What about Renewal-type deals?** Current weights treat all OPP_TYPES the same. A "Renewal" in Develop stage has very different probability than a "Net New" in Develop.
   - **Recommendation (deferred):** v1 weights by stage only (matches CLAUDE.md priority #7 specification). Type-aware weighting is a v2 enhancement.

4. **Quota source: localStorage feels fragile vs. Supabase.** A user clearing browser data loses their quota schedule.
   - **Recommendation (acknowledge, defer):** This is a pre-existing concern with `MyNumbersPage` and `QuotaHeroBoxes`, not introduced by Phase 07. Migrating quota to Supabase is a separate enhancement (would need a `quota_schedule` table).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely client-side React + TS work using existing dependencies (lucide-react, vitest, react-testing-library, tailwind, clsx, shadcn Tooltip). No CLI tools, services, runtimes, or registrations beyond Bun + Vite already verified across Phases 01–06.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.0.0 |
| Config file | `vitest.config.ts` (jsdom env, globals enabled) |
| Setup file | `src/test/setup.ts` (matchMedia mock) |
| Quick run command | `bunx vitest run src/test/forecast.test.ts src/test/PipelineForecastBar.test.tsx` |
| Full suite command | `bunx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FORECAST-01 | `forecastPipeline` is pure, deterministic, returns shape | unit | `bunx vitest run src/test/forecast.test.ts -t "empty pipeline"` | ❌ Wave 0 |
| FORECAST-02 | Bar mounts on Opportunities page above table | manual UAT | open `/opportunities`, see bar above List View | ❌ Manual |
| FORECAST-03 | Stage colors reused from existing palette | grep | `! grep -E "bg-(red\|green\|yellow)-(300\|400\|500)" src/data/forecast.ts` | ❌ Verify post-Task-2 |
| FORECAST-04 | All 10 OPP_STAGES have weights and classifications | unit | `... -t "STAGE_WEIGHTS covers all OPP_STAGES"` | ❌ Wave 0 |
| FORECAST-05 | Quota loads from `localStorage["my_numbers_v2"]` with default fallback | component | `... -t "renders quota %"` | ❌ Wave 0 |
| FORECAST-06 | Empty state renders when openCount = 0 | component | `... -t "empty state"` | ❌ Wave 0 |
| FORECAST-07 | Engine ≥10 cases + component ≥2 cases | unit | `bunx vitest run src/test/forecast.test.ts src/test/PipelineForecastBar.test.tsx` | ❌ Wave 0 |
| FORECAST-08 | Inline STAGE_WEIGHTS + weightedACV removed | grep | `! grep -n "STAGE_WEIGHTS\|weightedACV" src/pages/OpportunitiesPage.tsx` (must return non-zero) | ❌ Verify post-Task-2 |

### Sampling Rate

- **Per task commit:** `bunx vitest run src/test/forecast.test.ts src/test/PipelineForecastBar.test.tsx`
- **Per wave merge:** `bunx vitest run`
- **Phase gate:** Full suite green + manual UAT for FORECAST-02 (visual verification of bar on `/opportunities`) + grep checks for FORECAST-03 / FORECAST-08.

### Wave 0 Gaps

- [ ] `src/data/forecast.ts` — engine module (does not exist yet)
- [ ] `src/components/PipelineForecastBar.tsx` — bar component (does not exist yet)
- [ ] `src/test/forecast.test.ts` — engine table-driven tests (does not exist yet)
- [ ] `src/test/PipelineForecastBar.test.tsx` — bar render tests (does not exist yet)
- [ ] No new framework install needed; Vitest infra is set up.

---

## Project Constraints (from CLAUDE.md)

- **Inline editing pattern:** the bar is read-only; does not consume the inline-edit pattern. No conflict.
- **Sub-collection replace warning:** bar never calls `update()`. No risk.
- **Optimistic updates:** bar re-renders when `opportunities` prop changes (via parent re-render); `useMemo([opportunities, quota])` is the safe pattern.
- **Owner-only features:** bar is visible to all roles (viewer/editor/owner). No gating needed.
- **TerritoryPlanner is ~1000 lines:** bar mounts in `OpportunitiesPage`, not `TerritoryPlanner`. No size concern.
- **CSS custom classes preserved:** bar uses standard Tailwind tokens + `border-border` / `bg-muted` / `text-muted-foreground` / `text-primary` / `bg-emerald-500` / `bg-amber-500`. No removal of `glass-card`, `aging-*`, etc.
- **Score does not drive actions (known gap):** N/A — Phase 06 closed that gap. Phase 07 closes the parallel gap "stage does not drive forecast visibility."
- **`./CLAUDE.md` priority roadmap item #7:** "Stage-weighted ACV: Propose=70%, Validate=50%, Discovery=20%, Develop=10%. Add forecast bar above the table and quota tracker." — Phase 07 fulfills this exactly, plus extends weights to the 5 stages CLAUDE.md does not pin (Business Alignment=35, Negotiate=85, Won/Closed Won=100/booked, Closed Lost/Dead=excluded).
- **CLAUDE.md "$625,000 annual quota" mention vs code's `ANNUAL_QUOTA = 615_000`:** the **code** value ($615,000 from `QuotaHeroBoxes.tsx:31`, derived from `DEFAULT_QUOTAS` summing to $615k) is the source of truth. The CLAUDE.md figure ($625k) is a documentation drift — Phase 07 reads from `localStorage` / `DEFAULT_QUOTAS`, not the doc.

---

## Sources

### Primary (HIGH confidence — direct code inspection)

- `src/pages/OpportunitiesPage.tsx` — full file (725 lines): inline `STAGE_WEIGHTS` at `:45-53`, `stageColors` (text variants) at `:61-72`, `typeColors` at `:55-59`, `weightedACV` memo at `:274-279`, Forecast Bar JSX at `:340-357`, `QuotaHeroBoxes` mount at `:333-338`, totalACV at `:271`, totalIncrementalACV at `:272`, table footer at `:518-521`, empty state at `:365-370`, opportunities load at `:128`
- `src/hooks/useOpportunities.ts` — full file (118 lines): `Opportunity` interface at `:6-22`, `OPP_STAGES` at `:25-28`, `OPP_TYPES` at `:24`, `DB_FIELDS` at `:31-34`, `add`/`update`/`remove` at `:76-115`
- `src/components/OpportunityKanban.tsx` (head): stage colors `border-t-*` at `:23-30`, `KANBAN_STAGES` at `:21`
- `src/components/QuotaHeroBoxes.tsx` — full file (212 lines): `ENTRIES_KEY = "my_numbers_v2"` at `:6`, `FY27_MONTHS` at `:17-21`, `DEFAULT_QUOTAS` at `:23-28`, `ANNUAL_QUOTA = 615_000` at `:31`, `loadEntries` at `:35-44`, year aggregation at `:171-174`, progress strip pattern at `:143-149`, color thresholds at `:108-113`
- `src/pages/MyNumbersPage.tsx` — confirms `incrementalQuota` field name and storage key (line 19, 246, 261, 270)
- `src/data/recommendation.ts` and `src/components/RecommendationCard.tsx` — Phase 06 pattern reference for engine + component split
- `src/test/recommendation.test.ts` and `src/test/RecommendationCard.test.tsx` — pattern reference for table-driven tests + RTL render tests
- `package.json` — confirms no new deps needed: lucide-react, clsx, tailwind-merge, vitest, @testing-library/react, @radix-ui/react-tooltip all present
- `App.tsx` — confirms `<TooltipProvider>` mounted in provider tree
- `.planning/PROJECT.md` — phase scope, "must never silently lose data" core value (bar is read-only, no data-loss risk)
- `.planning/ROADMAP.md` — Phase 7 not yet listed; phases 1–4 complete or in progress; Phase 7 inserted via this research
- `.planning/REQUIREMENTS.md` — FORECAST-* requirement IDs not yet present (this research proposes FORECAST-01..FORECAST-08); REC-* in Phase 06 shows the pattern
- `.planning/STATE.md` — Phase 6 just completed (Phase 03 plan revisions + research committed at 0558bd8); Phase 7 ready to start
- `./CLAUDE.md` — priority roadmap item #7 at "Weighted Pipeline Forecast in Opportunities" section; Yext context (RVP Lauren Goldman, SE Zoe Byerly, target verticals)

### Secondary (HIGH confidence — stable knowledge)

- Tailwind CSS variable HSL pattern (`hsl(var(--primary))`) — established project convention; see `tailwind.config.ts`
- React `useMemo` semantics — referential-equality dependency; new array reference from parent → memo recomputes (relevant for `opportunities` prop)
- shadcn Tooltip provider pattern — required ancestor; documented in `src/components/ui/tooltip.tsx` and Radix Tooltip docs

### Tertiary (LOW confidence — flagged for verification)

- None. All findings derive from direct code inspection of files that exist in the worktree as of 2026-04-24. The forecast engine is a direct extension of inline math already in production; no novel external libraries or APIs are required.

---

## Metadata

**Confidence breakdown:**

- Mount location and existing inline `STAGE_WEIGHTS` / Forecast Bar: HIGH — read directly from source
- Engine input shape (`Opportunity[]`, quota number): HIGH — read directly from `useOpportunities.ts`
- Stage weights for the 4 CLAUDE.md-pinned stages: HIGH — explicitly documented
- Stage weights for the 5 unpinned stages (Business Alignment=35, Negotiate=85, Won=booked, Closed Lost/Dead=excluded): MEDIUM — inferred from sales-stage progression and existing inline `STAGE_WEIGHTS` (which had Negotiate=85). Tunable; planner can adjust before commit.
- Quota source pattern (`localStorage["my_numbers_v2"]` + `DEFAULT_QUOTAS` fallback): HIGH — copied verbatim from `QuotaHeroBoxes.tsx:35-44`
- Stage-color reuse from `OpportunityKanban.tsx`: HIGH — read directly from source
- Plan breakdown (1 plan, 2 tasks RED/GREEN): HIGH — matches Phase 05/06 cadence and project pattern
- Tests as table-driven: HIGH — Vitest pattern proven in Phases 05/06

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable domain; engine logic is data-driven and won't drift unless `OPP_STAGES` or quota schema changes)
