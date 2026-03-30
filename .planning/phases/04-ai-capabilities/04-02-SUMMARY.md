---
phase: 04-ai-capabilities
plan: "02"
subsystem: ui-components
tags: [outreach, pending-batch, interactions, bulk-actions]
dependency_graph:
  requires: [04-01]
  provides: [pending-outreach-dialog, bulk-mark-contacted, draft-emails-badge]
  affects: [TerritoryPlanner, ProspectSheet]
tech_stack:
  added: [dompurify (pre-existing dep fixed)]
  patterns: [shadcn Dialog with ScrollArea/Separator/Checkbox, optimistic interaction logging, inline confirmation UX]
key_files:
  created:
    - src/components/PendingOutreachDialog.tsx
    - src/components/PendingOutreachDialog.test.tsx
  modified:
    - src/components/TerritoryPlanner.tsx
decisions:
  - "dompurify was a pre-existing missing dep in node_modules (was in package.json but not installed); fixed as Rule 3 deviation to unblock build verification"
  - "Mark Contacted bulk action uses inline confirmation rather than a separate dialog to keep the UX lightweight and consistent with existing bulk bar patterns"
metrics:
  duration: "8min"
  completed: "2026-03-30"
  tasks: 2
  files: 3
---

# Phase 04 Plan 02: PendingOutreachDialog + Draft Emails Badge + Bulk Mark Contacted Summary

**One-liner:** PendingOutreachDialog with checkbox-grouped contacts, red badge on Draft Emails button when batch exists, and inline bulk Mark Contacted action that logs Email interactions and bumps outreach stages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create PendingOutreachDialog with mark-as-sent logic | 9fb95c6 | PendingOutreachDialog.tsx, PendingOutreachDialog.test.tsx |
| 2 | Wire badge, PendingOutreachDialog, and bulk Mark Contacted into TerritoryPlanner | 856cd23 | TerritoryPlanner.tsx |

## What Was Built

### PendingOutreachDialog (Task 1)
- Dialog renders contacts from pending batch grouped by account name as section headers
- Each contact has a Checkbox with name + title; contacts wrapped in ScrollArea (max-h 400px)
- Select All / Deselect All toggle + "Mark all as sent" link above list
- Mark as Sent button disabled when no contacts checked; shows "Saving..." during async save
- Empty state: "No pending outreach" heading with descriptive body text
- "Start new draft" link calls `onStartNewDraft` prop
- 5 unit tests all passing

### Draft Emails Badge + PendingOutreachDialog Wiring (Task 2)
- `loadPendingBatch()` called on TerritoryPlanner mount via useEffect
- Draft Emails button shows red `<Badge variant="destructive">` with contact count when batch exists
- Clicking Draft Emails opens PendingOutreachDialog when batch has entries, else ContactPickerDialog
- ContactPickerDialog `onOpenChange` re-reads localStorage batch after close
- `handleMarkSent`: logs `type: "Email"` interaction per contact, bumps "Not Started" → "Actively Prospecting" per unique prospect, calls `clearPendingBatch()`, fires success toast
- PendingOutreachDialog rendered with `onStartNewDraft` opening ContactPickerDialog

### Bulk Mark Contacted (Task 2)
- "Mark Contacted" button added to bulk action bar between Generate Outreach and Delete
- Inline confirmation: "Log Email + bump stage for N accounts?" with Confirm/Cancel
- `handleBulkMarkContacted`: logs Email interaction per selected prospect, bumps Not Started → Actively Prospecting, clears selection, fires "Logged outreach for N accounts." toast
- Confirmation resets automatically when selection changes (useEffect on `selected.size`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing dompurify in node_modules**
- **Found during:** Task 2 build verification
- **Issue:** `dompurify` was listed in package.json but not installed in node_modules; build failed with "Rollup failed to resolve import 'dompurify' from SafeHTML.tsx"
- **Fix:** Ran `npm install dompurify @types/dompurify` to install the dependency
- **Files modified:** node_modules only (package.json already had the dep)
- **Commit:** included in 856cd23

## Known Stubs

None. All data flows are wired: batch entries render from localStorage, interactions log to Supabase via `addInteraction`, outreach stages update via `update`, batch clears via `clearPendingBatch`.

## Self-Check: PASSED

- `src/components/PendingOutreachDialog.tsx` — exists, exports `PendingOutreachDialog`, contains "Pending Outreach", "Mark as Sent", "No pending outreach", "Saving...", "onStartNewDraft"
- `src/components/PendingOutreachDialog.test.tsx` — exists, 5 test blocks, all pass
- Commits 9fb95c6 and 856cd23 verified in git log
- Build: passes clean (`bun run build` exits 0)
- Full test suite: 6 files passed, 24 tests passing
