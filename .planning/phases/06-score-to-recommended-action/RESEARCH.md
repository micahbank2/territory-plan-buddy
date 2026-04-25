# Phase 06: Score → Recommended Action — Research

**Researched:** 2026-04-24
**Domain:** Pure-TS deterministic recommendation engine, React composition, glass-card UI tokens, vitest table-driven tests
**Confidence:** HIGH — all findings sourced from direct code inspection of the target files; no external library required

---

<phase_requirements>
## Phase Requirements (Proposed — to be added to REQUIREMENTS.md by planner)

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | A `RecommendationCard` renders at the top of the ProspectSheet Overview tab (above Account Details), summarizing score + label + at most 3 callout chips + a single suggested-action sentence | Mount target identified at `src/components/ProspectSheet.tsx:552-555` (Overview TabsContent block, immediately before `<h3>Account Details</h3>`) |
| REC-02 | A pure function `getRecommendation(p: Prospect)` returns a deterministic `Recommendation` object with `{ score, label, callouts, suggestedAction }` — no LLM, no async, no side effects | Existing `scoreProspect` and `scoreBreakdown` at `src/data/prospects.ts:165-229` are already pure and provide the inputs |
| REC-03 | The recommendation surfaces contact-coverage gaps (missing Decision Maker, missing Champion, no contacts at all) using `prospect.contacts` already attached by `dbToProspect` | `useProspects.ts:30` confirms `contacts` on Prospect is the same array used elsewhere; `CONTACT_ROLES` at `src/data/prospects.ts:61-70` provides the role enum |
| REC-04 | The recommendation surfaces staleness using the same thresholds as `getAgingClass` (<7d / 7–30d / 30+d / never) | `src/components/territory/agingHelpers.ts:3-19` is the existing source of truth — reuse, do not re-derive |
| REC-05 | The recommendation surfaces competitor pressure when `prospect.competitor` is set, with specific copy for SOCi / Birdeye / Reputation.com and a generic fallback for other named competitors (and silence on `""` or `"Unknown"`) | `COMPETITORS` at `src/data/prospects.ts:47-59` is the enum; existing `whyActParts` at `ProspectSheet.tsx:192-194` already calls out SOCi and Birdeye but not the others |
| REC-06 | The engine is covered by table-driven unit tests in `src/test/recommendation.test.ts` (≥10 representative cases) and the card has at least one render test in `src/test/RecommendationCard.test.tsx` | Vitest infra confirmed in `vitest.config.ts` and `src/test/setup.ts`; pattern reference at `src/test/ProspectSheet.tab.test.tsx` and `src/test/LogActivityWidget.test.tsx` |
| REC-07 | The existing inline `whyActParts` block at `ProspectSheet.tsx:176-195` and its render at `:504-508` are removed — `RecommendationCard` is the single surface for "why act on this account" | Direct code reference; the existing block is a strict subset of what REC-01 delivers |
</phase_requirements>

---

<user_constraints>
## User Constraints (no CONTEXT.md exists for this phase)

This phase was research-driven without a prior `/gsd:discuss-phase` step. Constraints below come from the phase scope brief, ROADMAP.md, REQUIREMENTS.md, and CLAUDE.md priority roadmap item #5.

### Locked Decisions

- **Read-only:** the recommendation block does NOT mutate prospect data. No writes, no `update()` calls.
- **Mount location:** top of the **Overview** tab in ProspectSheet, **above** the existing `Account Details` block at `src/components/ProspectSheet.tsx:552-555`.
- **Deterministic engine:** light copy generation via templates and conditionals — **no LLM call**. Must be instant on render.
- **Inputs only:** Prospect, Contact[], optional Signal[]. All three are already props in ProspectSheet (`prospect`, `prospect.contacts`, `prospectSignals` at `:99-100`). Do NOT add new data dependencies.
- **Concise:** 1–2 sentences max for the suggested-action line; chip count cap at 3 callouts to stay scannable in <2s.
- **Use existing tokens:** `glass-card`, aging color palette (`text-amber-600 dark:text-amber-400`, `aging-green/yellow/red/gray`), Lucide icons. **No new CSS classes.**

### Claude's Discretion

- **Component file vs inline:** new `src/components/RecommendationCard.tsx` is recommended (testability, mobile compactness branch).
- **Engine file location:** new `src/data/recommendation.ts` (sibling to `prospects.ts`).
- **Threshold tuning:** stale = 30+d (matches `aging-red`), going-cold = 14+d for Hot prospects (new threshold, not in existing helpers).
- **Suggested-action copy templates:** propose ~8 templates; the planner can trim or expand.
- **Mobile compactness:** drop the suggested-action sentence on `useIsMobile()` and keep only the chips? OR keep full content with smaller text? Recommend **keep full content, smaller text** — the action sentence is the value-add.
- **Plan/task split:** 1 plan, 2 tasks (RED/GREEN) recommended.

### Deferred Ideas (OUT OF SCOPE)

- Driving the kanban / table sort by recommendation priority (out of scope — display-only block).
- Persisting "user dismissed" state per recommendation (out of scope — render fresh every open).
- Nudge-from-recommendation actions (e.g., "Click to add Decision Maker") — out of scope; this is text + chips only in v1.
- Multi-language copy (single user, English only).
- Recommendation history / audit log (deterministic and recomputable from current state — no need to store).
</user_constraints>

---

## Summary

A primitive version of this feature **already exists** as `whyActParts` at `src/components/ProspectSheet.tsx:176-195` (the memo) and `:504-508` (the render — a small amber paragraph next to the score number in the sticky header). It checks three things: missing Decision Maker (score-gated at 60+), days-since-last-touch (>30), and a SOCi/Birdeye competitor flag. It produces a chip-style string joined by `·`.

That existing implementation is the right shape but undersized: it lives in the header (small, easy to miss), it is not extracted (untestable in isolation), and it is missing several useful signals (Hot priority + Not Started outreach, never-contacted at high score, missing Champion, going-cold Hot accounts, customer status). Phase 06 is therefore primarily a **promotion + extraction + expansion** of `whyActParts`, not a greenfield build.

The proposed shape is two new files and one in-place edit:

1. `src/data/recommendation.ts` (NEW, ~150 lines) — pure function `getRecommendation(p: Prospect): Recommendation` returning `{ score, label, callouts: Callout[], suggestedAction: string }`. No async, no side effects, no React.
2. `src/components/RecommendationCard.tsx` (NEW, ~80 lines) — renders the engine output as a `glass-card`-style block with score number, label badge, callout chips (color-coded by severity), and a single suggested-action sentence with a Target lucide icon prefix. Compact prop for mobile.
3. `src/components/ProspectSheet.tsx` (EDIT) — mount `<RecommendationCard prospect={prospect} />` as the **first** child of `<TabsContent value="overview">` at `:552`, immediately above `<h3>Account Details</h3>` at `:555`. Remove the inline `whyActParts` memo at `:176-195` and its render at `:504-508`. The header score number stays (compact display), but the "why act" copy is consolidated into the new card on the Overview tab.

No new dependencies. No schema changes. No hook signature changes. No Edge Function work.

**Primary recommendation:** Single plan, 2 tasks (RED scaffolds engine types + tests as `it.todo`, GREEN fills logic + mounts card + activates tests). Estimated execution: 60–90 minutes.

---

## Standard Stack

### Core (already installed — no new deps required)

| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| `lucide-react` | ^0.462.0 | Target / AlertCircle / Clock / Users / Flame / Snowflake icons in chips | Already imported at `ProspectSheet.tsx:20-23` for many other icons | `package.json` |
| `class-variance-authority` | ^0.7.1 | Optional — variant management for callout severity (info/warn/critical) | Already used by shadcn primitives; matches project pattern in `src/components/ui/badge.tsx` | `package.json` |
| `clsx` + `tailwind-merge` (`cn()`) | ^2.1.1 / ^2.6.0 | Conditional class composition | Already used everywhere via `@/lib/utils` `cn()` | `src/lib/utils.ts` |
| Vitest | ^3.2.4 | Engine and component tests | Already configured (`vitest.config.ts`, jsdom env, globals enabled) | `vitest.config.ts` |
| `@testing-library/react` | ^16.0.0 | Component render test | Already used by Phase 03 + Phase 05 tests | `src/test/LogActivityWidget.test.tsx` |

### What NOT to install

| Library | Why Skip |
|---------|----------|
| `date-fns` `differenceInDays` | Existing `getAgingClass` and `getAgingLabel` at `src/components/territory/agingHelpers.ts:3-19` already compute days-since-latest-interaction with bare `Date.now() - new Date(i.date).getTime() / 86400000`. Reuse, don't re-import. |
| Any LLM SDK | Locked decision — recommendation is deterministic templating, not generated copy. |
| `zod` | Engine input is `Prospect` (already typed); engine output is `Recommendation` (we own the type). No runtime validation needed. |
| `react-markdown` | Output is plain strings + chip text. Markdown is overkill. |

---

## Architecture Patterns

### Where the card mounts

The Overview tab content begins at `src/components/ProspectSheet.tsx:552-555`:

```
552  <TabsContent value="overview" className="space-y-5 mt-0 animate-fade-in-up">
553  {/* Account Details */}
554  <div className="space-y-3">
555    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Account Details</h3>
```

After the change:

```
552  <TabsContent value="overview" className="space-y-5 mt-0 animate-fade-in-up">
       {/* Recommendation — why call this account */}
       <RecommendationCard prospect={prospect} />        <-- NEW
553  {/* Account Details */}
554  <div className="space-y-3">
555    <h3 ...>Account Details</h3>
```

Because the parent `<TabsContent>` already has `className="space-y-5"`, the new card gets vertical rhythm for free — no margin/padding tweaks needed in ProspectSheet.

### Engine architecture

```typescript
// src/data/recommendation.ts (NEW)
import {
  scoreProspect,
  scoreBreakdown,
  getScoreLabel,
  type Prospect,
  type ScoreBreakdownItem,
} from "@/data/prospects";

export type CalloutSeverity = "info" | "warn" | "critical";
export type CalloutKind =
  | "missing-decision-maker"
  | "missing-champion"
  | "no-contacts"
  | "never-contacted"
  | "stale-30"
  | "stale-90"
  | "going-cold"            // Hot priority + 14+ days since touch
  | "competitor"
  | "hot-not-started"
  | "high-score-cold-priority"
  | "customer";

export interface Callout {
  kind: CalloutKind;
  severity: CalloutSeverity;
  text: string;             // chip label, ≤4 words
}

export interface Recommendation {
  score: number;
  scoreLabel: string;       // "Excellent" | "Strong" | "Moderate" | "Low" | "Needs Work"
  scoreShort: string;       // "A+" | "A" | "B" | "C" | "D"
  scoreColor: string;       // hsl string from getScoreLabel
  callouts: Callout[];      // ordered by severity desc, capped at 3
  suggestedAction: string;  // 1 sentence
  // Inputs surfaced for tests / devtools, not rendered:
  daysSinceLastTouch: number | null;   // null = never contacted
  hasDecisionMaker: boolean;
  hasChampion: boolean;
  contactCount: number;
}

export function getRecommendation(p: Prospect): Recommendation {
  const score = scoreProspect(p);
  const info = getScoreLabel(score);
  const contacts = p.contacts || [];
  const interactions = p.interactions || [];

  const hasDecisionMaker = contacts.some(c => c.role === "Decision Maker");
  const hasChampion = contacts.some(c => c.role === "Champion");

  // Days since most-recent interaction (mirror agingHelpers logic)
  const daysSinceLastTouch = interactions.length === 0
    ? null
    : Math.floor((Date.now() - Math.max(...interactions.map(i => new Date(i.date).getTime()))) / 86400000);

  const callouts: Callout[] = [];

  // Severity rules — order matters for "top 3" capping below
  if (p.priority === "Hot" && p.outreach === "Not Started") {
    callouts.push({ kind: "hot-not-started", severity: "critical", text: "Hot, not started" });
  }
  if (daysSinceLastTouch === null && score >= 40) {
    callouts.push({ kind: "never-contacted", severity: "critical", text: "Never contacted" });
  } else if (daysSinceLastTouch !== null && daysSinceLastTouch > 90) {
    callouts.push({ kind: "stale-90", severity: "critical", text: `${daysSinceLastTouch}d stale` });
  } else if (p.priority === "Hot" && daysSinceLastTouch !== null && daysSinceLastTouch > 14) {
    callouts.push({ kind: "going-cold", severity: "warn", text: "Hot going cold" });
  } else if (daysSinceLastTouch !== null && daysSinceLastTouch > 30) {
    callouts.push({ kind: "stale-30", severity: "warn", text: `${daysSinceLastTouch}d since touch` });
  }

  if (contacts.length === 0) {
    callouts.push({ kind: "no-contacts", severity: "critical", text: "No contacts" });
  } else if (score >= 40 && !hasDecisionMaker) {
    callouts.push({ kind: "missing-decision-maker", severity: "warn", text: "Missing Decision Maker" });
  } else if (score >= 60 && !hasChampion) {
    callouts.push({ kind: "missing-champion", severity: "info", text: "Missing Champion" });
  }

  if (p.priority === "Cold" && score >= 60) {
    callouts.push({ kind: "high-score-cold-priority", severity: "warn", text: "High potential, marked Cold" });
  }

  const competitorCallout = buildCompetitorCallout(p);
  if (competitorCallout) callouts.push(competitorCallout);

  if (p.status === "Customer") {
    callouts.push({ kind: "customer", severity: "info", text: "Existing customer" });
  }

  // Severity sort + cap at 3
  const severityRank: Record<CalloutSeverity, number> = { critical: 0, warn: 1, info: 2 };
  callouts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const topCallouts = callouts.slice(0, 3);

  return {
    score,
    scoreLabel: info.label,
    scoreShort: info.short,
    scoreColor: info.color,
    callouts: topCallouts,
    suggestedAction: buildSuggestedAction(p, topCallouts, score, daysSinceLastTouch),
    daysSinceLastTouch,
    hasDecisionMaker,
    hasChampion,
    contactCount: contacts.length,
  };
}

function buildCompetitorCallout(p: Prospect): Callout | null {
  const c = p.competitor || "";
  if (!c || c === "Unknown" || c === "Yext") return null;
  // Normalize "Other: X" → "X"
  const display = c.startsWith("Other: ") ? c.slice(7) : c;
  const severityByCompetitor: Record<string, CalloutSeverity> = {
    "SOCi": "warn",
    "Birdeye": "warn",
    "Reputation.com": "warn",
    "Uberall": "info",
    "Podium": "info",
    "Rio SEO": "info",
    "Chatmeter": "info",
  };
  return {
    kind: "competitor",
    severity: severityByCompetitor[display] ?? "info",
    text: `On ${display}`,
  };
}

function buildSuggestedAction(
  p: Prospect,
  callouts: Callout[],
  score: number,
  daysSinceLastTouch: number | null,
): string {
  // Order: most actionable single nudge wins. Templates kept deterministic and short.
  const kinds = new Set(callouts.map(c => c.kind));

  if (kinds.has("hot-not-started")) {
    return "Hot prospect with zero outreach — start a first-touch sequence today.";
  }
  if (kinds.has("never-contacted") && score >= 40) {
    return `${p.name} scores ${score} but has never been contacted — open with a tailored intro.`;
  }
  if (kinds.has("stale-90")) {
    return `Reopen ${p.name} with a re-engagement email — ${daysSinceLastTouch}d of silence is past recovery without a fresh angle.`;
  }
  if (kinds.has("going-cold")) {
    return "Hot deal slipping — book a 15-minute check-in this week to keep momentum.";
  }
  if (kinds.has("no-contacts")) {
    return "No contacts on file — research the org chart and add a Champion or Decision Maker before next outreach.";
  }
  if (kinds.has("missing-decision-maker")) {
    const competitor = (p.competitor && p.competitor !== "Unknown" && p.competitor !== "Yext") ? p.competitor : null;
    return competitor
      ? `Find and contact a VP of Marketing — competing with ${competitor} means you need exec air cover.`
      : "Find and contact a VP of Marketing or Head of Digital to anchor the deal.";
  }
  if (kinds.has("high-score-cold-priority")) {
    return `Score ${score} but marked Cold — re-evaluate priority or document why this account is parked.`;
  }
  if (kinds.has("stale-30")) {
    return `Re-engage with a relevant signal-driven touch — ${daysSinceLastTouch}d since last contact.`;
  }
  if (kinds.has("missing-champion")) {
    return "Identify a Champion inside the buying group — you're scoring well but need an internal advocate.";
  }
  if (p.outreach === "Meeting Booked") {
    return "Meeting booked — finalize agenda and pre-read 24h before.";
  }
  if (score < 20) {
    return "Low-scoring account — confirm fit before investing more cycles.";
  }
  return `Maintain cadence — ${p.name} is on track for normal follow-up.`;
}
```

**Why pure function, not hook:** the engine reads `Date.now()` once per call. A hook adds `useMemo` ceremony and triggers recompute on render even when prospect didn't change. The card itself can wrap the call in `useMemo([prospect])` — no need to push that into the engine.

### Component shape

```typescript
// src/components/RecommendationCard.tsx (NEW)
import { useMemo } from "react";
import { Target, AlertCircle, Flame, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecommendation, type CalloutSeverity, type Callout } from "@/data/recommendation";
import type { Prospect } from "@/data/prospects";

interface RecommendationCardProps {
  prospect: Prospect;
  compact?: boolean;
}

const severityClass: Record<CalloutSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warn:     "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  info:     "bg-muted text-muted-foreground border-border",
};

function CalloutChip({ c }: { c: Callout }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold",
      severityClass[c.severity],
    )}>
      {c.text}
    </span>
  );
}

export function RecommendationCard({ prospect, compact = false }: RecommendationCardProps) {
  const rec = useMemo(() => getRecommendation(prospect), [prospect]);
  const isEmpty = rec.callouts.length === 0;

  return (
    <div
      data-testid="recommendation-card"
      className={cn(
        "rounded-lg border border-border bg-card/40 backdrop-blur-sm p-3 space-y-2",
        compact && "p-2 space-y-1.5",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Why call this account</span>
        <span className="ml-auto text-[10px] font-bold" style={{ color: rec.scoreColor }}>
          {rec.score} · {rec.scoreLabel}
        </span>
      </div>
      {!isEmpty && (
        <div className="flex flex-wrap gap-1.5">
          {rec.callouts.map((c) => <CalloutChip key={c.kind} c={c} />)}
        </div>
      )}
      <p className={cn("text-xs text-foreground/90 leading-snug", compact && "text-[11px]")}>
        {rec.suggestedAction}
      </p>
    </div>
  );
}
```

The card uses **only existing tokens**: `border-border`, `bg-card/40`, `backdrop-blur-sm`, `text-primary`, `text-muted-foreground`, `text-destructive`, `bg-destructive/15`, `bg-amber-500/15`, `text-amber-700 dark:text-amber-400`, `bg-muted`. No new CSS classes. No new tailwind config keys. The visual matches the AI Readiness card pattern (`AIReadinessCard.tsx` uses similar `rounded-lg border border-border` + section header + body content).

### Empty / fallback state

`getRecommendation` always returns a `suggestedAction` string — even for "ideal" prospects, the catch-all is `"Maintain cadence — {name} is on track for normal follow-up."`. The card therefore never renders empty. If `callouts.length === 0`, the chip row collapses (no empty row), and only the score line + suggested-action line render.

### Inline `whyActParts` removal

The header at `ProspectSheet.tsx:498-526` currently shows `score / label / whyActParts.join(" · ")` as a hover-tooltipped block. Phase 06 should:

1. Keep the score number and label in the header (compact, useful at a glance).
2. **Remove** the `whyActParts` memo (`:176-195`) and its render at `:504-508`.
3. Keep the existing breakdown tooltip (`:511-525`) — the card surfaces "what to do," the tooltip surfaces "how was the score computed." Different jobs.

This removal is REC-07 and is a strict reduction — the card supersedes the inline copy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Days-since-last-interaction | Custom date diff in engine | Inline `Math.floor((Date.now() - Math.max(...dates)) / 86400000)` matching `agingHelpers.ts:6-8` | Established pattern; importing `differenceInDays` from date-fns adds a dep where bare math suffices |
| Score and breakdown | Re-derive locations / industry / priority logic | `scoreProspect(p)` + `scoreBreakdown(p)` from `src/data/prospects.ts:165-229` | Already pure, already tested-by-shape; single source of truth |
| Score-label color and short code | Custom HSL strings | `getScoreLabel(score)` from `src/data/prospects.ts:187-193` | Returns `{ label, short, color }` — covers all UI needs |
| Aging color/label | Re-derive thresholds | `getAgingClass(interactions)` + `getAgingLabel(interactions)` from `src/components/territory/agingHelpers.ts:3-19` | Same thresholds; reuse keeps app consistent |
| Callout severity → CSS class | Custom variant runtime | Static `Record<CalloutSeverity, string>` in the card | 3 severities, ~4 classes each — `cva` would add ceremony |
| Markdown / rich text | Render `<ReactMarkdown>` for one sentence | Plain `<p>` | Suggested action is one sentence of prose |

---

## Common Pitfalls

### Pitfall 1: `Date.now()` makes the engine non-deterministic in tests
**What goes wrong:** `getRecommendation` reads `Date.now()` for staleness math. Tests that assert "30 days stale" will fail tomorrow because `Date.now()` advanced.
**Prevention:** Use Vitest's `vi.useFakeTimers().setSystemTime(new Date("2026-04-24"))` in tests that touch staleness. Pattern reference at `src/test/LogActivityWidget.test.tsx` (the +3-business-day test uses this exact pattern).
**Warning sign:** A test that fixes the system time and uses a literal interaction date.

### Pitfall 2: New `Date('yyyy-MM-dd')` parses as UTC and shifts a day west
**What goes wrong:** `prospect_interactions.date` is stored as `YYYY-MM-DD` (string). `new Date('2026-04-24')` is parsed as `2026-04-24T00:00:00Z`, which is `2026-04-23T20:00:00-04:00` in EDT. Day-arithmetic in EDT can be off-by-one if you do `Date.now() - new Date(dateStr).getTime()` near midnight.
**Prevention:** This is exactly the bug Phase 05 hit (STATE.md line 100: `parseLocalDate helper — new Date('yyyy-MM-dd') parses as UTC and drifts a day west in EDT`). Mitigation: compare in UTC space (use `Math.floor(diffMs / 86400000)` consistently — both sides are UTC ms). The existing `agingHelpers.ts:6` already does this correctly. The engine should mirror exactly that math.
**Warning sign:** Test asserting "1 day ago" but getting "today" or "2 days ago" near a date boundary.

### Pitfall 3: `prospect.contacts` undefined on stale rows
**What goes wrong:** `dbToProspect` always builds `contacts: contacts.map(...)` (line 30) so the array exists. But during optimistic local updates, `update()` may return a Prospect where `contacts` is `undefined` for one render frame.
**Prevention:** `const contacts = p.contacts || []` defensively at the top of `getRecommendation`. Same for `interactions`.
**Warning sign:** A `TypeError: Cannot read properties of undefined (reading 'some')` in a test that omits the `contacts` field.

### Pitfall 4: `competitor` field has a "Other: X" prefix that breaks equality checks
**What goes wrong:** `prospect.competitor` may be `""`, `"SOCi"`, `"Other"`, or `"Other: PowerListings"` (free text). Phase 03 inline-edit allows free-form competitor entry. The existing inline `whyActParts` at `:192-194` only matches `"SOCi"` and `"Birdeye"` exactly and silently drops the "Other: …" cases.
**Prevention:** In `buildCompetitorCallout`, normalize the `Other: X` form by stripping the prefix and using the suffix as the display name. Keep severity = "info" for unknown competitors. Source: `src/components/ProspectSheet.tsx:213-218` shows the "Other: " convention is the canonical free-text form.
**Warning sign:** A prospect with `competitor: "Other: PowerListings"` shows no competitor callout despite being on a competitor.

### Pitfall 5: Competitor callout for "Yext" or "Unknown" is meaningless
**What goes wrong:** `COMPETITORS` includes `"Yext"` (the user's own product — competitive context: "they're already using us") and `"Unknown"` (no real signal). Surfacing chips for these is noise.
**Prevention:** Explicitly skip `c === ""`, `c === "Unknown"`, `c === "Yext"` in `buildCompetitorCallout`. (The first is already a guard; the latter two are explicit.)
**Warning sign:** A prospect with `competitor: "Yext"` showing a "competing with Yext" chip in the card.

### Pitfall 6: Suggested-action template doesn't fit on one line at narrow widths
**What goes wrong:** On the mobile vaul Drawer the card body is ~280px wide. A 25-word sentence wraps to 4+ lines and dominates the card.
**Prevention:** Cap copy templates at ~16 words / ~120 chars. The templates above all fit. Verify by mounting in mobile emulation.
**Warning sign:** Manual UAT shows >2 lines of action text on iPhone-class viewports.

### Pitfall 7: Score updates don't trigger card re-render
**What goes wrong:** If the user edits `priority` from Cold → Hot inline, the score recomputes but the card uses `useMemo([prospect])` — and if `prospect` reference is stable across the update (it shouldn't be, but optimistic updates have caused this before), the memo doesn't fire.
**Prevention:** `useProspects.update()` at `:147` builds a fresh Prospect object via spread (`{ ...p, ...u }`), so the reference does change. `useMemo([prospect])` is correct. **Verify by adding a test**: render card, fire a re-render with a mutated prospect (different priority), assert chip text changes.
**Warning sign:** Card "Why call this account" line stays stale after an inline edit.

---

## Code Examples

### Engine usage in card body

```typescript
const rec = useMemo(() => getRecommendation(prospect), [prospect]);
// rec is { score, scoreLabel, scoreShort, scoreColor, callouts, suggestedAction, ... }
```

### Engine test scaffold

```typescript
// src/test/recommendation.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRecommendation } from "@/data/recommendation";
import { initProspect, type Prospect } from "@/data/prospects";

const today = (offsetDays = 0) => {
  const d = new Date("2026-04-24");
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const make = (overrides: Partial<Prospect>): Prospect =>
  initProspect({ id: "test-1", name: "Test Co", ...overrides });

describe("getRecommendation", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-24")));
  afterEach(() => vi.useRealTimers());

  it("Hot + Not Started raises critical 'Hot, not started'", () => {
    const r = getRecommendation(make({ priority: "Hot", outreach: "Not Started" }));
    expect(r.callouts.some(c => c.kind === "hot-not-started")).toBe(true);
    expect(r.suggestedAction).toMatch(/start.*today/i);
  });

  it("Score 60+ with no Decision Maker flags missing-decision-maker", () => {
    const r = getRecommendation(make({
      industry: "QSR/Fast Casual", locationCount: 500, priority: "Hot",
      contacts: [{ id: "c1", name: "x", email: "", phone: "", title: "", notes: "", role: "Champion" }],
    }));
    expect(r.callouts.some(c => c.kind === "missing-decision-maker")).toBe(true);
  });

  it("Never contacted at high score is critical", () => {
    const r = getRecommendation(make({ industry: "QSR/Fast Casual", locationCount: 500 }));
    expect(r.callouts[0].kind).toBe("never-contacted");
    expect(r.callouts[0].severity).toBe("critical");
  });

  it("90+ days stale is critical with day count in chip", () => {
    const r = getRecommendation(make({
      interactions: [{ id: "i1", type: "Email", date: today(120), notes: "" }],
    }));
    const chip = r.callouts.find(c => c.kind === "stale-90");
    expect(chip).toBeDefined();
    expect(chip!.text).toContain("120");
  });

  it("Hot + 14d stale flags going-cold", () => {
    const r = getRecommendation(make({
      priority: "Hot", outreach: "Actively Prospecting",
      interactions: [{ id: "i1", type: "Email", date: today(20), notes: "" }],
    }));
    expect(r.callouts.some(c => c.kind === "going-cold")).toBe(true);
  });

  it("Cold priority with score 60+ flags 'High potential, marked Cold'", () => {
    const r = getRecommendation(make({
      industry: "QSR/Fast Casual", locationCount: 500,
      priority: "Cold", outreach: "Actively Prospecting",
    }));
    expect(r.callouts.some(c => c.kind === "high-score-cold-priority")).toBe(true);
  });

  it("competitor='Yext' produces no competitor callout", () => {
    const r = getRecommendation(make({ competitor: "Yext" }));
    expect(r.callouts.find(c => c.kind === "competitor")).toBeUndefined();
  });

  it("competitor='Other: PowerListings' produces 'On PowerListings' callout", () => {
    const r = getRecommendation(make({ competitor: "Other: PowerListings" }));
    const chip = r.callouts.find(c => c.kind === "competitor");
    expect(chip?.text).toBe("On PowerListings");
  });

  it("callouts capped at 3 entries even when more apply", () => {
    const r = getRecommendation(make({
      priority: "Hot", outreach: "Not Started", competitor: "SOCi",
      industry: "QSR/Fast Casual", locationCount: 500,
      // never contacted, no DM, no contacts, hot-not-started, competitor → 5 candidates
    }));
    expect(r.callouts.length).toBeLessThanOrEqual(3);
  });

  it("returns deterministic suggestedAction for ideal prospect", () => {
    const r = getRecommendation(make({
      priority: "Warm", outreach: "Meeting Booked",
      contacts: [
        { id: "c1", name: "x", email: "", phone: "", title: "", notes: "", role: "Decision Maker" },
        { id: "c2", name: "y", email: "", phone: "", title: "", notes: "", role: "Champion" },
      ],
      interactions: [{ id: "i1", type: "Email", date: today(2), notes: "" }],
    }));
    expect(r.suggestedAction).toMatch(/meeting/i);
  });
});
```

### Card render test scaffold

```typescript
// src/test/RecommendationCard.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationCard } from "@/components/RecommendationCard";
import { initProspect } from "@/data/prospects";

describe("RecommendationCard", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-24")));

  it("renders score, label, callouts, and suggested action", () => {
    const p = initProspect({
      id: "1", name: "Acme", priority: "Hot", outreach: "Not Started",
      industry: "QSR/Fast Casual", locationCount: 500, competitor: "SOCi",
    });
    render(<RecommendationCard prospect={p} />);
    expect(screen.getByTestId("recommendation-card")).toBeInTheDocument();
    expect(screen.getByText(/why call this account/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot, not started/i)).toBeInTheDocument();
    expect(screen.getByText(/start.*today/i)).toBeInTheDocument();
  });

  it("renders compact variant without crashing", () => {
    const p = initProspect({ id: "1", name: "Acme" });
    render(<RecommendationCard prospect={p} compact />);
    expect(screen.getByTestId("recommendation-card")).toBeInTheDocument();
  });
});
```

---

## Plan Breakdown Recommendation

**Single plan: 06-01-PLAN.md — Score → Recommended Action card with engine, component, tests, and ProspectSheet mount**

Rationale: the engine is the load-bearing piece; the card and mount are thin wrappers. Splitting across plans creates artificial overhead. Two-task RED/GREEN cadence per project convention:

1. **Task 1 (RED, ~25 min):**
   - Create `src/data/recommendation.ts` with type exports and a stub `getRecommendation` returning a hardcoded `Recommendation` shape.
   - Create `src/test/recommendation.test.ts` with the 10 cases above as `it.todo` (or `it.skip` with bodies).
   - Create `src/components/RecommendationCard.tsx` shell that calls the stub and renders `<div data-testid="recommendation-card" />` with placeholder text.
   - Create `src/test/RecommendationCard.test.tsx` with 2 cases as `it.todo`.
   - Verify: `bunx vitest run src/test/recommendation.test.ts src/test/RecommendationCard.test.tsx` reports 12 todos, no failures.

2. **Task 2 (GREEN, ~50 min):**
   - Fill `getRecommendation` body (callouts, severity sort + cap, suggested-action template chain, helpers).
   - Fill `RecommendationCard` JSX with chips + suggested-action paragraph.
   - Mount `<RecommendationCard prospect={prospect} />` at `src/components/ProspectSheet.tsx:552` (first child of overview TabsContent).
   - Remove inline `whyActParts` memo at `:176-195` and its header render at `:504-508`.
   - Convert the 12 test placeholders to runnable assertions.
   - Verify: `bunx vitest run` green; manual smoke (open ProspectSheet, see card on Overview tab, switch to other tabs and back).

**Total estimated effort:** 60–90 minutes of agent execution time.

---

## Mobile considerations

- **Drawer rendering:** the card sits at the top of the Overview tab, which is already inside the responsive Sheet/Drawer wrapper from Phase 03. No additional layout work.
- **Chip wrap:** `flex flex-wrap gap-1.5` on the chip row handles narrow widths — chips drop to a second row at ~280px.
- **Touch target:** the card is read-only; no clickable elements. UX-V2-02 (44x44 min) does not apply.
- **Compact prop:** `compact={isMobile}` from `useIsMobile()` is optional. Default off — recommend the planner enable on mobile drawer only if real-device testing shows the card crowds the viewport. The shrink is mild (`p-2 space-y-1.5` vs `p-3 space-y-2`, `text-[11px]` vs `text-xs`).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `whyActParts` memo + amber paragraph next to header score | Extracted `getRecommendation` engine + `RecommendationCard` mounted on Overview tab | This phase | Testable, expandable, more visible (Overview tab vs squeezed in header tooltip area) |
| Score breakdown tooltip on header score | Same — kept; complementary to recommendation card | — | No change. Tooltip explains "how did we get this score?" while the card explains "what should I do about it?" |

**Deprecated/outdated:** the inline `whyActParts` block is fully replaced — REC-07 explicitly removes the memo and its render.

---

## Open Questions

1. **Should the card be conditionally hidden when there are no callouts AND no actionable suggested action?**
   - Even an "ideal" prospect gets a `"Maintain cadence"` line. That sentence has marginal value.
   - **Recommendation:** Always render. The score + label are useful at-a-glance even in the "ideal" case, and consistency beats conditional UI.

2. **Should "Customer" status produce a distinct card flavor (e.g., upsell-oriented)?**
   - Customers in the prospect list are renewal/upsell targets. The current engine flags them with an "Existing customer" info chip but uses generic action templates.
   - **Recommendation (deferred):** v1 uses generic copy. If user feedback flags this, add a `status === "Customer"` template branch in v2. The hook is in place via the `customer` callout kind.

3. **Should we surface signals (`prospectSignals`) in the recommendation?**
   - `Signal` (from `useSignals`) carries `relevance: "Hot" | "Warm" | "Low"`. A Hot signal in the last 7 days is highly relevant ("recent buying signal — strike now").
   - **Recommendation (deferred):** v1 omits signals. Adding signals doubles the surface area and the SignalsSection on the Overview tab already lists them prominently. Revisit if the recommendation feels thin in practice.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely client-side React + TS work using existing dependencies (lucide-react, vitest, react-testing-library, tailwind, clsx). No CLI tools, services, runtimes, or registrations beyond Bun + Vite already verified across Phases 01–05.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.0.0 |
| Config file | `vitest.config.ts` (jsdom env, globals enabled) |
| Setup file | `src/test/setup.ts` (matchMedia mock) |
| Quick run command | `bunx vitest run src/test/recommendation.test.ts src/test/RecommendationCard.test.tsx` |
| Full suite command | `bunx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REC-01 | Card mounts at top of Overview tab | manual UAT | open ProspectSheet, Overview tab, see card above Account Details | ❌ Manual |
| REC-02 | `getRecommendation` is pure, deterministic, returns shape | unit | `bunx vitest run src/test/recommendation.test.ts -t "deterministic"` | ❌ Wave 0 |
| REC-03 | Missing Decision Maker / Champion / no contacts callouts | unit | `... -t "Decision Maker"` and `... -t "no contacts"` | ❌ Wave 0 |
| REC-04 | Staleness thresholds (never / 30+ / 90+ / Hot+14) | unit | `... -t "stale"` and `... -t "never contacted"` | ❌ Wave 0 |
| REC-05 | Competitor callout for SOCi/Birdeye/Reputation, skips Yext/Unknown, parses "Other:" | unit | `... -t "competitor"` | ❌ Wave 0 |
| REC-06 | ≥10 unit tests for engine + ≥1 render test for card | unit | `bunx vitest run src/test/recommendation.test.ts src/test/RecommendationCard.test.tsx` | ❌ Wave 0 |
| REC-07 | Inline `whyActParts` removed from ProspectSheet | grep | `! grep -n whyActParts src/components/ProspectSheet.tsx` (must return non-zero) | ❌ Verify post-Task-2 |

### Sampling Rate

- **Per task commit:** `bunx vitest run src/test/recommendation.test.ts src/test/RecommendationCard.test.tsx`
- **Per wave merge:** `bunx vitest run`
- **Phase gate:** Full suite green + manual UAT for REC-01 (visual verification of card on Overview tab) + grep check for REC-07.

### Wave 0 Gaps

- [ ] `src/data/recommendation.ts` — engine module (does not exist yet)
- [ ] `src/components/RecommendationCard.tsx` — card component (does not exist yet)
- [ ] `src/test/recommendation.test.ts` — engine table-driven tests (does not exist yet)
- [ ] `src/test/RecommendationCard.test.tsx` — card render tests (does not exist yet)
- [ ] No new framework install needed; Vitest infra is set up.

---

## Project Constraints (from CLAUDE.md)

- **Inline editing pattern:** the card is read-only; does not consume the inline-edit pattern. No conflict.
- **Sub-collection replace warning:** card never calls `update()`. No risk.
- **Optimistic updates note:** card re-renders when prospect changes (via parent re-render) — `useMemo([prospect])` is the safe pattern.
- **Owner-only features:** card is visible to all roles (viewer/editor/owner). No gating needed.
- **TerritoryPlanner is ~1000 lines:** card mounts in ProspectSheet, not TerritoryPlanner. No size concern.
- **CSS custom classes preserved:** card uses standard Tailwind tokens + `border-border` / `bg-card` / `text-muted-foreground`. No removal of `glass-card`, `aging-*`, `glow-blue`, etc.
- **Score does not drive actions (known gap):** Phase 06 closes this gap explicitly — score now drives the suggested action via the recommendation engine.
- **`./CLAUDE.md` priority roadmap item #5:** "Surface a 'Why call this account' block in ProspectSheet header using score breakdown data + contact coverage gaps + staleness." — Phase 06 fulfills this with one deviation: the block lives at the top of the **Overview tab body**, not the **header**, because the header is already crowded with score, status, tier, name, and three action buttons. The Overview tab is the natural body landing zone and matches the tabbed-IA decision from Phase 03.

---

## Sources

### Primary (HIGH confidence — direct code inspection)

- `src/components/ProspectSheet.tsx` — full file (1,100 lines): mount target at `:552-555`, existing `whyActParts` memo at `:176-195`, header score render at `:498-526`, score+breakdown imports at `:6`, prospect+contacts+signals props at `:99-100`, `useIsMobile` import at `:29`
- `src/data/prospects.ts` — full file (621 lines): `scoreProspect` at `:199-229`, `scoreBreakdown` at `:165-185`, `getScoreLabel` at `:187-193`, `CONTACT_ROLES` at `:61-70`, `RELATIONSHIP_STRENGTHS` at `:72-78`, `INTERACTION_TYPES` at `:45`, `STAGES` at `:1-7`, `PRIORITIES` at `:12`, `STATUSES` at `:9-10`, `COMPETITORS` at `:47-59`, `Prospect` interface at `:123-157`, `Contact` interface at `:83-94`, `InteractionLog` interface at `:96-101`, `initProspect` at `:231-266`
- `src/components/territory/agingHelpers.ts` — full file (40 lines): `getAgingClass` at `:3-10`, `getAgingLabel` at `:12-19`, `relativeTime` at `:21-31`, `STAGE_COLORS` at `:33-39`
- `src/components/territory/ScoreBadge.tsx` — full file (57 lines): existing tooltip-style score display reference; uses same `getScoreLabel` + `scoreBreakdown`
- `src/hooks/useProspects.ts` — `dbToProspect` at `:8-32` confirms `contacts: contacts.map(...)` is always an array, `lastTouched: row.last_touched` confirms field naming
- `src/test/LogActivityWidget.test.tsx` (referenced via Phase 05 RESEARCH.md) — pattern reference for `vi.useFakeTimers().setSystemTime()` in tests with date-sensitive logic
- `src/test/ProspectSheet.tab.test.tsx` — pattern reference for ProspectSheet render tests (`makeProspect` factory, `renderSheet` helper, Radix Tabs `pointerDown + mouseDown + click` sequence — relevant if any test asserts the card is in the Overview tab)
- `.planning/PROJECT.md` — phase scope, "must never silently lose data" core value (card is read-only, so no data-loss risk)
- `.planning/ROADMAP.md` — Phase 6 entry at `:113-121`, marked TBD; Phase 5 dependency complete
- `.planning/REQUIREMENTS.md` — REC-* requirement IDs not yet present (this research proposes REC-01..REC-07); LOG-01..LOG-06 in `:48-55` show the pattern
- `.planning/STATE.md` — Phase 5 verified PASS (line 30); Phase 6 ready to start; date-parsing pitfall logged at line 100
- `./CLAUDE.md` — priority roadmap item #5 at `:266-268` ("Score → Recommended Action"); known-pattern #8 at `:233` ("Score does not drive actions" — known tech debt this phase closes)
- `package.json` — confirms no new deps needed: lucide-react, clsx, tailwind-merge, vitest, @testing-library/react all present

### Secondary (HIGH confidence — stable knowledge)

- Tailwind CSS variable HSL pattern (`hsl(var(--primary))`) — established project convention; see `tailwind.config.ts`
- React `useMemo` semantics — referential-equality dependency; spreading creates new ref → memo recomputes (relevant for engine call in card)

### Tertiary (LOW confidence — flagged for verification)

- None. All findings are from direct code inspection of files that exist in the worktree as of 2026-04-24. The recommendation engine and card design are direct extensions of existing patterns; no novel external libraries or APIs are required.

---

## Metadata

**Confidence breakdown:**

- Mount location and existing `whyActParts` block: HIGH — read directly from source
- Engine input shape (Prospect, Contact[], scoreBreakdown): HIGH — read directly from source
- Aging-threshold reuse from `agingHelpers.ts`: HIGH — read directly from source
- Recommendation rules and severity ordering: HIGH (derived from existing `whyActParts` + CLAUDE.md priority #5 wording + sales playbook semantics in Yext context section of CLAUDE.md)
- Suggested-action copy templates: MEDIUM — directionally correct but tunable; planner can adjust before commit. Templates above are starting points, not locked text.
- Plan breakdown (1 plan, 2 tasks RED/GREEN): HIGH — matches Phase 05 cadence and project pattern in STATE.md performance metrics
- Tests as table-driven: HIGH — Vitest pattern proven in Phase 05

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable domain; engine logic is data-driven and won't drift unless `Prospect` schema changes)
