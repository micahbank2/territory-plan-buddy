---
quick_id: 260424-mn5
description: Fix 3 UI audit findings — silent mark-sent failure, clickable spans, arbitrary type sizes
date: 2026-04-24
status: completed
commit: 40ecea5
---

# Summary

Addressed all 3 Phase 04 UI-REVIEW Top Fixes in a single commit.

## Changes

### Fix 1 — Silent Mark-as-Sent failure (CRITICAL)

**File:** `src/components/TerritoryPlanner.tsx` (handleMarkSent ~line 839)

- Wrapped the async mark-sent loop in try/catch
- On error: `toast.error("Failed to log some interactions. Check your connection and try again.")` (exact UI-SPEC copy)
- `throw` re-raises so `PendingOutreachDialog` can keep the dialog open and let the user retry
- Updated the misleading comment in `PendingOutreachDialog.tsx:82` to accurately describe parent-toast contract

Matches Phase 01 core value: "app must never silently lose data."

### Fix 2 — A11y: clickable spans → buttons

**File:** `src/components/PendingOutreachDialog.tsx` (lines 117-136, 171-190)

Converted 4 clickable `<span>` → `<button type="button">`:
- "Select All" / "Deselect All"
- "Mark all as sent"
- "Start new draft"
- "Discard all"

Separators (`|`) remain as `<span>`. Classnames unchanged.

### Fix 3 — Typography scale compliance

**File:** `src/components/ContactPickerDialog.tsx` (lines 352, 379, 380, 381, 417)

Replaced `text-[10px]` and `text-[11px]` with `text-xs` (12px) per UI-SPEC declared scale (12/14/16/20 only).

## Verification

| Gate | Result |
|------|--------|
| `bunx tsc --noEmit` | clean |
| `bunx vitest run` | 25 passed / 1 todo / 0 failures |
| `bun run build` | success (only pre-existing chunk-size warning) |
| Grep `text-\[1[01]px\]` in ContactPickerDialog | 0 hits |
| Grep `<span onClick` in PendingOutreachDialog | 0 hits |

## Commit

`40ecea5` — fix(ui): address 3 Phase 04 UI audit findings
