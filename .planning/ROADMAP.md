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
- [ ] **Phase 6: Score → Recommended Action** - Promote inline whyActParts into a tested RecommendationCard at the top of the Overview tab; pure deterministic engine surfaces score + callouts + a single suggested-action sentence

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Integrity & Security | 4/4 | Complete (checkpoint pending) | 2026-03-26 |
| 2. TanStack Query Migration | 0/? | Not started | - |
| 3. Component Decomposition & UX Polish | 3/3 | Complete | 2026-04-24 |
| 4. AI Capabilities | 2/2 | Complete   | 2026-03-30 |
| 5. Log + Next Step Widget | 1/1 | Complete   | 2026-04-24 |
| 6. Score → Recommended Action | 0/1 | Planned | - |
