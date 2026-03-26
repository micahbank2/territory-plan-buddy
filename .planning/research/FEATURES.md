# Feature Landscape

**Domain:** Personal sales productivity tool — React + Supabase territory management app
**Researched:** 2026-03-26
**Milestone focus:** Hardening & polish pass on an existing brownfield app

---

## Table Stakes

Features users expect in a production-quality app. Their absence makes the app feel broken or
untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Optimistic update rollback on write failure | Silent data loss is the #1 trust destroyer. User edits a field, app shows success, data is gone on reload. Currently broken. | Medium | The hook pattern already exists — add `previousData` snapshot before mutation, restore on Supabase error, show toast. |
| Error toast on failed write | User needs to know a save failed so they can retry. Currently fails silently. | Low | `sonner` is already installed. Pattern: catch error in hook, `toast.error("Failed to save — changes not persisted")`, roll back state. |
| Real archive (soft delete) with restore | The archive UI exists but `restore()` and `permanentDelete()` are stubs — they do nothing. Clicking archive silently hard-deletes. | Medium | Add `deleted_at timestamptz` column to prospects table. Filter out `deleted_at IS NOT NULL` in default queries. Expose restore and permanent-delete actions in the archive view. |
| DOMPurify on rich text rendering | `dangerouslySetInnerHTML` on user-generated TipTap HTML is an XSS vector in shared territories. | Low | Install `dompurify`. One-line wrapper before every `dangerouslySetInnerHTML` call. |
| Tabbed layout in ProspectSheet | Scrolling through a 989-line component to find contacts, tasks, and notes is slow. Every comparable CRM (HubSpot, Salesforce, Pipedrive) uses tabs for detail panels. | Medium | shadcn `Tabs` component is already installed. Four tabs: Overview, Activity, Contacts, Tasks. Eliminates scroll-to-find problem. |
| Prospect detail deduplication (ProspectSheet vs ProspectPage) | ProspectPage.tsx (923 lines) is a near-duplicate of ProspectSheet.tsx (989 lines). Bug fixes and feature additions must be applied in two places. | Medium | Extract shared logic into a `ProspectDetail` component. Both ProspectSheet and ProspectPage become thin wrappers around it. |
| Mobile: min 44×44px touch targets | Apple HIG and WCAG 2.1 both require 44×44px minimum. Inline editing cells and small action buttons likely fail this. | Low-Medium | Audit-and-fix pass. Most fixes are Tailwind `min-h-11 min-w-11` additions to existing elements. |
| Mobile: primary table → card/stacked list at small breakpoints | Data tables with 10+ columns are unusable on mobile. The standard pattern is card view (each row becomes a card) at `sm:` and below. | Medium | Show only: logo, name, tier badge, priority dot, last-touched aging indicator. Tap card → open ProspectSheet. |
| AI calls through Edge Function (not direct browser) | Anthropic API key is currently leaked to the client via VITE_ prefix. This is a critical security issue, not a polish item. | Medium | Route through the existing `draft-outreach` Edge Function pattern. Remove `VITE_ANTHROPIC_API_KEY` from client bundle. |
| AI outreach drafting in ProspectSheet | Drafting first-touch emails is the #1 time-consuming manual task. The Edge Function (`draft-outreach`) already exists. The UI is the gap. | Medium | Button in ProspectSheet → calls Edge Function with prospect context → displays streaming result → copy-to-clipboard button. |
| Prospect research tool in ProspectSheet | AEs need company intel (recent news, digital presence, competitor context) before calls. Currently requires leaving the app. | High | Call Supabase Edge Function that queries Anthropic with company context. Surface inline in a collapsible section or tab. |

---

## Differentiators

Features that would noticeably improve workflow beyond baseline expectations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Log Activity widget (interaction + follow-up task in one submit) | Currently logging an interaction and creating a follow-up task require navigating to two separate sections. One action should do both. | Medium | Single form: type dropdown (Email/Call/LinkedIn/Task), notes textarea, optional follow-up task with due date. One submit creates both records. This is a workflow accelerator. |
| Lazy-load sub-collections (load contacts/tasks/notes on ProspectSheet open) | Currently all 300+ prospects load all sub-collections (contacts, interactions, notes, tasks) on page load — 5 concurrent Supabase queries. Deferred loading cuts initial load time by ~60-80% on mobile. | Medium | Move sub-collection fetches into ProspectSheet/ProspectDetail on mount. Initial load query only needs top-level prospect fields. |
| Score → Recommended Action surface | The scoring system generates a number but nothing downstream uses it. Show a "Why call this account" summary in the ProspectSheet header: score breakdown, missing contact roles, days since last touch, current competitor. | Medium | Pure frontend — no new data needed. Pure function over existing prospect data. Example: "Score 72 — missing Decision Maker, 45 days stale, competing with SOCi." |
| Competitive intel quick-reference | Per-competitor context (SOCi, Birdeye, Uberall positioning vs. Yext) accessible from the competitor field in ProspectSheet without leaving the app. | Low-Medium | Static structured content per competitor. Collapsible section that opens when competitor field has a value. No AI call needed — curated static battlecard. |
| Direct CRUD for interactions, notes, tasks (replace delete+re-insert) | `update()` still does delete-all + re-insert for interactions, notes, and tasks. This is both a data integrity risk (delete succeeds, re-insert fails = data loss) and unnecessary database churn. | Medium | Contacts already fixed. Same pattern: compare existing IDs, update changed rows, insert new, delete removed. Three focused functions mirroring `addContact`/`updateContact`/`removeContact`. |
| TanStack Query migration for data hooks | TanStack Query is installed but unused. Migration gives proper cache invalidation, background refetch, deduplication, and the canonical `onMutate`/`onError`/`onSettled` pattern for rollback. | Large | High ROI for correctness but high effort. Can be phased: start with `useOpportunities` (simplest hook) as proof of concept, then `useProspects`. |
| Union types on Prospect string fields | `status`, `outreach`, `priority`, `tier`, `industry`, `competitor` are typed as `string` despite having constant arrays. Union types catch invalid values at compile time. | Low | `status: "Prospect" | "Churned"`, etc. Derived from existing constants. No runtime behavior change. |
| Test coverage for scoring and CRUD hooks | Zero tests exist. Scoring logic and hook CRUD operations are the highest-leverage targets — pure functions and data paths that refactoring will break. | Medium | Vitest is the natural fit for a Vite project. Target: `scoreProspect()`, `scoreBreakdown()`, `useProspects` add/update/remove, `useOpportunities` CRUD. |
| TerritoryPlanner.tsx decomposition | 2194-line god component with 40+ state variables. Not a user-visible feature but every future change to this file has high blast radius. | Large | Extract: `ProspectTable`, `FilterBar`, `BulkActions`, `KanbanBoard`. Each owns its own state slice. TerritoryPlanner becomes an orchestration shell. |

---

## Anti-Features

Things to deliberately not build in this hardening pass.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full offline support / service workers | Single active user on reliable connections. PWA offline complexity adds months of work for zero workflow gain. | Accept online-only. Show clear error toast if Supabase is unreachable. |
| Real-time multi-user sync (Supabase Realtime) | Territory sharing exists but the use case is "share my territory with my SE" — not simultaneous editing. Real-time sync would require conflict resolution logic with no clear benefit. | The current refetch-on-load pattern is sufficient. |
| Undo/redo for inline edits | Adds substantial state management complexity. The rollback-on-failure pattern (toast + restore) covers the critical case. | Use rollback-on-failure instead. Ctrl+Z support is out of scope. |
| Optimistic updates for bulk operations | Bulk operations (bulkUpdate, bulkMerge) affect many rows. Rolling back a partial bulk failure reliably is complex. The latency is already acceptable. | Show a loading state for bulk ops. No optimistic update needed. Confirm success before unlocking UI. |
| Server-side pagination | 300-500 accounts fits comfortably in memory. Client-side filtering is fast. Switching to server-side pagination would break filtering, sorting, and the existing saved views pattern. | Keep full dataset in memory. Add lazy sub-collection loading instead, which solves the real performance problem. |
| Complex notification system | No other users are generating events this user needs to be notified about. The existing toast pattern covers all write failures. | Use sonner toasts for errors. No notification feed needed. |
| Role-based UI features beyond owner-check | Single active user with occasional viewers. Viewer/editor distinction is adequate. Complex RBAC would add overhead with no workflow gain. | Keep the current `myRole` check for destructive actions. |
| Full migration to TanStack Query mutations | Large refactor. High blast radius on working code. TanStack Query's `useMutation` with rollback is the right long-term pattern, but migrating all hooks at once risks regressions in a zero-test codebase. | Migrate incrementally: add rollback to existing hooks first, then migrate one hook at a time to TanStack Query as test coverage is added. |
| AI chat interface / conversational UI | A chat box in a data-dense app is a different interaction paradigm. The specific AI tasks (draft email, research prospect, competitive intel) are better served by targeted, contextual buttons than a general chat. | Build targeted AI actions in ProspectSheet: one button per AI task, not a chat interface. |

---

## Feature Dependencies

```
Real archive (soft delete)
  → requires: deleted_at column in Supabase (schema change via dashboard)
  → blocks: nothing else

Optimistic rollback
  → requires: snapshot pattern in all three hooks (useProspects, useOpportunities, useSignals)
  → independent of: TanStack Query migration (can be done in existing useState hooks)
  → dependency note: if doing TanStack Query migration, do rollback there instead of in useState hooks

Direct CRUD for interactions/notes/tasks
  → required before: TanStack Query migration (cleaner to migrate correct code)
  → blocks: no features, but reduces data loss risk NOW

Tabbed ProspectSheet
  → required before: ProspectSheet/ProspectPage deduplication
  → rationale: tabs define the structure both views share; deduplication should use the tabbed structure

ProspectSheet/ProspectPage deduplication (ProspectDetail extraction)
  → requires: tabbed ProspectSheet (so both views share the same tab structure)
  → required before: AI tabs (research, email drafting) — add once, render in both places

AI outreach drafting UI
  → requires: API key moved to Edge Function (security prerequisite)
  → edge function already exists (draft-outreach) — UI only

Prospect research tool
  → requires: API key moved to Edge Function
  → requires: new Edge Function (no existing research function)
  → depends on: ProspectSheet tab structure (should land in an AI tab)

Log Activity widget
  → requires: nothing — standalone form component
  → independent of: all other features

Lazy sub-collection loading
  → requires: ProspectSheet/ProspectPage deduplication (to avoid implementing twice)
  → conflicts with: anything that expects sub-collections available on initial load (check before implementing)

Score → Recommended Action
  → requires: nothing (pure function over existing data)
  → lands best after: tabbed ProspectSheet (surface in Overview tab header)

Test coverage
  → blocks: TerritoryPlanner decomposition (refactoring is risky without tests)
  → recommended before: any major hook refactor

TerritoryPlanner decomposition
  → requires: test coverage (otherwise blind refactor)
  → independent of: all user-visible features above
```

---

## MVP Recommendation for This Milestone

Prioritize in this order based on user-visible impact and risk reduction:

1. **Optimistic rollback + error toast** — eliminates silent data loss, the core value requirement
2. **DOMPurify on rich text** — one-liner security fix, no reason to defer
3. **API key → Edge Function** — prerequisite for all AI features and a live security issue
4. **Real soft delete** — archive UI already exists but is broken; schema change is the only blocker
5. **Tabbed ProspectSheet** — highest UX impact, unblocks AI feature placement
6. **AI outreach drafting UI** — Edge Function exists, high workflow value, lands in new tab
7. **Direct CRUD for sub-collections** — data integrity improvement, replaces fragile delete+re-insert
8. **ProspectSheet/ProspectPage deduplication** — maintainability, required before adding more features to detail view
9. **Mobile audit and fix** — touch targets, card view at mobile breakpoints
10. **Log Activity widget** — workflow accelerator for daily use

Defer: TanStack Query migration, TerritoryPlanner decomposition, test coverage, lazy loading — these are correct long-term investments but each requires multiple sessions and is lower urgency than the data integrity and AI features above.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Error recovery patterns | HIGH | TanStack Query docs, React 19 useOptimistic docs, multiple verified sources agree on onMutate/onError/onSettled as canonical |
| Soft delete with Supabase | HIGH | Official Supabase docs confirm deleted_at column + RLS filter approach; RLS + soft delete interaction documented as a known gotcha |
| Tabbed detail panel UX | HIGH | Industry-standard pattern in all major CRMs; shadcn Tabs component already present in codebase |
| Mobile table → card pattern | HIGH | Multiple UX research sources confirm card/stacked list as the standard mobile table replacement; 44px touch target is WCAG 2.1 |
| AI streaming UX (edge function + streaming response) | MEDIUM | Pattern is confirmed; exact Supabase Edge Function streaming setup needs verification during implementation |
| Anti-features (what NOT to build) | MEDIUM | Based on analysis of app context and single-user nature; no external validation, but reasoning is sound |

---

## Sources

- TanStack Query optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- Supabase soft deletes: https://supabase.com/docs/guides/troubleshooting/soft-deletes-with-supabase-js
- Supabase soft delete discussions: https://github.com/orgs/supabase/discussions/2799
- RLS + soft delete interaction: https://github.com/orgs/supabase/discussions/15389
- Mobile data table patterns: https://uxmovement.medium.com/stacked-list-the-best-way-to-fit-tables-on-mobile-screens-79f7789e079b
- Mobile touch targets (WCAG 2.1): https://www.simple-table.com/blog/mobile-compatibility-react-tables
- AI loading states / streaming UX: https://cloudscape.design/patterns/genai/genai-loading-states/
- AI UX patterns (copy, accept, reject): https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1
- React error boundary patterns: https://blog.logrocket.com/react-error-handling-react-error-boundary/
- Toast UX best practices: https://blog.logrocket.com/react-toastify-guide/
