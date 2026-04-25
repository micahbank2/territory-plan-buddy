# Phase 9: Daily Briefing — Research

**Researched:** 2026-04-24
**Domain:** Single-page bookmarkable territory digest (read-only, client-side, pure-engine pattern)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

No `BRIEF-*` IDs exist yet in `.planning/REQUIREMENTS.md` and Phase 9 is not in `.planning/ROADMAP.md`. Both must be added by the planner before plans are written. Proposed IDs:

| ID | Description | Research Support |
|----|-------------|------------------|
| BRIEF-01 | A `/briefing` route renders a single-page digest using existing `useProspects`, `useOpportunities`, `useTerritories` hooks | Route pattern at `src/App.tsx:44-58`; auth via `<ProtectedRoute>` wrapper at `src/App.tsx:30-35` |
| BRIEF-02 | A pure function `getBriefing(prospects, opportunities, today)` produces all sections without React imports or Supabase calls | Reuses scoring from `src/data/prospects.ts` and existing `daysBetween` helper from `src/pages/TodayPage.tsx:14-16` |
| BRIEF-03 | Briefing shows "What to do today" — meetings booked today, hot prospects 14+ days stale, tier-1 prospects with no recent contact, capped at 5 items | New rule set; data sources are `prospect.outreach`, `prospect.priority`, `prospect.tier`, `prospect.lastTouched` |
| BRIEF-04 | Briefing shows overdue tasks (`task.dueDate < today`), capped at 10, sorted oldest first | `Task.dueDate` exists on `src/data/prospects.ts:109-113`; `TodayPage.tsx:28-42` already implements grouped-by-prospect variant |
| BRIEF-05 | Briefing shows "going stale" — Hot/Warm prospects with `lastTouched > 30 days ago` AND score >= 40, capped at 10, sorted by score descending | `scoreProspect` from `src/data/prospects.ts`; same staleness math as `TodayPage.tsx:45-54` |
| BRIEF-06 | Briefing shows pipeline movement — opportunities created in last 7 days (proxy for "new") and recent activity inferred from prospect `interactions[]` keyed to opp's `prospect_id` | `Opportunity.created_at` exists at `src/hooks/useOpportunities.ts:21`. **No `updated_at` column exists**, so true stage-change detection is impossible without schema change |
| BRIEF-07 | Briefing shows "today's numbers" hero — total active prospects, hot count, and weighted pipeline derived inline (no Phase 7 forecast.ts to reuse) | Counts from `data.length`, filter by `priority === "Hot"`; pipeline weights computed inline using `OPP_STAGES` |
| BRIEF-08 | Briefing entry point added to existing dropdown nav and command palette in `TerritoryPlanner.tsx` | Pattern at `src/components/TerritoryPlanner.tsx:1160-1166` (command palette) and `:1360-1366` (dropdown menu) |
</phase_requirements>

---

## Critical Discovery: TodayPage.tsx Already Exists

**This phase as briefed is a near-duplicate of `src/pages/TodayPage.tsx` (282 lines).** That page is already mounted at `/today` (`src/App.tsx:52`), already linked from the nav and command palette, and already implements:
- Overdue tasks grouped by prospect (`TodayPage.tsx:28-42`)
- Stale high-priority accounts, score >= 40, 30+ days no touch (`TodayPage.tsx:45-54`)
- Never-contacted top 5 by score (`TodayPage.tsx:57-62`)
- Pipeline summary by outreach stage (`TodayPage.tsx:65-73`)

`.planning/codebase/ARCHITECTURE.md:34` explicitly labels it **"daily briefing view"**. `.planning/PROJECT.md:59` also lists "Daily briefing artifact" under **Out of Scope** ("separate project, not part of hardening").

**Recommendation:** Do not create a parallel `/briefing` route and `BriefingPage.tsx`. Either (a) extend `TodayPage.tsx` in place with the missing capabilities (today-plan, going-stale-vs-hot-warm-only, pipeline-movement, hero numbers, print stylesheet, empty-state celebration), or (b) extract the digest logic into a pure `src/data/briefing.ts` engine and have `TodayPage.tsx` consume it. The discuss-phase / planner step should resolve this before any code is written. The rest of this document assumes option (b) — the path that introduces the most reusable value with minimum visual churn.

The prompt also references `src/data/forecast.ts` (Phase 7), `src/data/recommendation.ts` (Phase 6), `src/components/territory/agingHelpers.ts`, `src/components/RecommendationCard.tsx`, `src/components/PipelineForecastBar.tsx`, and `src/components/TerritoryNavbar.tsx`. **None of these files exist in this branch.** Glob and Grep confirm zero matches. The prompt appears to have been authored against a different fork. Plans must not assume those modules exist.

## Summary

Phase 9 is a single-page bookmarkable digest of "what to do today" plus territory health markers (overdue, stale, recent pipeline). The prompt describes greenfield, but `TodayPage.tsx` already covers ~70% of the requested surface, so this is realistically a **brownfield extension** of an existing page plus a new pure-function engine.

The cleanest shape: extract a pure `src/data/briefing.ts` returning a `Briefing` struct from `(Prospect[], Opportunity[], Date)`, write Vitest unit tests against the pure engine, then refactor `TodayPage.tsx` to render from that struct and add the missing sections (Today's Plan hero, weighted pipeline number, going-stale narrowed to Hot/Warm, pipeline-movement card, print CSS, inbox-zero empty state). All data flows are already established — no new hooks, no new Supabase calls, no Edge Functions.

**Primary recommendation:** Build a pure engine (`src/data/briefing.ts`) + 2 small UI extensions to existing `TodayPage.tsx`. Skip the new `/briefing` route entirely; the existing `/today` is the briefing.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI | Project framework |
| TypeScript | ^5.8.3 | Types | Project language (strict mode disabled — `as any` allowed) |
| Vitest | ^3.2.4 | Tests for pure engine | Existing test runner, jsdom env (`vitest.config.ts`) |
| @testing-library/react | ^16.0.0 | Component tests if needed | Already used (`ProspectSheet.test.tsx`, `useProspects.test.ts`) |
| sonner | ^1.7.4 | Toasts | Already wired in `App.tsx`; not actually needed for briefing (read-only) |
| date-fns | ^3.6.0 | Date formatting | `toLocaleDateString` is sufficient — `TodayPage.tsx:99` uses it directly |
| lucide-react | ^0.462.0 | Icons | Already used: `AlertTriangle`, `Clock`, `UserX`, `BarChart3`, `CheckCircle`, `Calendar`, `TrendingUp` |

### Supporting (already installed, optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | ^6.30.1 | Navigation | Only if planner decides to add a separate `/briefing` route (not recommended) |
| recharts | ^2.15.4 | Charts | Avoid — briefing should be scannable text, not charts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure-function engine | Inline logic in TodayPage.tsx | Inline is faster to write but blocks unit testing. Existing `TodayPage.tsx` already has untested inline `useMemo` blocks — this phase is the chance to fix that. |
| Extending TodayPage | New BriefingPage at `/briefing` | New route doubles surface area, splits the user's mental model ("which page is the morning bookmark?"), and contradicts `.planning/codebase/ARCHITECTURE.md:34`. |

**Installation:** Nothing new to install.

**Version verification:** All listed packages are pinned in `package.json` and already present in `bun.lock` / `bun.lockb`. No upgrades needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── data/
│   ├── prospects.ts       # existing — scoring, types, constants
│   └── briefing.ts        # NEW — pure engine: getBriefing(prospects, opps, today): Briefing
├── pages/
│   └── TodayPage.tsx      # existing — refactor to render from getBriefing()
└── data/
    └── briefing.test.ts   # NEW — Vitest unit tests for the engine
```

### Pattern 1: Pure-Function Engine
**What:** A single exported function with no React, no Supabase, no Date.now() side effects (today is always passed in).
**When to use:** Anytime derived data needs deterministic unit testing.
**Example:**
```typescript
// src/data/briefing.ts
import type { Prospect } from "./prospects";
import type { Opportunity } from "@/hooks/useOpportunities";
import { scoreProspect, OPP_STAGES } from "./prospects";

export interface BriefingItem {
  prospectId: string;
  name: string;
  reason: string;       // e.g., "45d since last touch · Hot · score 72"
  score?: number;
  daysStale?: number;
}

export interface OverdueTaskItem {
  prospectId: string;
  prospectName: string;
  taskId: string;
  text: string;
  dueDate: string;
  daysOverdue: number;
}

export interface OppMovementItem {
  oppId: string;
  name: string;
  stage: string;
  potentialValue: number;
  daysSinceCreated: number;
}

export interface Briefing {
  generatedAt: string;          // ISO date for cache-busting tests
  todayLabel: string;           // "Saturday, April 25, 2026"
  hero: {
    activeProspects: number;
    hotCount: number;
    weightedPipeline: number;   // sum of potential_value * stageWeight, excluding closed
    overdueTaskCount: number;
  };
  todayPlan: BriefingItem[];    // max 5
  overdueTasks: OverdueTaskItem[]; // max 10, sorted by daysOverdue desc
  goingStale: BriefingItem[];   // max 10, Hot|Warm + 30d+ stale + score >= 40
  newPipeline: OppMovementItem[]; // created in last 7 days
  inboxZero: boolean;           // true when todayPlan + overdueTasks + goingStale all empty
}

const STAGE_WEIGHTS: Record<string, number> = {
  Develop: 0.10,
  Discovery: 0.20,
  "Business Alignment": 0.30,
  Validate: 0.50,
  Propose: 0.70,
  Negotiate: 0.85,
  Won: 1.0,
  "Closed Won": 1.0,
  "Closed Lost": 0,
  Dead: 0,
};

const daysBetween = (iso: string, today: Date): number =>
  Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000);

export function getBriefing(
  prospects: Prospect[],
  opportunities: Opportunity[],
  today: Date
): Briefing {
  const todayStr = today.toISOString().split("T")[0];
  // ... see Common Pitfalls for the full implementation outline
  // Keep this function under 120 lines; if it grows, split into helpers.
  return /* … */;
}
```
Source: pattern modeled on `src/pages/TodayPage.tsx:28-73` (existing `useMemo` blocks).

### Pattern 2: Hook-Driven Page Body
**What:** The page calls existing hooks, passes results plus `new Date()` into the engine, and renders from the returned struct.
**When to use:** Always — keeps the engine deterministic.
**Example:**
```tsx
const { data: prospects } = useProspects(activeTerritory ?? undefined);
const { opportunities } = useOpportunities(activeTerritory);
const briefing = useMemo(
  () => getBriefing(prospects, opportunities, new Date()),
  [prospects, opportunities]
);
```
Source: same shape as `MyNumbersPage.tsx:393-422` (memoized derived calcs).

### Anti-Patterns to Avoid
- **Running the engine inside the JSX:** Forces re-computation on every render. Use `useMemo`.
- **Calling `new Date()` inside the engine:** Breaks unit tests — accept `today: Date` as a parameter.
- **Calling Supabase from the engine:** It must stay pure.
- **Adding a charts component:** A briefing should be scannable in <30 seconds. Charts slow the eye down.
- **Building a parallel `/briefing` route while `/today` exists:** Causes nav fragmentation. Resolve in discuss-phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date diffing | Custom epoch math everywhere | Reuse `daysBetween()` from `TodayPage.tsx:14-16` (move to `src/data/briefing.ts`) | One source of truth |
| Score gating | Reimplement scoring | Reuse `scoreProspect`, `getScoreLabel` from `src/data/prospects.ts` | Already validated |
| Logo rendering | New `<Logo>` | Reuse `ProspectLogo` from `TodayPage.tsx:269-278` (extract if shared) | Already handles Google S2 + custom + fallback |
| Stage weighting | New constant | Define `STAGE_WEIGHTS` once in `briefing.ts` and export | Phase 7 (`forecast.ts`) doesn't exist — this engine becomes the source |
| Print stylesheet | Custom print component | Use `@media print` rules in `src/index.css` | Browsers handle print natively |
| Auth gating | Custom redirect | Wrap route with existing `<ProtectedRoute>` from `src/App.tsx:30-35` | Already handles loading state |

**Key insight:** ~80% of the building blocks already live in `TodayPage.tsx`, `src/data/prospects.ts`, and `src/hooks/useOpportunities.ts`. The risk is duplicating them, not missing them.

## Common Pitfalls

### Pitfall 1: Detecting "pipeline movement" without `updated_at`
**What goes wrong:** Briefing claims "Acme moved from Discovery to Propose" but the data layer cannot prove it.
**Why it happens:** `Opportunity` type at `src/hooks/useOpportunities.ts:6-22` exposes `created_at` only. There is no `updated_at` column, no audit history table, no stage-change events.
**How to avoid:** Limit "pipeline movement" to **(a) opps created in the last 7 days** (provable from `created_at`) and **(b) prospect-level activity in the last 7 days** (derived from `prospect.interactions` filter where `date >= today - 7d`). Do not promise stage transitions.
**Warning signs:** Any phrasing like "moved to" or "advanced from" should be a red flag in PR review.

### Pitfall 2: "Meetings booked today" has no schema support
**What goes wrong:** Briefing tries to surface today's meetings but the data model has no meeting datetime field.
**Why it happens:** `Prospect.outreach === "Meeting Booked"` is a stage label, not a calendar event. `Task.dueDate` is the closest proxy, and it has no time-of-day.
**How to avoid:** Surface "tasks due today" (`task.dueDate === todayStr`) and "prospects in `Meeting Booked` stage" as two separate signals — never claim today-specific meetings.

### Pitfall 3: Empty territory shows zeros, not an empty state
**What goes wrong:** New user with no prospects sees "0 active, 0 hot, $0 pipeline" and assumes the app is broken.
**Why it happens:** `useProspects` returns `[]` for new territories.
**How to avoid:** When `prospects.length === 0`, render a "Welcome — add your first prospect" CTA instead of zeroed numbers. When `prospects.length > 0` but `briefing.inboxZero === true`, render a celebration ("Inbox zero — nothing demands action today").

### Pitfall 4: Briefing re-runs on every interaction
**What goes wrong:** User clicks a prospect and the entire briefing recomputes because `new Date()` reference changed.
**Why it happens:** Calling `new Date()` inline in `useMemo`'s deps creates a new object every render.
**How to avoid:** Capture `const now = useMemo(() => new Date(), [])` once at component top, pass into engine. Or accept that the briefing is a "one-shot on mount" view and use `useState(() => new Date())`.

### Pitfall 5: Print layout breaks because nav is sticky
**What goes wrong:** Printing the page chops the briefing because the `sticky top-0 backdrop-blur` header overlaps content in print.
**Why it happens:** `TodayPage.tsx:89` uses `sticky top-0 z-30 backdrop-blur-md`.
**How to avoid:** Add `@media print { .sticky { position: static; backdrop-filter: none; } button { display: none; } }` rules to `src/index.css`.

### Pitfall 6: `lastTouched` null prospects flood "going stale"
**What goes wrong:** Every never-contacted prospect appears in "going stale" because `null > 30 days ago` evaluates truthy.
**Why it happens:** `TodayPage.tsx:51` returns `true` when `lastTouched` is null. That's correct for the "never contacted" section but wrong for "going stale" which implies prior contact.
**How to avoid:** In the engine, `goingStale` filter should explicitly require `p.lastTouched != null` AND `daysBetween(p.lastTouched, today) >= 30`. Never-contacted is its own section.

## Code Examples

### Example: Extending TodayPage with a hero block
```tsx
// src/pages/TodayPage.tsx (additive)
const briefing = useMemo(
  () => getBriefing(data, opportunities, now),
  [data, opportunities, now]
);

return (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* NEW: hero */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active" value={briefing.hero.activeProspects} />
        <Stat label="Hot" value={briefing.hero.hotCount} />
        <Stat label="Weighted Pipeline" value={`$${(briefing.hero.weightedPipeline / 1000).toFixed(0)}k`} />
        <Stat label="Overdue" value={briefing.hero.overdueTaskCount} accent={briefing.hero.overdueTaskCount > 0 ? "destructive" : "default"} />
      </section>
      {briefing.inboxZero && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-base font-semibold">Inbox zero.</p>
          <p className="text-sm text-muted-foreground">Nothing demands action today. Go close some deals.</p>
        </div>
      )}
      {/* …existing sections, refactored to read from briefing.* …  */}
    </div>
  </div>
);
```

### Example: Vitest unit test
```typescript
// src/data/briefing.test.ts
import { describe, it, expect } from "vitest";
import { getBriefing } from "./briefing";
import { initProspect } from "./prospects";

describe("getBriefing", () => {
  const TODAY = new Date("2026-04-24T12:00:00Z");
  it("returns inboxZero when nothing is overdue or stale", () => {
    const b = getBriefing([], [], TODAY);
    expect(b.inboxZero).toBe(true);
    expect(b.todayPlan).toEqual([]);
    expect(b.hero.activeProspects).toBe(0);
  });

  it("flags going-stale only for Hot/Warm with score >= 40 and 30+ days", () => {
    const stale = initProspect({
      id: "p1", name: "Acme", priority: "Hot", tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
      lastTouched: "2026-03-01",  // 54 days before TODAY
    });
    const b = getBriefing([stale], [], TODAY);
    expect(b.goingStale.map(s => s.prospectId)).toContain("p1");
  });

  it("excludes never-contacted from going-stale", () => {
    const cold = initProspect({ id: "p2", priority: "Hot", lastTouched: null });
    const b = getBriefing([cold], [], TODAY);
    expect(b.goingStale.map(s => s.prospectId)).not.toContain("p2");
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-rendered HTML email digest | Client-side React route (no email service needed) | Phase 9 design | Avoids needing SMTP/SES; works offline once loaded; doesn't require Edge Function |
| Separate `/briefing` page (per prompt) | Extend existing `/today` | This research | Avoids nav fragmentation, matches `ARCHITECTURE.md:34` labeling |

**Deprecated/outdated:**
- The prompt's reference to `src/data/forecast.ts` (Phase 7) and `src/data/recommendation.ts` (Phase 6): **these files do not exist on this branch.** Plans must not import them.

## Open Questions

1. **Extend `TodayPage.tsx` or build new `BriefingPage.tsx`?**
   - What we know: TodayPage covers most sections, is already linked, and ARCHITECTURE.md calls it the daily briefing.
   - What's unclear: whether the user mentally distinguishes "Today" (action-oriented) from "Briefing" (read-only morning snapshot).
   - Recommendation: Resolve in `/gsd:discuss-phase` by asking the user directly. Default to extension.

2. **Pipeline movement detection scope.**
   - What we know: only `created_at` is tracked; no stage history.
   - What's unclear: whether the user accepts "new this week" as the only movement signal, or wants a schema migration to add `opportunity_stage_history` table.
   - Recommendation: Ship "new this week" + "interactions logged this week" in v1. Defer schema change.

3. **Print stylesheet — yes or no?**
   - What we know: Print to PDF is the "save as artifact" workflow if user wants to share/archive.
   - What's unclear: whether the user actually prints. The prompt mentioned it as "optional."
   - Recommendation: Add minimal `@media print` rules (hide nav, simplify spacing). 30 minutes of work, infinite optionality.

4. **Today's hero metrics — which 3-4?**
   - What we know: weighted pipeline, hot count, total active, overdue count are the obvious candidates.
   - What's unclear: whether YTD bookings (from `MyNumbersPage` localStorage) should be surfaced.
   - Recommendation: Start with the 4 listed above. Pulling from MyNumbers localStorage couples the briefing to a separate state surface — defer.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 |
| Config file | `vitest.config.ts` (jsdom env, globals on) |
| Quick run command | `bun test src/data/briefing.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRIEF-02 | `getBriefing` is a pure function returning a `Briefing` struct | unit | `bun test src/data/briefing.test.ts -t "pure"` | Wave 0 — create |
| BRIEF-03 | Today's plan caps at 5, includes hot stale + tier-1 cold | unit | `bun test src/data/briefing.test.ts -t "todayPlan"` | Wave 0 — create |
| BRIEF-04 | Overdue tasks filter by `dueDate < today`, sort oldest first, cap 10 | unit | `bun test src/data/briefing.test.ts -t "overdue"` | Wave 0 — create |
| BRIEF-05 | Going-stale filters by Hot/Warm + score>=40 + 30d+ + lastTouched != null | unit | `bun test src/data/briefing.test.ts -t "goingStale"` | Wave 0 — create |
| BRIEF-06 | New pipeline filters opps by `created_at >= today - 7d` | unit | `bun test src/data/briefing.test.ts -t "newPipeline"` | Wave 0 — create |
| BRIEF-07 | Hero numbers compute correct weightedPipeline using STAGE_WEIGHTS | unit | `bun test src/data/briefing.test.ts -t "hero"` | Wave 0 — create |
| BRIEF-01, BRIEF-08 | Page renders from briefing struct, nav links work | smoke | manual click-through | n/a |

### Sampling Rate
- **Per task commit:** `bun test src/data/briefing.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/data/briefing.ts` — engine module
- [ ] `src/data/briefing.test.ts` — covers BRIEF-02 through BRIEF-07
- [ ] (If new route chosen) `src/pages/BriefingPage.tsx` + route registration in `src/App.tsx`
- [ ] (If extending) Identify diff against `src/pages/TodayPage.tsx`

## Project Constraints (from CLAUDE.md)

- **Tech stack:** React 18 + TS via Vite; Tailwind + shadcn/ui; sonner for toasts; lucide-react for icons; date-fns where useful.
- **Path alias:** Always import via `@/` — never relative paths like `../../hooks/...`.
- **State:** TanStack Query is installed but currently unused for fetching; raw `useState`/`useEffect` is the dominant pattern. Briefing should follow the dominant pattern (read from existing hooks).
- **Strict mode disabled:** `noImplicitAny: false`, `strictNullChecks: false` — `any` is acceptable for ergonomic edge cases, but the new engine should be strict-typed (it's all new code).
- **No backend server:** All data through `@/integrations/supabase/client`. Briefing is read-only — no mutations, no Edge Functions needed.
- **Single user:** Owner gating via `OWNER_EMAILS` not relevant for briefing (it's per-territory data).
- **Package manager:** Bun (`bun test`, `bun run dev`).
- **Custom CSS classes preserved:** Don't remove `glass-card`, `aging-dot`, `gradient-text`, etc.
- **GSD workflow required:** Before any code edits, this phase must go through `/gsd:plan-phase` then `/gsd:execute-phase`.
- **PR-on-Push (global rule):** Any push to a non-main branch must have a PR. Phase PR body must reference plan paths.

## Sources

### Primary (HIGH confidence)
- `/Users/micahbank/territory-plan-buddy/src/pages/TodayPage.tsx` — existing daily briefing page (282 lines)
- `/Users/micahbank/territory-plan-buddy/src/App.tsx:44-58` — route registration pattern, including `/today` at line 52
- `/Users/micahbank/territory-plan-buddy/src/App.tsx:30-35` — `<ProtectedRoute>` wrapper definition
- `/Users/micahbank/territory-plan-buddy/src/hooks/useOpportunities.ts:6-22` — `Opportunity` type confirms `created_at` exists, `updated_at` does not
- `/Users/micahbank/territory-plan-buddy/src/data/prospects.ts:96-113` — `InteractionLog` (has `date` field), `Task` (has `dueDate` field)
- `/Users/micahbank/territory-plan-buddy/src/components/TerritoryPlanner.tsx:1160,1360,1431` — nav patterns (command palette, dropdown menu, mobile nav buttons) for adding briefing link
- `/Users/micahbank/territory-plan-buddy/.planning/codebase/ARCHITECTURE.md:34` — TodayPage.tsx labeled "daily briefing view"
- `/Users/micahbank/territory-plan-buddy/.planning/PROJECT.md:59` — daily briefing flagged as out of scope for hardening project
- `/Users/micahbank/territory-plan-buddy/.planning/phases/04-ai-capabilities/04-RESEARCH.md` — RESEARCH.md format template
- `/Users/micahbank/territory-plan-buddy/vitest.config.ts` — test framework config

### Secondary (MEDIUM confidence)
- Stage weights derived by analogy from common pipeline practice (Develop 10%, Discovery 20%, Validate 50%, Propose 70%, Negotiate 85%). Match the user's intent stated in the prompt.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package already pinned in `package.json`
- Architecture: HIGH — `TodayPage.tsx` is the live reference implementation
- Pitfalls: HIGH — pitfalls 1, 2, 6 directly observed in the existing code

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days; codebase is stable, no upstream library churn expected)
