# Territory Plan Buddy — Hardening & Polish

## What This Is

A quality, reliability, and UX improvement pass on Territory Plan Buddy — a personal territory planning tool for a Yext Senior AE managing 300+ multi-location brand prospects. This project focuses on fixing data integrity risks, modernizing the component architecture, adding test coverage, and building in-app AI-assisted outreach/research capabilities.

## Core Value

The app must never silently lose data. Every edit the user makes must either persist to Supabase or visibly fail with a clear error.

## Requirements

### Validated

- ✓ Prospect CRUD with Supabase sync — existing
- ✓ Contact management per prospect — existing
- ✓ Interaction logging (Email, Call, LinkedIn, Task Completed) — existing
- ✓ Task management per prospect — existing
- ✓ Note logging per prospect — existing
- ✓ Opportunity/deal pipeline management — existing
- ✓ Territory management with sharing (owner/editor/viewer) — existing
- ✓ Prospect scoring system with grade labels — existing
- ✓ Inline editing in table view — existing
- ✓ CSV upload and paste import — existing
- ✓ AI readiness scoring via enrichment queue — existing
- ✓ Bulk edit across multiple prospects — existing
- ✓ Dark/light mode theming — existing
- ✓ Google S2 favicon logos with custom logo override — existing
- ✓ Aging dots (last-contact staleness indicator) — existing
- ✓ Buying signals per prospect — existing

### Active

**Data Integrity**
- [ ] Harden update() to use direct CRUD for interactions, notes, and tasks (not delete+re-insert)
- [ ] Add error recovery on failed Supabase writes — rollback local state and show toast
- [ ] Implement real archive: soft delete, restore, and permanent delete
- [ ] Sanitize HTML notes rendering (DOMPurify) to prevent XSS via shared territories

**UX Polish**
- [ ] Add tabbed layout to ProspectSheet (Overview, Activity, Contacts, Tasks)
- [ ] Extract TerritoryPlanner.tsx into sub-components (filters, table, dialogs)
- [ ] Mobile audit and fix pass — responsive layout, touch targets, mobile-optimized inputs

**Performance & Quality**
- [ ] Add test coverage for scoring logic, hooks, and critical data paths
- [ ] Migrate data fetching to TanStack Query (proper cache, refetch, error handling)
- [ ] Bundle size audit and optimization

**In-App AI Capabilities**
- [ ] Prospect research tool — surface company intel within ProspectSheet
- [ ] Cold email drafting — generate personalized outreach using prospect context
- [ ] Competitive intel — per-competitor context accessible from ProspectSheet

### Out of Scope

- Supabase MCP conversational querying — blocked on Lovable Cloud credential access
- Firecrawl enrichment — requires external service setup
- Daily briefing artifact — separate project, not part of hardening
- Meeting prep skill — future feature, not hardening
- Weighted pipeline forecast — future feature
- My Numbers tab — future feature
- New prospect scoring logic — current scoring stays as-is, just needs tests

## Context

- Brownfield React + TypeScript app deployed via Lovable Cloud
- Supabase backend (no direct CLI access to instance)
- TerritoryPlanner.tsx is 2194 lines with 40+ state variables — the biggest code smell
- ProspectPage.tsx (923 lines) near-duplicates ProspectSheet logic
- 37 `as any` casts across 14 files
- Zero test coverage currently
- update() already fixed for contacts (direct CRUD), but interactions/notes/tasks still use delete+re-insert
- API key exposed client-side via VITE_ prefix — needs to route through Edge Function

## Constraints

- **Deployment**: Lovable Cloud — push to main triggers deploy, no custom CI
- **Database**: Supabase Cloud instance — no direct migration CLI, schema changes via dashboard
- **No backend server**: All data access is client → Supabase SDK, AI calls via Edge Functions
- **Personal tool**: Single active user (Micah), shared territories with viewer/editor roles
- **Package manager**: Bun

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Make archive real (not remove UI) | User wants soft delete + restore functionality | — Pending |
| Include AI capabilities in-app | User wants research/outreach tools built into the app, not ad-hoc | — Pending |
| Mobile: audit-and-fix approach | No specific complaints, just general polish pass | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after initialization*
