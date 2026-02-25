

# Multi-Feature Update Plan

## 1. Allow Activity Logging Without Notes

**Problem**: `logInteraction()` in ProspectSheet.tsx (line 98-99) and ProspectPage.tsx (line 352-353) requires `interactionNotes.trim()` to be non-empty.

**Fix**: Remove the `if (!interactionNotes.trim()) return;` guard in both files. If notes are empty, log with an empty string or a default like the interaction type name.

**Files**: `src/components/ProspectSheet.tsx`, `src/pages/ProspectPage.tsx`

---

## 2. Remove Est. Revenue Field

Remove the "Est. Revenue" field from:
- ProspectSheet.tsx (line 221-224) -- the sidebar panel
- ProspectPage.tsx (line 521-523) -- the full page view

**Files**: `src/components/ProspectSheet.tsx`, `src/pages/ProspectPage.tsx`

---

## 3. Fix Toast on Every Keystroke

**Problem**: `handleUpdate()` calls `update()` + `toast.success()` on every `onChange` for text/number inputs (locations, next step action, est. revenue). Selects are fine since they fire once on selection.

**Fix**: For text/number inputs, switch from `onChange` calling `handleUpdate` to using local state + `onBlur` to commit (debounced save). Specifically:
- Location count input, Next Step action input, and any other free-text fields that call `handleUpdate` on every keystroke
- Apply this pattern in both ProspectSheet.tsx and ProspectPage.tsx
- Keep selects as-is (they only fire once)

**Files**: `src/components/ProspectSheet.tsx`, `src/pages/ProspectPage.tsx`

---

## 4. Competitor Field: Add "Unknown" + Custom "Other" Input

**Problem**: COMPETITORS array has "Other" but no "Unknown", and selecting "Other" doesn't allow typing a custom value.

**Fix**:
- Add "Unknown" to the COMPETITORS array in `src/data/prospects.ts`
- In ProspectSheet.tsx and ProspectPage.tsx: when "Other" is selected, show a text input below the select for typing a custom competitor name. Store the custom value in the `competitor` field directly (e.g., "Other: CustomName" or just the custom name).

**Files**: `src/data/prospects.ts`, `src/components/ProspectSheet.tsx`, `src/pages/ProspectPage.tsx`

---

## 5. Unified Activity Log (Merge Next Step Completions + Interactions)

**Problem**: Marking a next step complete clears the fields but doesn't record it in the activity timeline.

**Fix**:
- When "Mark complete" is clicked, log an interaction entry of type "Task Completed" with the next step text as the notes, then clear the fields.
- Add "Task Completed" to INTERACTION_TYPES in prospects.ts (or handle it as a special type with a CheckCircle icon)
- The activity timeline already renders all interactions, so completed tasks will appear automatically.
- Add an `InteractionIcon` case for "Task Completed" using a Check/CheckCircle icon.

**Files**: `src/data/prospects.ts`, `src/components/ProspectSheet.tsx`, `src/pages/ProspectPage.tsx`

---

## 6. Upcoming/Open/Overdue Tasks Section

Add a tasks/actions section showing upcoming, open, and overdue next steps:

### Homepage Action Items
- Add a third card in the Action Items collapsible: "Upcoming Tasks" showing prospects with `nextStepDate` set, sorted by date (overdue first, then soonest).
- Color-code: overdue = red, due today = yellow, upcoming = default.

### Full Page View (ProspectPage.tsx)
- Already shows Next Step with overdue badge. No major change needed beyond the activity log merge above.

### Side Panel (ProspectSheet.tsx)
- Already shows Next Step with overdue badge. The activity log merge covers completed tasks appearing in the timeline.

**Files**: `src/components/TerritoryPlanner.tsx` (homepage action items card)

---

## 7. Add "Cold" Stat Pill

**Problem**: Missing "Cold" from the stat pills row at the top.

**Fix**: Add a "Cold" entry to the stat pills array after "Warm":
```
["🧊 Cold", stats.cold, () => toggle "Cold" in fPriority, fPriority.includes("Cold")]
```
Also add `cold: data.filter(p => p.priority === "Cold").length` to the stats computation.

**Files**: `src/components/TerritoryPlanner.tsx`

---

## 8. Search Bar Clear (X) Button

**Problem**: No way to quickly clear the search field.

**Fix**: Add an X button inside the search input (absolutely positioned on the right, before the Cmd+K shortcut badge) that appears when `q` is non-empty and clears it on click.

**Files**: `src/components/TerritoryPlanner.tsx`

---

## Summary of All File Changes

| File | Changes |
|------|---------|
| `src/data/prospects.ts` | Add "Unknown" to COMPETITORS, add "Task Completed" to INTERACTION_TYPES |
| `src/components/ProspectSheet.tsx` | Remove revenue field, allow empty activity notes, debounce text inputs, custom competitor input, log completed tasks to timeline |
| `src/pages/ProspectPage.tsx` | Same as ProspectSheet changes |
| `src/components/TerritoryPlanner.tsx` | Add Cold stat pill, add search X button, add Upcoming Tasks action card, add `cold` to stats |

