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
- [ ] **Phase 4: AI Capabilities** - Cold email drafting and prospect research tools inside the AITab created in Phase 3

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
**Plans**: TBD
**UI hint**: yes

### Phase 4: AI Capabilities
**Goal**: Users can generate a personalized cold email draft and research a prospect's company intel without leaving the app
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Draft Email" in the AI tab generates a cold email using the prospect's name, industry, location count, competitor, contacts, and recent interactions — result appears inline with a copy button
  2. Clicking "Research Prospect" in the AI tab returns a structured company intel summary (digital presence, recent signals, key findings) inline in the sheet
  3. Both AI actions are non-blocking — the tab remains usable while a response streams in, and an error message displays if the Edge Function call fails
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Integrity & Security | 4/4 | Complete (checkpoint pending) | 2026-03-26 |
| 2. TanStack Query Migration | 0/? | Not started | - |
| 3. Component Decomposition & UX Polish | 0/? | Not started | - |
| 4. AI Capabilities | 0/? | Not started | - |
