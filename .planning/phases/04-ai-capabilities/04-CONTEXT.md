# Phase 4: AI Capabilities — Draft Emails & Post-Outreach Tracking — Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the loop on the existing draft-emails workflow. The prompt generation and contact selection already work (in `quirky-buck` branch). This phase adds:
1. A "Pending Outreach" batch tracker that remembers which contacts were selected for email drafting
2. A batch-mark-as-contacted flow to log interactions and bump outreach stages at scale
3. A bulk "Mark Contacted" action on the main table for ad-hoc use outside the draft flow

**What already exists (current state):**
- "Draft Emails" button in the header toolbar
- Contact picker dialog: user picks accounts → expands to pick contacts per account
- Prompt generator: creates a formatted prompt to paste into Claude
- User copies prompt → pastes into Claude → gets tailored emails → sends via Gmail one-by-one
- **The gap:** No way to efficiently mark those contacts as contacted back in the tool

This phase does NOT change the email generation approach (prompt → Claude → Gmail). It solves the return trip.

</domain>

<decisions>
## Implementation Decisions

### Contact Selection Flow
- **D-01:** Two-step funnel: pick accounts first, then select contacts within those accounts
- **D-02:** Show all contacts per account for manual selection (no auto-select primary contact)
- **D-03:** This flow already exists in the `quirky-buck` branch — no redesign needed

### Prompt Generation
- **D-04:** Current prompt-to-clipboard approach is kept as-is. No in-app email generation via API in this phase.

### Post-Send Tracking (Saved Batch)
- **D-05:** When a prompt is generated, save the list of selected contact IDs + prospect IDs as a "pending outreach batch"
- **D-06:** A "Pending Outreach" indicator appears (badge on Draft Emails button or similar) showing the last batch
- **D-07:** Clicking it opens a modal showing the contacts from that batch with checkboxes
- **D-08:** User checks off who they actually sent to, hits Save
- **D-09:** On save, each checked contact gets: (a) Email interaction logged with today's date, (b) `last_touched` updated on the prospect, (c) `outreach` auto-bumped from "Not Started" → "Actively Prospecting" (only if currently "Not Started" — don't downgrade)
- **D-10:** Interaction notes auto-generated: "Cold outreach via Draft Emails"

### Bulk Mark Contacted (Ad-Hoc)
- **D-11:** Add a bulk action to the main table: when prospects are selected, "Mark Contacted" button appears in the bulk action bar
- **D-12:** Clicking it logs Email interactions + bumps stages on all selected prospects (same logic as D-09)
- **D-13:** This is for ad-hoc use — when user emails someone outside the draft flow

### Results Layout
- **D-14:** The pending outreach / mark-as-contacted screen is a dialog/modal overlay (not a full page or slide-over)
- **D-15:** Territory table stays visible behind the modal for context

### Claude's Discretion
- Badge placement (on Draft Emails button, in nav, or a notification dot) — pick what fits the existing UI
- Whether to support multiple pending batches or just the most recent one (start with most recent)
- Exact wording of auto-generated interaction notes
- Whether the "Mark Contacted" bulk action also shows in the bulk action bar that appears when rows are selected, or as a separate menu item

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Draft Emails Implementation
- `src/components/TerritoryPlanner.tsx` (quirky-buck branch) — Draft Emails button, contact picker state, prompt generation
- `src/components/ContactPickerDialog.tsx` (quirky-buck branch, if exists) — contact selection UI
- `src/hooks/useProspects.ts` — `addInteraction()`, `update()` for logging interactions and updating prospects

### Data Model
- `src/data/prospects.ts` — `STAGES` constant (outreach values), `InteractionLog` interface, `INTERACTION_TYPES`
- `src/integrations/supabase/types.ts` — Database schema for prospect_interactions table

### Component Patterns
- `src/components/BulkEditDialog.tsx` — existing bulk action pattern
- `src/components/ExportDialog.tsx` — modal dialog pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `addInteraction(prospectId, interaction)` in useProspects — logs interaction to prospect_interactions table
- `update(id, { outreach: "Actively Prospecting" })` — updates outreach stage
- `BulkEditDialog` — existing pattern for bulk operations on selected prospects
- Contact picker already built in quirky-buck branch

### Established Patterns
- Modals use shadcn `Dialog` component
- Bulk actions appear in a bar when rows are selected (see `selected.size > 0` logic in TerritoryPlanner)
- Toasts via `sonner` for success/error feedback
- Optimistic updates with Supabase sync

### Integration Points
- The prompt generator already knows which contacts were selected — need to persist that list
- Bulk action bar in TerritoryPlanner where "Bulk Edit" and "Delete" already live
- `last_touched` auto-update already happens in the `update()` hook

</code_context>

<specifics>
## Specific Ideas

- The saved batch approach is the primary workflow — user generates prompt, sends emails over the next hour, comes back to mark them
- The flow should feel like "closing a task" — quick, satisfying, not tedious
- Batch could be stored in localStorage (simplest) or Supabase (persists across devices) — Claude's discretion
- The "Mark All Sent" batch button should be prominent since that's the most common action (user sent all the emails)

</specifics>

<deferred>
## Deferred Ideas

- **Direct email sending integration** (Gmail API, mailto: links) — future phase, current copy-paste approach works
- **Smart contact suggestions** (Claude suggests who to email based on staleness, priority) — separate capability
- **Email template library** — save and reuse prompt templates — separate capability
- **Tracking email opens/replies** — requires email integration, out of scope
- **In-app email generation via Anthropic API** — currently done via copy-paste to Claude chat, could move in-app later

</deferred>

---

*Phase: 04-ai-capabilities*
*Context gathered: 2026-03-30*
