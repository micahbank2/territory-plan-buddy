---
phase: 260424-m9y
plan: "01"
subsystem: data-integrity
tags: [archive, delete, ux, data-integrity]
dependency_graph:
  requires: []
  provides: [confirmed-hard-delete, no-archive-stubs]
  affects: [useProspects, TerritoryPlanner, ProspectPage]
tech_stack:
  added: []
  patterns: [AlertDialog confirmation gate, optimistic delete with rollback]
key_files:
  modified:
    - src/hooks/useProspects.ts
    - src/hooks/useProspects.test.ts
    - src/components/TerritoryPlanner.tsx
    - src/components/TerritoryPlanner.test.tsx
    - src/pages/ProspectPage.tsx
    - CLAUDE.md
decisions:
  - Remove archive concept entirely (false promise) rather than implement soft-delete (requires schema change)
  - Route all delete paths through AlertDialog confirmation with 'cannot be undone' copy
  - Single-row delete from ProspectSheet now triggers confirmation before calling remove()
metrics:
  duration: ~8min
  completed: "2026-04-24"
  tasks: 3
  files: 6
---

# Phase 260424-m9y Plan 01: Kill Archive UI — Summary

**One-liner:** Removed false archive promise (stubs + misleading toasts) and replaced with AlertDialog-confirmed hard-delete across all three delete paths (ProspectSheet, table row, ProspectPage).

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Strip archive stubs from useProspects hook and tests | f22fc84 |
| 2 | Remove archive UI from TerritoryPlanner, add single-row delete confirmation | 25c9ac1 |
| 3 | Fix ProspectPage delete toast copy and update CLAUDE.md | f20cf8a |

## Files Modified

- **src/hooks/useProspects.ts** — Removed `ArchivedProspect` interface, `archivedData` state, `loadArchivedData` callback, `restore` and `permanentDelete` stubs; removed all four from return object. `remove()` kept as-is (already hard-deleted with rollback).
- **src/hooks/useProspects.test.ts** — Removed `DATA-05 through DATA-08` `it.todo` soft-delete block; replaced with `DATA-05` hard-delete assertion test confirming `.delete().eq("id", id)` pattern.
- **src/components/TerritoryPlanner.tsx** — Removed `Archive` lucide import, `showArchive` state + effect, archive toolbar button (Tooltip block), archive overflow-menu `DropdownMenuItem`, entire archive `<Dialog>` block (~40 lines). Added `deleteConfirmId` state + `prospectToDelete` derived value. Added single-row `AlertDialog` with destructive copy. Updated ProspectSheet `remove` prop to route through confirmation. Fixed misleading toast. Hardened bulk-delete copy.
- **src/components/TerritoryPlanner.test.tsx** — Removed `DATA-06 archive view` describe block; replaced with `DATA-05` delete confirmation todo.
- **src/pages/ProspectPage.tsx** — Fixed `handleDelete` toast from `"📦 Prospect archived"` to `"🗑️ Prospect deleted"`. (AlertDialog was already wired via `showDeleteDialog` state.)
- **CLAUDE.md** — Updated gotcha #9 from stale archive/stub description to accurate "no archive, delete is permanent, AlertDialog-gated" description.

## Grep Safety-Net Results

All four safety-net checks passed clean:
- No `archivedData|loadArchivedData|ArchivedProspect|permanentDelete` in `src/`
- No `showArchive` in `src/`
- No `📦 Prospect archived|moved to archive` in `src/`
- No `archive is simplified|restore.*permanentDelete` in `CLAUDE.md`

## Quality Gates

- `bunx vitest run` — 6 test files passed, 25 tests passed, 1 todo
- `bunx tsc --noEmit` — clean (no output)
- `bun run build` — success (2,028 kB bundle, chunk size warning pre-existing)

## UAT-AUDIT Drift Resolution

CRITICAL findings #10 and #11 (archive is a hard-delete with no recovery) are resolved by removing the false promise rather than implementing soft-delete. If soft-delete is needed in the future: add `deleted_at` column to Supabase, filter `is(deleted_at, null)` in SELECT queries only (NOT in RLS WITH CHECK), then re-wire `remove()`.

## Deviations from Plan

**1. [Rule 1 - Bug] ProspectPage already had AlertDialog wired**
- **Found during:** Task 3
- **Issue:** Plan said to add `showDeleteDialog` state and AlertDialog JSX to ProspectPage — but the file already had both (from a prior phase). Only the toast copy inside `handleDelete` was wrong.
- **Fix:** Changed toast from `"📦 Prospect archived"` to `"🗑️ Prospect deleted"` — no structural changes needed.
- **Files modified:** src/pages/ProspectPage.tsx
- **Commit:** f20cf8a

## Known Stubs

None — all delete paths are now live (AlertDialog confirmation → `remove()` → Supabase hard-delete with rollback).
