# Requirements: Territory Plan Buddy — Hardening & Polish

**Defined:** 2026-03-26
**Core Value:** The app must never silently lose data. Every edit must either persist to Supabase or visibly fail with a clear error.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Data Integrity

- [x] **DATA-01**: User sees an error toast when a Supabase write fails, and the UI reverts to the pre-edit state
- [x] **DATA-02**: Updating a prospect's interactions uses direct row-level CRUD (insert new, update changed, delete removed) instead of delete-all + re-insert
- [x] **DATA-03**: Updating a prospect's notes uses direct row-level CRUD instead of delete-all + re-insert
- [x] **DATA-04**: Updating a prospect's tasks uses direct row-level CRUD instead of delete-all + re-insert
- [x] **DATA-05**: User can archive a prospect (soft delete) and it disappears from the main list
- [x] **DATA-06**: User can view archived prospects in a separate view
- [x] **DATA-07**: User can restore an archived prospect back to the main list
- [x] **DATA-08**: User can permanently delete an archived prospect

### Security

- [x] **SEC-01**: Anthropic API calls route through a Supabase Edge Function, not directly from the browser
- [x] **SEC-02**: VITE_ANTHROPIC_API_KEY is removed from client-side environment variables
- [x] **SEC-03**: Rich text notes rendered with dangerouslySetInnerHTML are sanitized with DOMPurify before display

### UX Polish

- [x] **UX-01**: ProspectSheet displays content in tabs: Overview, Activity, Contacts, Tasks
- [x] **UX-02**: Tab selection persists while the sheet is open (switching between prospects resets to Overview)
- [x] **UX-03**: TerritoryPlanner.tsx is decomposed into sub-components: FilterBar, ProspectTable, BulkActions bar, and dialog launchers
- [x] **UX-04**: TerritoryPlanner.tsx coordinator component is under 400 lines after decomposition

### Performance

- [ ] **PERF-01**: Data fetching for prospects uses TanStack Query useQuery with proper cache keys
- [ ] **PERF-02**: Data mutations use TanStack Query useMutation with onMutate/onError/onSettled rollback pattern
- [ ] **PERF-03**: Sub-collections (contacts, interactions, notes, tasks) are loaded on-demand when a prospect is opened, not on initial page load
- [ ] **PERF-04**: Initial prospect list query excludes sub-collection data and custom_logo field

### AI Capabilities

- [x] **AI-01**: User can click a button in ProspectSheet to generate a draft cold email using prospect context (name, industry, location count, competitor, contacts, recent interactions)
- [x] **AI-02**: Generated email displays inline in ProspectSheet with a copy-to-clipboard button
- [x] **AI-03**: User can click a button in ProspectSheet to research a prospect (company intel, digital presence, recent news)
- [x] **AI-04**: Research results display inline in ProspectSheet with key findings surfaced

### Log + Next Step Widget

- [x] **LOG-01**: A single widget on the ProspectSheet Activity tab captures interaction type + notes + an optional follow-up task in one submit (creates both the interaction row and the task row from one click when the follow-up toggle is on)
- [x] **LOG-02**: When the follow-up task toggle is turned on, the due-date input defaults to +3 business days from today (skips Saturday and Sunday) and remains user-editable via the date picker
- [x] **LOG-03**: When the widget submit partially fails (e.g., interaction saves but task does not), the user sees a clear error toast distinct from the success path and the form retains the unsaved input so no typed data is silently lost
- [x] **LOG-04**: Submitting an activity bumps `prospects.last_touched` to today so the aging-dot staleness indicator refreshes immediately
- [x] **LOG-05**: The widget renders correctly inside both the desktop Sheet and the mobile vaul Drawer wrapper from Phase 03
- [x] **LOG-06**: The old separate "Log Interaction" and independent task-add sub-sections inside the Activity tab are removed — LogActivityWidget is the single logging surface (no duplicate forms)

### Score → Recommended Action

- [x] **REC-01**: A `RecommendationCard` renders at the top of the ProspectSheet Overview tab (above Account Details), summarizing score + label + at most 3 callout chips + a single suggested-action sentence
- [x] **REC-02**: A pure function `getRecommendation(p: Prospect)` returns a deterministic `Recommendation` object with `{ score, scoreLabel, callouts, suggestedAction }` — no LLM, no async, no side effects
- [x] **REC-03**: The recommendation surfaces contact-coverage gaps (missing Decision Maker, missing Champion, no contacts at all) using `prospect.contacts`
- [x] **REC-04**: The recommendation surfaces staleness using the same thresholds as `getAgingClass` (<7d / 7–30d / 30+d / never), with an extra "Hot going cold" rule at 14+d for Hot prospects and a critical "stale-90" rule past 90 days
- [x] **REC-05**: The recommendation surfaces competitor pressure when `prospect.competitor` is set, with warn severity for SOCi/Birdeye/Reputation.com, info severity for other named competitors, "Other: X" prefix stripped, and silence on `""` / `"Unknown"` / `"Yext"`
- [x] **REC-06**: The engine is covered by table-driven unit tests in `src/test/recommendation.test.ts` (≥10 representative cases) and the card has at least one render test in `src/test/RecommendationCard.test.tsx`
- [x] **REC-07**: The existing inline `whyActParts` memo at `ProspectSheet.tsx:176-195` and its render at `:504-508` are removed — `RecommendationCard` is the single surface for "why act on this account"

### Weighted Pipeline Forecast

- [x] **FORECAST-01**: A `PipelineForecastBar` component renders above the Opportunities List View — between `QuotaHeroBoxes` and the table — for every territory state where opportunities exist (with an internal empty-state branch when zero open deals)
- [x] **FORECAST-02**: A pure function `forecastPipeline(opps: Opportunity[], quota: number): Forecast` is the single source of truth for forecast math — deterministic, no React, no async, no clock reads, no side effects
- [x] **FORECAST-03**: Stage weights cover all 10 OPP_STAGES with correct values and classifications: Develop=10% / Discovery=20% / Business Alignment=35% / Validate=50% / Propose=70% / Negotiate=85% (all "open"); Won=Closed Won=100% ("booked", NOT counted in weighted open pipeline); Closed Lost=Dead=excluded ("lost")
- [x] **FORECAST-04**: The bar headline shows weighted pipeline total + raw open total + booked total (when >0) + "% of FY27 Quota" with the quota dollar value visible in a subline; quota source is `localStorage["my_numbers_v2"]` summed over FY27 with `DEFAULT_QUOTAS` fallback (~$615k)
- [x] **FORECAST-05**: A segmented horizontal bar renders one tinted segment per active open stage with width proportional to that stage's weighted contribution; segments use `STAGE_BAR_COLORS` keyed to the existing `OpportunityKanban` palette (no new color tokens)
- [x] **FORECAST-06**: Each segment exposes a hover tooltip (shadcn `Tooltip`) showing stage name, deal count, weighted ACV, and weight percentage
- [x] **FORECAST-07**: When zero open opportunities exist (territory has only Closed Won / Closed Lost / Dead deals), the bar renders a "No active pipeline" empty-state card with a CTA-style icon and no segmented bar
- [x] **FORECAST-08**: The inline `STAGE_WEIGHTS` constant (was `OpportunitiesPage.tsx:45-53`), `weightedACV` `useMemo` (was `:274-279`), and inline two-column forecast JSX (was `:340-357`) are deleted — single source of truth lives in `src/data/forecast.ts` + `src/components/PipelineForecastBar.tsx`

### Meeting Prep One-Pager

- [x] **PREP-01**: A `<MeetingPrepDialog>` component exists at `src/components/MeetingPrepDialog.tsx`, owns all meeting-prep state (loading, brief, open, prospect), and is mounted in `ProspectSheet` via `forwardRef + useImperativeHandle` (`meetingPrepRef.current?.open(prospect)`) — `ProspectSheet.tsx` retains zero `meetingPrep*` state vars
- [x] **PREP-02**: The edge function `meeting-prep` returns markdown with exactly six labeled headers in fixed order: `## Context`, `## Recent History`, `## Contacts`, `## Open Tasks`, `## Talking Points`, `## Suggested Ask`
- [x] **PREP-03**: Each section in the dialog renders with a clear header chip + a `react-markdown` body (inline `**bold**` and bullet support); the parser tolerates a missing section by returning empty string and the UI renders a "None on file." placeholder without crashing
- [x] **PREP-04**: Talking Points are anchored on Yext positioning — each bullet must reference at least one of: AI search visibility, multi-location brand consistency, local SEO at scale, or competitive displacement of {SOCi, Birdeye, Uberall, Chatmeter, Rio SEO} (enforced by edge-function system prompt)
- [x] **PREP-05**: The Suggested Ask section is a single concrete sentence (not a bullet list) — enforced by edge-function prompt and validated by manual UAT
- [x] **PREP-06**: The Copy button writes the full markdown brief to clipboard (`navigator.clipboard.writeText(brief.raw)`) and the Export PDF button opens a print window with the formatted brief — both behaviors preserved verbatim from the previous inline implementation
- [x] **PREP-07**: Loading state renders a spinner + "Generating meeting prep..." copy; error state surfaces `toast.error(msg)` and closes the dialog (matches previous inline behavior)
- [x] **PREP-08**: Inline `meetingPrep*` references in `ProspectSheet.tsx` are removed — `grep -nE "meetingPrepBrief|meetingPrepLoading|generateMeetingPrep|copyMeetingPrep|exportMeetingPrepPdf|showMeetingPrepDialog" src/components/ProspectSheet.tsx` returns zero matches; the only remaining meeting-prep code is the import, the `meetingPrepRef` declaration, the button `onClick={() => meetingPrepRef.current?.open(prospect)}`, and the single `<MeetingPrepDialog />` mount

### My Numbers Polish

- [ ] **NUM-01**: All six commission math functions (`calcIncrementalForMonth`, `calcAnnualAccel`, `calcRenewalForMonth`, `renewalPayoutPct`, `calcLargeRenewalAddon`, `calcAddOnPayouts`) are extracted from `src/pages/MyNumbersPage.tsx` into a pure module `src/data/myNumbers/comp.ts` — zero React imports, zero localStorage reads, zero side effects
- [ ] **NUM-02**: Comp math is covered by ≥12 unit tests in `src/test/myNumbers/comp.test.ts` covering tier1/tier2/tier3 boundaries, YTD-accelerator on/off, calcAnnualAccel tiered rates (8%/10%/12%), renewalPayoutPct breakpoints (0/50/75/100/>100), calcLargeRenewalAddon U4R + retention floors, calcAddOnPayouts multi-year duration gate + Kong delta clamps to 0
- [ ] **NUM-03**: `FY27_MONTHS`, `DEFAULT_QUOTAS`, `DEFAULT_SETTINGS`, `DEFAULT_ADDONS`, `ENTRIES_KEY`, `SETTINGS_KEY`, `ADDONS_KEY`, `NumbersEntry` / `CompSettings` / `AddOns` types, and `loadEntries` / `loadSettings` / `loadAddOns` readers all live in `src/data/myNumbers/storage.ts` as the single source of truth — `MyNumbersPage`, `QuotaHeroBoxes`, `PipelineForecastBar`, `useTerritoryPlannerSelectors` all import from it; no duplicate inline declarations remain (`grep -rE "^const FY27_MONTHS = \[" src/` returns 1 match)
- [ ] **NUM-04**: Non-owner redirect on `MyNumbersPage` uses `useEffect` (not `navigate()` during render) — eliminates the React "Cannot update a component while rendering" warning and the StrictMode double-fire hazard; render returns `null` while redirect is pending
- [ ] **NUM-05**: A new "Trends" tab is added to `MyNumbersPage` containing three vertically stacked recharts visualizations: (1) Quota Attainment % over time (cumulative YTD bookings ÷ cumulative YTD quota × 100, with `<ReferenceLine y={100}>`), (2) Activity Rate over time (Meetings + Touches dual-line), (3) Pipeline Coverage over time (monthly pipeline ACV ÷ monthly quota, with `<ReferenceLine y={3}>` dashed at 3x target)
- [ ] **NUM-06**: The lone arbitrary text-size violation `text-[10px]` at `MyNumbersPage.tsx:722` is replaced with `text-xs`
- [ ] **NUM-07**: After sub-component decomposition, `src/pages/MyNumbersPage.tsx` is ≤400 lines (mirrors Phase 03 UX-04 ceiling); sub-components live in `src/components/myNumbers/` (`SummaryCardRow`, `IncrementalTab`, `RenewalTab`, `MyNumbersTrendsTab`, `AddonsSection`, `EarningsSummary`, `MyNumbersChart`, `SettingsDialog`); the coordinator owns all state and passes typed props down
- [ ] **NUM-08**: `EditableCell` accepts an `aria-label` prop and forwards it to both the `<input>` (when editing) and the `<span>` (when displaying); every callsite passes a meaningful label (e.g., "Quota for Mar 2026", "Bookings for Mar 2026", "Renewed ACV for Mar 2026")

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### UX Enhancements
- **UX-V2-01**: Mobile card view at small breakpoints (table → card layout)
- **UX-V2-02**: 44x44px minimum touch targets audit and fix
- **UX-V2-03**: Log Activity widget (interaction + follow-up task in one submit)
- **UX-V2-04**: ProspectSheet/ProspectPage deduplication via shared ProspectDetail component

### Quality
- **QUAL-V2-01**: Automated test coverage for scoring logic and hook CRUD operations
- **QUAL-V2-02**: Bundle size audit and optimization
- **QUAL-V2-03**: Union types on Prospect string fields (status, outreach, priority, tier)

### AI Enhancements
- **AI-V2-01**: Competitive intel battlecards per competitor in ProspectSheet
- **AI-V2-02**: Score → Recommended Action block ("Why call this account") — promoted to v1 as REC-01..REC-07

### Forecast Enhancements
- **FORECAST-V2-01**: Per-stage drill-down — clicking a segment filters the Opportunities table to that stage
- **FORECAST-V2-02**: Tunable per-user stage weights (currently locked at engine constants)
- **FORECAST-V2-03**: Quarterly / monthly weighted forecast variants (v1 is annual only — `QuotaHeroBoxes` already covers cadence for bookings)
- **FORECAST-V2-04**: Pipeline coverage multiplier ("3x quota target" — weighted / (quota - booked))
- **FORECAST-V2-05**: Type-aware weighting (Renewal vs Net New at the same stage have different probabilities)
- **FORECAST-V2-06**: Migrate quota schedule from `localStorage` to a Supabase `quota_schedule` table to survive browser data clears

### Meeting Prep Enhancements
- **PREP-V2-01**: Streaming responses (current edge function is non-streaming)
- **PREP-V2-02**: Cache briefs in Supabase (regenerate every click is fine for v1)
- **PREP-V2-03**: Editing the brief inline before copy/export (read-only display in v1)
- **PREP-V2-04**: Resolve nested Dialog-inside-Drawer a11y warnings on mobile (Phase 01 known issue, preserved in v1)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Offline support / service workers | Single user on reliable connections; PWA complexity adds months for zero gain |
| Real-time multi-user sync | Territory sharing is "share with my SE," not simultaneous editing |
| Undo/redo for inline edits | Rollback-on-failure covers the critical case; full undo/redo is overengineered |
| Optimistic updates for bulk operations | Bulk ops are acceptable with loading state; rollback on partial failure is too complex |
| Server-side pagination | 300-500 accounts fits in memory; client-side filtering is fast |
| AI chat interface | Targeted buttons per action beat a general chat box in a data-dense app |
| Complex RBAC beyond owner-check | Single active user; current owner/editor/viewer is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| UX-01 | Phase 3 | Complete |
| UX-02 | Phase 3 | Complete |
| UX-03 | Phase 3 | Complete |
| UX-04 | Phase 3 | Complete |
| PERF-01 | Phase 2 | Pending |
| PERF-02 | Phase 2 | Pending |
| PERF-03 | Phase 2 | Pending |
| PERF-04 | Phase 2 | Pending |
| AI-01 | Phase 4 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
| LOG-01 | Phase 5 | Complete |
| LOG-02 | Phase 5 | Complete |
| LOG-03 | Phase 5 | Complete |
| LOG-04 | Phase 5 | Complete |
| LOG-05 | Phase 5 | Complete |
| LOG-06 | Phase 5 | Complete |
| REC-01 | Phase 6 | Complete |
| REC-02 | Phase 6 | Complete |
| REC-03 | Phase 6 | Complete |
| REC-04 | Phase 6 | Complete |
| REC-05 | Phase 6 | Complete |
| REC-06 | Phase 6 | Complete |
| REC-07 | Phase 6 | Complete |
| FORECAST-01 | Phase 7 | Complete |
| FORECAST-02 | Phase 7 | Complete |
| FORECAST-03 | Phase 7 | Complete |
| FORECAST-04 | Phase 7 | Complete |
| FORECAST-05 | Phase 7 | Complete |
| FORECAST-06 | Phase 7 | Complete |
| FORECAST-07 | Phase 7 | Complete |
| FORECAST-08 | Phase 7 | Complete |
| PREP-01 | Phase 8 | Complete |
| PREP-02 | Phase 8 | Complete |
| PREP-03 | Phase 8 | Complete |
| PREP-04 | Phase 8 | Complete |
| PREP-05 | Phase 8 | Complete |
| PREP-06 | Phase 8 | Complete |
| PREP-07 | Phase 8 | Complete |
| PREP-08 | Phase 8 | Complete |
| NUM-01 | Phase 10 | Pending |
| NUM-02 | Phase 10 | Pending |
| NUM-03 | Phase 10 | Pending |
| NUM-04 | Phase 10 | Pending |
| NUM-05 | Phase 10 | Pending |
| NUM-06 | Phase 10 | Pending |
| NUM-07 | Phase 10 | Pending |
| NUM-08 | Phase 10 | Pending |
