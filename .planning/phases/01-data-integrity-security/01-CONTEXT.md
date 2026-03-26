# Phase 1: Data Integrity & Security - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the three critical correctness failures (silent data loss on write, XSS via unsanitized HTML, exposed API key) and harden the sub-collection CRUD pattern. Implement real soft delete with archive view, restore, and permanent delete.

This phase does NOT touch component decomposition, TanStack Query migration, or AI feature UI — those are Phases 2-4.

</domain>

<decisions>
## Implementation Decisions

### Error Recovery UX
- **D-01:** On failed Supabase write, show a `toast.error()` via sonner (already installed) with message like "Failed to save — changes not persisted". Revert the local state to the pre-edit snapshot.
- **D-02:** No auto-retry. No undo button. Simple toast + rollback. Keep it minimal.
- **D-03:** Apply rollback pattern to all three hooks: `useProspects`, `useOpportunities`, `useSignals`. Each mutation should snapshot state before optimistic update, restore on error.

### Direct CRUD for Sub-Collections
- **D-04:** Follow the existing pattern established for contacts (`addContact`, `updateContact`, `removeContact` in useProspects.ts). Create matching functions for interactions, notes, and tasks.
- **D-05:** The `update()` function should stop accepting `interactions`, `noteLog`, and `tasks` as fields. Callers should use the dedicated functions instead.
- **D-06:** `bulkMerge()` also does delete+re-insert for sub-collections — apply the same direct CRUD fix there.

### Archive / Soft Delete
- **D-07:** Add `deleted_at timestamptz` column to `prospects` table via Supabase dashboard (manual step — document in plan).
- **D-08:** Archive view lives as a filter toggle in TerritoryPlanner — a small "Show Archived" toggle or tab alongside existing filters. Not a separate page.
- **D-09:** Archived prospects show with a visual indicator (muted/strikethrough) and two actions: "Restore" and "Permanently Delete".
- **D-10:** `remove()` in useProspects becomes a soft delete (sets `deleted_at = now()`). Add a new `permanentDelete()` that actually deletes the row.
- **D-11:** Default prospect queries filter `deleted_at IS NULL`. Archive view queries `deleted_at IS NOT NULL`.
- **D-12:** RLS consideration: `deleted_at IS NULL` filter goes in the application query, NOT in the RLS SELECT policy — otherwise the UPDATE to set `deleted_at` gets blocked.

### XSS Sanitization
- **D-13:** Install `dompurify` + `@types/dompurify`. Create a `SafeHTML` wrapper component that sanitizes before rendering.
- **D-14:** Apply `SafeHTML` to all `dangerouslySetInnerHTML` usages: `ProspectSheet.tsx` (line 722) and `chart.tsx` (if applicable). Also check `ProspectPage.tsx` for the same pattern.

### API Key Migration
- **D-15:** Route all browser-side Anthropic API calls through Supabase Edge Functions. The `draft-outreach` Edge Function pattern already exists — use the same approach.
- **D-16:** Remove `VITE_ANTHROPIC_API_KEY` from `.env` / environment config. The key lives only in Supabase Edge Function secrets.
- **D-17:** ProspectSheet.tsx lines 344-412 (direct Anthropic call) gets replaced with a `supabase.functions.invoke()` call.

### Claude's Discretion
User said "you decide" for all areas. Claude has full flexibility on:
- Error message wording and toast duration
- Exact component API for SafeHTML wrapper
- Whether to create a shared utility for the rollback pattern or inline it per hook
- Archive toggle UI design (icon, placement, label)
- Edge Function naming and request/response shape

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `src/hooks/useProspects.ts` — Main data hook with all CRUD, the delete+re-insert pattern (lines 153-197), and archive stubs (lines 487-488)
- `src/hooks/useOpportunities.ts` — Opportunity CRUD, needs rollback pattern
- `src/hooks/useSignals.ts` — Signal CRUD, needs rollback pattern

### Security
- `src/components/ProspectSheet.tsx` — Direct Anthropic API call (lines 344-412), dangerouslySetInnerHTML (line 722)
- `src/pages/ProspectPage.tsx` — May have duplicate dangerouslySetInnerHTML usage
- `src/components/ui/chart.tsx` — Has dangerouslySetInnerHTML

### Existing Patterns
- `src/hooks/useProspects.ts` lines 520-570 — Contact direct CRUD pattern (`addContact`, `updateContact`, `removeContact`) to replicate for interactions/notes/tasks
- `src/components/SignalsSection.tsx` — Uses `supabase.functions.invoke()` pattern for Edge Functions
- `src/components/EnrichmentQueue.tsx` — Uses `supabase.functions.invoke()` pattern

### Research
- `.planning/research/PITFALLS.md` — Supabase RLS gotcha for soft delete, concurrent mutation rollback risks
- `.planning/research/FEATURES.md` — Feature patterns and anti-features

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sonner` toast library already installed — use `toast.error()` for write failure notifications
- Contact CRUD pattern in useProspects.ts (addContact/updateContact/removeContact) — template for interactions/notes/tasks
- `supabase.functions.invoke()` pattern in SignalsSection, EnrichmentQueue, BulkOutreachQueue — template for API key migration
- `draft-outreach` Edge Function already exists — pattern for routing AI calls

### Established Patterns
- Optimistic updates: set local state first, then fire Supabase call (no error check currently)
- camelCase-to-snake_case field mapping duplicated across 6 functions in useProspects
- `useCallback` wrapping all mutations with `[user]` dependency

### Integration Points
- TerritoryPlanner.tsx filter state — archive toggle adds to existing filter logic
- ProspectSheet.tsx AI readiness section — API call pattern to replace
- All 6 components that call Edge Functions — consistent invocation pattern

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all decisions to Claude.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-integrity-security*
*Context gathered: 2026-03-26*
