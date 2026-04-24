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
- [ ] **UX-03**: TerritoryPlanner.tsx is decomposed into sub-components: FilterBar, ProspectTable, BulkActions bar, and dialog launchers
- [ ] **UX-04**: TerritoryPlanner.tsx coordinator component is under 400 lines after decomposition

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
- **AI-V2-02**: Score → Recommended Action block ("Why call this account")

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
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| PERF-01 | Phase 2 | Pending |
| PERF-02 | Phase 2 | Pending |
| PERF-03 | Phase 2 | Pending |
| PERF-04 | Phase 2 | Pending |
| AI-01 | Phase 4 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
