---
phase: 04-ai-capabilities
plan: "01"
subsystem: ai-capabilities
tags: [contact-picker, outreach-drafting, localStorage, TDD]
dependency_graph:
  requires: []
  provides: [ContactPickerDialog, buildContactPrompt, pendingBatch]
  affects: [TerritoryPlanner, ContactPickerDialog]
tech_stack:
  added: []
  patterns: [TDD red-green, localStorage persistence, lucide-react icon import]
key_files:
  created:
    - src/components/ContactPickerDialog.tsx
    - src/lib/buildContactPrompt.ts
    - src/lib/pendingBatch.ts
    - src/lib/pendingBatch.test.ts
  modified:
    - src/components/TerritoryPlanner.tsx
    - src/data/prospects.ts
decisions:
  - "STATUSES constant added to prospects.ts as ContactPickerDialog requires it (was on quirky-buck only)"
  - "savePendingBatch called in handleGenerate (not handleCopy) so batch persists even before clipboard copy"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 6
---

# Phase 04 Plan 01: Contact Picker and Pending Batch Foundation Summary

ContactPickerDialog + buildContactPrompt ported from quirky-buck to main, pendingBatch localStorage layer built with full test coverage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bring ContactPickerDialog and buildContactPrompt from quirky-buck | 83b21d9 | ContactPickerDialog.tsx, buildContactPrompt.ts, TerritoryPlanner.tsx, prospects.ts |
| 2 | Create pendingBatch.ts and wire into ContactPickerDialog (TDD) | c8af4ee | pendingBatch.ts, pendingBatch.test.ts, ContactPickerDialog.tsx |

## What Was Built

- **ContactPickerDialog** (`src/components/ContactPickerDialog.tsx`): Two-step contact picker dialog (account selection → contact selection → prompt preview). Supports filtering by industry, status, tier, priority, competitor.
- **buildContactPrompt** (`src/lib/buildContactPrompt.ts`): Generates AI-ready context prompt from selected contacts, grouped by prospect with signal data, score breakdown, and tone guidance by account status.
- **pendingBatch** (`src/lib/pendingBatch.ts`): localStorage persistence for pending outreach batches under `tp-pending-outreach`. Functions: `savePendingBatch`, `loadPendingBatch`, `clearPendingBatch`.
- **Draft Emails button**: Added to TerritoryPlanner header toolbar (desktop view).

## Test Coverage

7 tests in `src/lib/pendingBatch.test.ts` — all pass:
1. savePendingBatch writes JSON to localStorage key
2. loadPendingBatch returns parsed PendingBatch when key exists
3. loadPendingBatch returns null when key does not exist
4. loadPendingBatch returns null on invalid JSON
5. clearPendingBatch removes key from localStorage
6. Entries stored with all required fields (contactId, contactName, contactTitle, prospectId, prospectName)
7. savedAt stored as ISO timestamp string

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Export] Added STATUSES constant to prospects.ts**
- **Found during:** Task 1
- **Issue:** ContactPickerDialog imports `STATUSES` from `@/data/prospects`, but it was not exported on main (existed only on quirky-buck)
- **Fix:** Added `export const STATUSES = ["Prospect", "Churned"] as const;` to `src/data/prospects.ts`
- **Files modified:** src/data/prospects.ts
- **Commit:** 83b21d9

## Known Stubs

None — all data flows are wired. ContactPickerDialog reads real prospect + signal data from props. pendingBatch reads/writes real localStorage.

## Self-Check

- [x] src/components/ContactPickerDialog.tsx exists
- [x] src/lib/buildContactPrompt.ts exists
- [x] src/lib/pendingBatch.ts exists
- [x] src/lib/pendingBatch.test.ts exists (7 tests)
- [x] src/components/TerritoryPlanner.tsx contains `import { ContactPickerDialog }`, `showContactPicker` state, `<ContactPickerDialog` JSX, "Draft Emails" button
- [x] Commits 83b21d9 and c8af4ee exist
- [x] TypeScript type check passes (tsc --noEmit)
- [x] All 7 pendingBatch tests pass

## Self-Check: PASSED
