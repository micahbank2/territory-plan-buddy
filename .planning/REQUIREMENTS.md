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

- [ ] **REC-01**: A `RecommendationCard` renders at the top of the ProspectSheet Overview tab (above Account Details), summarizing score + label + at most 3 callout chips + a single suggested-action sentence
- [ ] **REC-02**: A pure function `getRecommendation(p: Prospect)` returns a deterministic `Recommendation` object with `{ score, scoreLabel, callouts, suggestedAction }` — no LLM, no async, no side effects
- [ ] **REC-03**: The recommendation surfaces contact-coverage gaps (missing Decision Maker, missing Champion, no contacts at all) using `prospect.contacts`
- [ ] **REC-04**: The recommendation surfaces staleness using the same thresholds as `getAgingClass` (<7d / 7–30d / 30+d / never), with an extra "Hot going cold" rule at 14+d for Hot prospects and a critical "stale-90" rule past 90 days
- [ ] **REC-05**: The recommendation surfaces competitor pressure when `prospect.competitor` is set, with warn severity for SOCi/Birdeye/Reputation.com, info severity for other named competitors, "Other: X" prefix stripped, and silence on `""` / `"Unknown"` / `"Yext"`
- [ ] **REC-06**: The engine is covered by table-driven unit tests in `src/test/recommendation.test.ts` (≥10 representative cases) and the card has at least one render test in `src/test/RecommendationCard.test.tsx`
- [ ] **REC-07**: The existing inline `whyActParts` memo at `ProspectSheet.tsx:176-195` and its render at `:504-508` are removed — `RecommendationCard` is the single surface for "why act on this account"

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
| REC-01 | Phase 6 | Pending |
| REC-02 | Phase 6 | Pending |
| REC-03 | Phase 6 | Pending |
| REC-04 | Phase 6 | Pending |
| REC-05 | Phase 6 | Pending |
| REC-06 | Phase 6 | Pending |
| REC-07 | Phase 6 | Pending |
