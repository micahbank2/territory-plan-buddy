---
phase: 01-data-integrity-security
plan: "04"
subsystem: data-integrity
tags: [soft-delete, archive, hooks, ui]
dependency_graph:
  requires: ["01-02"]
  provides: ["soft-delete-archive"]
  affects: ["src/hooks/useProspects.ts", "src/components/TerritoryPlanner.tsx"]
tech_stack:
  added: []
  patterns: ["soft-delete with deleted_at timestamptz", "optimistic rollback on DB error", "lazy load archived data on dialog open"]
key_files:
  created:
    - src/hooks/useProspects.test.ts
  modified:
    - src/hooks/useProspects.ts
    - src/components/TerritoryPlanner.tsx
decisions:
  - "applied deleted_at filter in app queries (.is('deleted_at', null)) — NOT in RLS policy to avoid WITH CHECK violation on soft-delete UPDATE"
  - "loadArchivedData() called lazily when archive dialog opens (useEffect on showArchive), not on mount"
  - "bulkRemove() converted to soft delete — bulk delete from main list archives, not permanently destroys"
  - "optimistic rollback: snapshot previous item before update, restore on DB error + toast.error"
metrics:
  duration: "170s"
  completed: "2026-03-26"
  tasks_completed: 3
  files_modified: 3
requirements_satisfied: [DATA-05, DATA-06, DATA-07, DATA-08]
---

# Phase 01 Plan 04: Soft Delete / Archive Summary

**One-liner:** Soft delete with `deleted_at` timestamptz — `remove()` archives instead of destroying, with real `restore()` / `permanentDelete()` wired to the existing archive dialog in TerritoryPlanner.

## What Was Built

Replaced the stub archive implementation in `useProspects` with a fully functional soft-delete system:

- `remove(id)` — sets `deleted_at = now()` (was: `supabase.delete().eq("id", id)`) with optimistic rollback on error
- `bulkRemove(ids)` — soft deletes in bulk (was: hard delete in bulk) with optimistic rollback
- `loadData()` — adds `.is("deleted_at", null)` filter to exclude archived rows from the main list
- `loadArchivedData()` — new function, queries `.not("deleted_at", "is", null)`, maps rows into `ArchivedProspect[]` with `archivedAt` field
- `restore(id)` — sets `deleted_at = null`, removes from `archivedData` state, reloads main list
- `permanentDelete(id)` — hard `.delete()` from archive only, removes from `archivedData` state
- `archivedData` state replaces the previous `archived` empty stub

In TerritoryPlanner.tsx:
- Updated destructuring: `archived` → `archivedData`, added `loadArchivedData`
- Added `useEffect` to call `loadArchivedData()` when archive dialog opens (`showArchive = true`)
- Updated all `archived.*` template references to `archivedData.*`
- Archive dialog now shows real archived prospect count, loads on open, and has functional Restore/Delete Forever buttons

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| TDD RED | `2faf189` | test(01-04): add failing tests for soft delete, restore, permanentDelete |
| Task 2 | `d9fea1b` | feat(01-04): implement soft delete, restore, permanentDelete in useProspects |
| Task 3 | `9acf528` | feat(01-04): update TerritoryPlanner to use archivedData and loadArchivedData |

## Checkpoint: Schema Prerequisite (Task 1)

**Status: PENDING — requires manual action in Supabase Dashboard**

The code is fully implemented with graceful behavior when the `deleted_at` column exists. However, the column must be added to the Supabase `prospects` table before the archive feature will work end-to-end.

**Action required:**
1. Open Supabase Dashboard for this project
2. Go to SQL Editor
3. Run: `ALTER TABLE prospects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;`
4. Verify in Table Editor > prospects table that `deleted_at` column appears with type `timestamptz` and default `null`

**CRITICAL:** Do NOT add `deleted_at IS NULL` to any RLS policy. The filter goes in application queries only. Adding to RLS will cause the soft-delete UPDATE to fail with "new row violates row-level security policy" because Supabase re-evaluates post-update rows against WITH CHECK.

## Deviations from Plan

### Auto-handled

**Task 1 ordering:** The plan specified Task 1 (checkpoint) first, but as a parallel agent we implemented code first and return the checkpoint last. This is the correct approach per execution context instructions.

**TerritoryPlanner already had archive UI:** The archive dialog, `showArchive` state, and Restore/Delete Forever buttons were already fully built in TerritoryPlanner from an earlier implementation. Task 3 was therefore simpler than planned — we updated variable names (`archived` → `archivedData`) and added the `loadArchivedData` useEffect, rather than building the archive section from scratch.

## Known Stubs

None — all archive operations are fully wired. The only outstanding item is the Supabase schema change (see Checkpoint above), which is a prerequisite for the feature to function end-to-end.

## Verification Results

```
deleted_at in useProspects.ts: 7 matches (required: 5+)
.delete() on prospects table: 2 matches (reset + permanentDelete only — remove() no longer calls .delete())
showArchive in TerritoryPlanner: 4 matches
restore/permanentDelete in TerritoryPlanner: 3 matches
archivedData in TerritoryPlanner: 7 matches
TypeScript: PASS (npx tsc --noEmit)
Tests: 8 passed (2 test files)
```

## Self-Check: PASSED

- [x] `src/hooks/useProspects.ts` modified with all soft-delete functions
- [x] `src/hooks/useProspects.test.ts` created with 7 passing tests
- [x] `src/components/TerritoryPlanner.tsx` updated to use archivedData
- [x] Commits verified: 2faf189, d9fea1b, 9acf528
- [x] TypeScript clean
- [x] All 8 tests pass
