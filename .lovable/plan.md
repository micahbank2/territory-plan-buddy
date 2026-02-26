
# Three Changes: Reset Safety, Sheet Close Fix, Archive System

## 1. Reset Data -- Type-to-confirm dialog
Replace the simple `confirm()` call with a proper AlertDialog that requires typing the word "RESET" before the button becomes active.

**File: `src/components/TerritoryPlanner.tsx`**
- Add a new state: `resetDialogOpen` and `resetInput`
- Replace both reset button handlers (desktop line ~857 and mobile dropdown line ~891) to open the dialog instead of using `confirm()`
- Add an AlertDialog at the bottom of the component with:
  - A red warning icon and bold warning text ("This will permanently erase all your data")
  - A text input that must match "RESET" exactly
  - The confirm button stays disabled/grayed out until the input matches
  - On confirm: call `reset()`, close dialog, show toast

## 2. ProspectSheet -- Fix mobile close button
The X close button from `sheet.tsx` sits at `right-4 top-4` with no z-index, but the ProspectSheet header is `sticky top-0 z-10`, hiding the X behind it.

**File: `src/components/ui/sheet.tsx`**
- Add `z-20` to the close button (line 60) so it renders above sticky content inside the sheet

This is the simplest fix -- one class addition and it works everywhere the Sheet is used.

## 3. Archive system for deleted prospects
Instead of permanently deleting prospects, move them to an archive. Add an archive viewer to browse and restore them.

**File: `src/hooks/useProspects.ts`**
- Add a separate `archived` state array, persisted to `localStorage` under a new key (`tp_archived`)
- Change `remove` to move the prospect into `archived` instead of deleting
- Change `bulkRemove` similarly
- Add `restore(id)` to move a prospect back from archive to active
- Add `permanentDelete(id)` to truly remove from archive
- Return `archived`, `restore`, `permanentDelete` from the hook

**File: `src/components/TerritoryPlanner.tsx`**
- Add an "Archive" button in the header (desktop) and mobile menu (with a `Archive` icon from lucide)
- Add an Archive dialog/sheet that shows archived prospects in a simple list with:
  - Prospect name, date archived
  - "Restore" button per row
  - "Delete forever" button per row
- Update all `remove` call sites to show "Archived" toast instead of "Removed"

**File: `src/pages/ProspectPage.tsx`**
- Update the delete handler to show "Archived" toast

**File: `src/components/ProspectSheet.tsx`**
- No changes needed -- it already receives `remove` as a prop

## Technical Details

### Reset confirmation dialog structure:
```text
+----------------------------------+
|  [!] Warning                     |
|                                  |
|  This will permanently erase     |
|  ALL prospect data and reset     |
|  to demo defaults.               |
|                                  |
|  Type RESET to confirm:          |
|  [_______________]               |
|                                  |
|  [Cancel]  [Reset - disabled]    |
+----------------------------------+
```

### Archive localStorage key:
`tp_archived` -- separate from `tp_prospects` so a reset doesn't wipe the archive.

### Files to modify:
| File | Changes |
|------|---------|
| `src/hooks/useProspects.ts` | Add `archived` state, `restore`, `permanentDelete`, change `remove`/`bulkRemove` to archive |
| `src/components/TerritoryPlanner.tsx` | Reset confirmation dialog, Archive button + Archive dialog, update toasts |
| `src/components/ui/sheet.tsx` | Add `z-20` to close button |
| `src/pages/ProspectPage.tsx` | Update delete toast to say "Archived" |
