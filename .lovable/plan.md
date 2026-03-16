

## Fix "Unknown" Labels and CSV Upload Scroll

### Problem 1: Ambiguous "Unknown" labels
The screenshot shows bare "Unknown" text next to contacts with no context. The `RoleBadge` shows "Unknown" and `StrengthDot` shows "Unknown" -- but for different fields. Users can't tell what's unknown.

### Problem 2: CSV upload preview doesn't scroll
The preview table uses `ScrollArea` with `max-h-[50vh]`, but with 77 rows the content isn't scrollable -- likely the `ScrollArea` viewport isn't getting constrained properly within the flex dialog layout.

---

### Changes

**`src/components/ContactBadges.tsx`**
- `RoleBadge`: When role is "Unknown", display "Role: Unknown" instead of just "Unknown"
- `StrengthDot`: When strength is "Unknown", display "Relationship: Unknown" instead of just "Unknown"

**`src/components/CSVUploadDialog.tsx`**
- Replace `ScrollArea` with a plain `div` using `overflow-y-auto` and a fixed `max-h-[50vh]` or similar, since `ScrollArea` from Radix can have issues with dynamic content in flex containers
- Alternatively, ensure the `ScrollArea` has an explicit height by giving the flex parent `min-h-0 overflow-hidden` so the flex child can shrink and scroll
- The `DialogContent` already has `max-h-[85vh] flex flex-col`, but the `ScrollArea` at line 618 needs `min-h-0` on its flex parent and itself to allow proper shrinking

### Technical detail
The Radix `ScrollArea` viewport needs its container to have a concrete height constraint. In a flex column layout, children don't shrink below their content size unless `min-h-0` is set. The fix: ensure the `ScrollArea` wrapper and the `ScrollArea` itself both have `min-h-0` so the flex layout constrains them properly, or switch to a simpler `overflow-y-auto` div.

