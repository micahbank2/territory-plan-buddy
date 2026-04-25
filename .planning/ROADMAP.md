# Roadmap: Territory Plan Buddy — Hardening & Polish

## Overview

Four sequential phases that transform a working-but-fragile app into a reliable, maintainable, and AI-enhanced sales tool. Phase 1 fixes the most urgent correctness failures (silent data loss, live API key exposure, XSS). Phase 2 migrates the data layer to TanStack Query for structural rollback correctness. Phase 3 decomposes god components and delivers the tabbed ProspectSheet that Phase 4 needs as its mount point. Phase 4 lands the in-app AI capabilities. Each phase is independently shippable and unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Integrity & Security** - Fix silent data loss, direct CRUD for sub-collections, real soft delete, XSS sanitization, and API key moved to Edge Function
- [ ] **Phase 2: TanStack Query Migration** - Migrate all data fetching and mutations to TanStack Query with structural rollback, cache invalidation, and lazy sub-collection loading
- [ ] **Phase 3: Component Decomposition & UX Polish** - Decompose TerritoryPlanner god component, add tabbed ProspectSheet layout
- [x] **Phase 4: AI Capabilities** - Draft emails post-outreach tracking: batch persistence, pending outreach badge, mark-as-sent dialog, bulk Mark Contacted action (completed 2026-03-30)
- [x] **Phase 5: Log + Next Step Widget** - Extract and harden the unified Log Activity widget on ProspectSheet: +3-business-day default, partial-failure handling, test coverage (completed 2026-04-24)
- [x] **Phase 6: Score → Recommended Action** - Promote inline whyActParts into a tested RecommendationCard at the top of the Overview tab; pure deterministic engine surfaces score + callouts + a single suggested-action sentence (completed 2026-04-25)
- [ ] **Phase 7: Weighted Pipeline Forecast** - Promote the inline two-column forecast on Opportunities into a tested pure engine + dedicated PipelineForecastBar with segmented stage bar, quota %, and empty-state card
- [ ] **Phase 8: Meeting Prep One-Pager** - Promote the inline meeting-prep dialog out of ProspectSheet into a tested forwardRef MeetingPrepDialog with a six-section structured markdown brief (Context / Recent History / Contacts / Open Tasks / Talking Points / Suggested Ask) rendered via react-markdown; edge-function prompt rewritten to enforce the contract and anchor Talking Points on Yext positioning

## Phase Details

### Phase 1: Data Integrity & Security
**Goal**: The app never silently loses data and exposes no secrets in the client bundle
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. When a Supabase write fails, the user sees an error toast and the UI reverts to the value before the edit
  2. Updating interactions, notes, or tasks on a prospect uses per-row insert/update/delete — no delete-all-then-reinsert
  3. User can archive a prospect from the main list and it disappears; an "Archived" view shows archived prospects with Restore and Permanently Delete actions
  4. Anthropic API calls route through a Supabase Edge Function — no VITE_ANTHROPIC_API_KEY in the client bundle
  5. HTML rendered in notes fields is sanitized through DOMPurify before display
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Test scaffolds for all 11 phase requirements
- [x] 01-02-PLAN.md — Error rollback + direct sub-collection CRUD (DATA-01–04)
- [x] 01-03-PLAN.md — XSS sanitization + API key migration to Edge Function (SEC-01–03)
- [x] 01-04-PLAN.md — Soft delete + archive view with Restore and Permanently Delete (DATA-05–08)

### Phase 2: TanStack Query Migration
**Goal**: Data fetching and mutations use TanStack Query with proper cache, rollback, and on-demand sub-collection loading
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. The initial prospect list loads without fetching contacts, interactions, notes, tasks, or custom_logo — sub-collections load only when a prospect is opened
  2. When a mutation fails mid-flight, the UI automatically reverts to the server state without a page reload
  3. Failed writes trigger an error toast and leave the input in its pre-edit state — no manual refresh needed to recover
  4. All data hooks (useProspects, useSignals, useOpportunities, useTerritories) use useQuery and useMutation internally; their external API signatures remain unchanged
**Plans**: TBD

### Phase 3: Component Decomposition & UX Polish
**Goal**: TerritoryPlanner is decomposed into focused sub-components and ProspectSheet has a tabbed layout that AI features can mount into
**Depends on**: Phase 2
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. ProspectSheet displays four tabs — Overview, Activity, Contacts, Tasks — and the selected tab persists while switching between prospects (resets to Overview when sheet closes and reopens)
  2. TerritoryPlanner.tsx coordinator is under 400 lines; filter state lives in ProspectFilterBar, inline editing in ProspectTable, bulk actions in BulkActionBar, dialog triggers in TerritoryDialogGroup
  3. Opening a new prospect from the table does not reset the active tab to Overview while the sheet stays open
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Responsive Sheet/Drawer swap for ProspectSheet + test scaffolds (closes audit gap, sets up plan 02 RED targets)
- [x] 03-02-PLAN.md — Tabbed ProspectSheet IA with lifted sheetTab state in coordinator (UX-01, UX-02)
- [x] 03-03-PLAN.md — Extract ProspectFilterBar, BulkActionBar, TerritoryDialogGroup; drive TerritoryPlanner under 400 lines (UX-03, UX-04)

**UI hint**: yes

### Phase 4: AI Capabilities
**Goal**: Close the loop on the draft emails workflow with post-outreach tracking — pending batch persistence, badge indicator, mark-as-sent dialog, and bulk Mark Contacted action
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Generating a prompt in ContactPickerDialog saves the selected contacts as a pending outreach batch in localStorage
  2. Draft Emails button shows a badge with pending contact count; clicking it opens PendingOutreachDialog where user can mark contacts as sent (logging Email interactions and bumping outreach stages)
  3. Bulk "Mark Contacted" action in the table selection bar logs Email interactions and bumps stages for all selected prospects
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Bring ContactPickerDialog from quirky-buck to main + create pendingBatch persistence layer (AI-01, AI-02)
- [x] 04-02-PLAN.md — PendingOutreachDialog, badge on Draft Emails button, bulk Mark Contacted action (AI-03, AI-04)

### Phase 5: Log + Next Step Widget

**Goal:** Extract the inline Log Activity widget from ProspectSheet into a standalone, tested component that reliably creates an interaction and an optional follow-up task in one submit — with a sensible +3-business-day default due date and no silent data loss on partial failure
**Depends on:** Phase 4
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, LOG-05, LOG-06
**Success Criteria** (what must be TRUE):
  1. A single widget on the Activity tab accepts interaction type + notes + an optional follow-up task (text + due date) and commits both rows to Supabase on one click
  2. Toggling the follow-up task ON pre-fills the due date to +3 business days from today (skips weekends); the user can override via the date picker
  3. When the submit partially fails (interaction landed, task did not — or vice versa), the user sees a clear error toast distinct from the success toast AND the form retains the unsaved input so the typed data is never silently lost
  4. A successful submit bumps `prospects.last_touched` to today so the aging dot on the main list refreshes immediately
  5. The widget renders correctly inside both the desktop Sheet and the mobile vaul Drawer (Phase 03 responsive wrapper)
  6. No duplicate logging UI remains inside the Activity tab — LogActivityWidget is the single surface; the old separate Log Interaction + independent task-add blocks are removed
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Extract LogActivityWidget, add +3-business-day default + partial-failure handling, non-breaking hook signature change, and full test coverage for LOG-01/02/03

### Phase 6: Score → Recommended Action

**Goal:** Promote the existing inline `whyActParts` chip block at `ProspectSheet.tsx:176-195` into a dedicated, tested `RecommendationCard` mounted at the top of the Overview tab. The recommendation engine becomes a pure deterministic TypeScript function (`getRecommendation(p)`) covered by table-driven unit tests; the card surfaces score + label + up to 3 severity-ranked callout chips + a single concrete suggested-action sentence. Closes CLAUDE.md priority roadmap item #5 and the known tech-debt note that "the score does not drive actions."
**Depends on:** Phase 5
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07
**Success Criteria** (what must be TRUE):
  1. Opening any prospect's sheet shows a RecommendationCard at the top of the Overview tab (immediately above Account Details), rendering score + label + 0–3 callout chips + one suggested-action sentence
  2. Hot + Not Started prospects surface a "Hot, not started" critical chip and a corresponding "start a first-touch sequence today" action
  3. Score 40+ prospects with no Decision Maker contact surface a "Missing Decision Maker" warn chip; score 60+ with no Champion (and DM present) surface a "Missing Champion" info chip
  4. Staleness chips fire correctly: never-contacted at score≥40 → critical; >90d → critical with day count; Hot+>14d → "Hot going cold" warn; >30d → "Nd since touch" warn — exclusive chain, only one of these fires
  5. Competitor chips fire for SOCi/Birdeye/Reputation.com (warn) and other named competitors (info); "Other: X" prefix is stripped before display; "Yext" / "Unknown" / "" produce zero competitor chip
  6. The recommendation engine is covered by ≥10 unit tests under fixed system time (vi.useFakeTimers) and the card has ≥1 render smoke test, all passing under `bunx vitest run`
  7. The inline `whyActParts` memo and its render in the header are removed (`rg -n whyActParts src/` returns zero matches); RecommendationCard is the sole "why act" surface
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Engine + card + ProspectSheet mount + delete inline whyActParts (REC-01..REC-07)

### Phase 7: Weighted Pipeline Forecast

**Goal:** Promote the inline `STAGE_WEIGHTS` map + `weightedACV` memo + two-column forecast JSX from `OpportunitiesPage.tsx:45-53/274-279/340-357` into a tested pure TypeScript engine (`src/data/forecast.ts`) and a dedicated `PipelineForecastBar` component mounted above the Opportunities List View. The engine becomes deterministic and table-driven testable across all 10 OPP_STAGES (Develop=10% / Discovery=20% / Business Alignment=35% / Validate=50% / Propose=70% / Negotiate=85% / Won=Closed Won=100% booked / Closed Lost=Dead excluded). The bar adds quota %, a per-stage segmented horizontal bar with shadcn Tooltip per segment, and an empty-state card for territories with no open deals. Closes CLAUDE.md priority roadmap item #7 and the implicit "stage does not drive forecast visibility" gap.
**Depends on:** Phase 6
**Requirements**: FORECAST-01, FORECAST-02, FORECAST-03, FORECAST-04, FORECAST-05, FORECAST-06, FORECAST-07, FORECAST-08
**Success Criteria** (what must be TRUE):
  1. Visiting `/opportunities` for a territory with open deals renders `<PipelineForecastBar>` between `<QuotaHeroBoxes />` and the List View; territories with zero open deals render the "No active pipeline" empty-state card
  2. The bar headline shows weighted total (primary color, font-mono, 2xl), raw open total + deal count, booked total (only when >0), and right-aligned "% of FY27 Quota" with quota dollar value subline (~$615k from `DEFAULT_QUOTAS` / `localStorage["my_numbers_v2"]`)
  3. A segmented horizontal bar renders one tinted segment per active open stage with width proportional to that stage's weighted contribution; each segment exposes a hover tooltip with stage name, deal count, weighted ACV, and weight percentage
  4. `forecastPipeline(opps, quota)` is a pure deterministic TS function — no React, no async, no clock reads, no side effects — and `STAGE_WEIGHTS` covers all 10 OPP_STAGES with correct values and classifications (open / booked / lost)
  5. The forecast engine is covered by ≥10 table-driven unit tests in `src/test/forecast.test.ts` (per-stage weights, classification rules, sort order, pctOfQuota math including quota=0 edge case, multi-deal aggregation) and the component has ≥3 render tests in `src/test/PipelineForecastBar.test.tsx` (headline, empty state, quota % from localStorage), all passing under `bunx vitest run`
  6. The inline `STAGE_WEIGHTS` constant, `weightedACV` `useMemo`, and two-column forecast JSX are removed from `OpportunitiesPage.tsx` (`! grep -n "STAGE_WEIGHTS\|weightedACV" src/pages/OpportunitiesPage.tsx` returns zero matches); `PipelineForecastBar` is the sole forecast surface
  7. The bar uses ONLY existing tokens (`border-border`, `bg-muted/30`, `text-primary`, `bg-emerald-500`, `bg-amber-500`, `bg-slate-400`, etc.) and reuses the `OpportunityKanban` color palette via `STAGE_BAR_COLORS` — no new CSS classes, no new tailwind config keys, no new dependencies
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Engine + bar + OpportunitiesPage mount + delete inline forecast (FORECAST-01..FORECAST-08)

### Phase 8: Meeting Prep One-Pager

**Goal:** Promote the inline meeting-prep dialog (state at `ProspectSheet.tsx:144-145`, generator at `:298-332`, copy at `:334-339`, PDF export at `:341-369`, trigger at `:510-512`, Dialog markup at `:1023-1054` — ~95 lines total) into a dedicated, tested `MeetingPrepDialog` component using the **forwardRef + useImperativeHandle** pattern proven in `TerritoryDialogGroup` (Phase 03). Pair extraction with a stable six-section markdown contract from the edge function (`## Context` / `## Recent History` / `## Contacts` / `## Open Tasks` / `## Talking Points` / `## Suggested Ask`) parsed by a pure `parseMeetingBrief` function and rendered as six labeled sections via `react-markdown` (already in `package.json`, currently unused in `src/`). Talking Points are anchored on Yext positioning (AI search visibility / brand consistency / local SEO / competitive displacement of SOCi/Birdeye/Uberall/Chatmeter/Rio SEO) via prompt constraint. Suggested Ask is enforced as a single sentence. Copy + PDF export carry over verbatim. Closes CLAUDE.md priority roadmap item #8 ("Meeting Prep Skill").
**Depends on:** Phase 7
**Requirements**: PREP-01, PREP-02, PREP-03, PREP-04, PREP-05, PREP-06, PREP-07, PREP-08
**Success Criteria** (what must be TRUE):
  1. Clicking "Meeting Prep" in any ProspectSheet header opens `<MeetingPrepDialog>` via `meetingPrepRef.current?.open(prospect)`; ProspectSheet retains zero `meetingPrep*` state vars (grep guard)
  2. The edge function returns markdown with exactly six labeled headers in fixed order; the parser tolerates a missing section by returning an empty string and the UI renders a "None on file." placeholder without crashing
  3. Each of the six sections renders with a header chip + a `react-markdown` body (inline `**bold**` and bullets, no `whitespace-pre-wrap` fallback)
  4. Talking Points reference Yext positioning (enforced by edge-function system prompt at `supabase/functions/meeting-prep/index.ts`); Suggested Ask is a single sentence (not a bullet list)
  5. Copy button writes the full markdown brief to clipboard; Export PDF opens print window with formatted brief — both behaviors preserved verbatim
  6. Loading state shows spinner + "Generating meeting prep..." copy; error state surfaces `toast.error(msg)` and closes dialog
  7. The parser is covered by ≥4 unit tests in `src/test/meetingBrief.test.ts` (well-formed brief, missing section tolerance, noise tolerance, raw passthrough) and the dialog by ≥5 component tests in `src/test/MeetingPrepDialog.test.tsx` (closed by default, loading state, six sections rendered, copy → clipboard, error toast), all passing under `bunx vitest run`
  8. Inline `meetingPrep*` references in `ProspectSheet.tsx` are removed: `grep -nE "meetingPrepBrief|meetingPrepLoading|generateMeetingPrep|copyMeetingPrep|exportMeetingPrepPdf|showMeetingPrepDialog" src/components/ProspectSheet.tsx` returns zero matches; `<MeetingPrepDialog>` is the sole meeting-prep surface
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Parser + dialog + ProspectSheet mount + edge-function prompt rewrite + delete inline meeting-prep (PREP-01..PREP-08)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Integrity & Security | 4/4 | Complete (checkpoint pending) | 2026-03-26 |
| 2. TanStack Query Migration | 0/? | Not started | - |
| 3. Component Decomposition & UX Polish | 3/3 | Complete | 2026-04-24 |
| 4. AI Capabilities | 2/2 | Complete   | 2026-03-30 |
| 5. Log + Next Step Widget | 1/1 | Complete   | 2026-04-24 |
| 6. Score → Recommended Action | 1/1 | Complete | 2026-04-25 |
| 7. Weighted Pipeline Forecast | 1/1 | Complete | 2026-04-25 |
| 8. Meeting Prep One-Pager | 1/1 | Complete | 2026-04-25 |
| 9. Daily Briefing | 1/1 | Complete (PR #9 awaiting merge) | 2026-04-25 |
| 10. My Numbers Polish | 0/2 | Planned | - |

### Phase 10: My Numbers Polish

**Goal:** Harden the FY27 commission tracker (`src/pages/MyNumbersPage.tsx`) by extracting six untested pure comp-math functions into `src/data/myNumbers/comp.ts` (≥12 unit-test cases), consolidating four duplicate copies of `FY27_MONTHS` + `DEFAULT_QUOTAS` into a shared `src/data/myNumbers/storage.ts` module, fixing the navigate-in-render anti-pattern at MyNumbersPage.tsx:347-350, and shipping the CLAUDE.md priority #10 mandate — a "Trends" tab with three new recharts visualizations (Quota Attainment %, Activity Rate, Pipeline Coverage) — paired with a sub-component decomposition that drops the coordinator from 875 lines to ≤400 lines.

**Depends on:** None (read-only audit/extend pass on existing MyNumbersPage)
**Requirements**: NUM-01, NUM-02, NUM-03, NUM-04, NUM-05, NUM-06, NUM-07, NUM-08
**Success Criteria** (what must be TRUE):
  1. The 6 pure commission math functions live in `src/data/myNumbers/comp.ts` (zero React, zero localStorage, zero side effects) and are covered by ≥12 unit tests in `src/test/myNumbers/comp.test.ts` — tier1/tier2/tier3 boundaries, YTD-accelerator on/off, calcAnnualAccel tiered rates, renewalPayoutPct breakpoints, calcLargeRenewalAddon U4R + retention floors, calcAddOnPayouts duration gate + Kong delta clamps
  2. `FY27_MONTHS` and `DEFAULT_QUOTAS` are declared exactly once in `src/data/myNumbers/storage.ts` (`grep -rE "^const FY27_MONTHS = \[" src/` returns 1 match); MyNumbersPage, QuotaHeroBoxes, PipelineForecastBar, and useTerritoryPlannerSelectors all import from the shared module
  3. The non-owner redirect on `/my-numbers` uses `useEffect` instead of synchronous navigate during render — no console "Cannot update a component while rendering" warning
  4. A new "Trends" tab on MyNumbersPage renders three vertically stacked charts: cumulative YTD attainment % (with 100% reference line), Activity Rate (Meetings + Touches dual-line), and Pipeline Coverage (monthly pipeline ÷ monthly quota with 3x reference line)
  5. After decomposition, `src/pages/MyNumbersPage.tsx` is ≤400 lines; sub-components live in `src/components/myNumbers/` (SummaryCardRow, IncrementalTab, RenewalTab, MyNumbersTrendsTab, AddonsSection, EarningsSummary, MyNumbersChart, SettingsDialog); the coordinator owns all state and passes typed props
  6. EditableCell forwards an `aria-label` prop to both `<input>` and `<span>`; every callsite passes a meaningful label (e.g., "Quota for Mar 2026")
  7. `text-[10px]` arbitrary size at MyNumbersPage.tsx:722 is replaced with `text-xs`
  8. Full Vitest suite passes; `npx tsc --noEmit` clean; `bun run build` clean; manual UAT confirms identical numbers, identical edit-cell behavior, and identical Settings dialog before/after

**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md — Tests-first foundation: extract comp.ts + storage.ts, fix navigate-in-render, wire 4 callers, add aria-label + text-xs (NUM-01..04, NUM-06, NUM-08)
- [ ] 10-02-PLAN.md — Trends tab (3 charts) + sub-component decomposition to ≤400 lines (NUM-05, NUM-07)
