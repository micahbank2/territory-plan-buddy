

# Mobile Optimization

Making the Territory Planner fully responsive for phones (375px+) while keeping the desktop experience unchanged.

## Changes Overview

### 1. Header -- Collapse buttons into a mobile menu
The header currently shows the logo, title, subtitle, and 8+ action buttons in one row. On mobile:
- Hide the subtitle ("Manage, prioritize, and close your territory")
- Collapse action buttons (Insights, CSV, Upload, Compare, view toggle, theme, reset) into a single hamburger/overflow menu using a DropdownMenu
- Keep only "Add Prospect" visible as the primary action
- Stack logo + title more compactly

### 2. Stat pills -- Horizontal scroll
The 9 stat pills wrap and overflow on small screens. On mobile:
- Use a horizontally scrollable container (`overflow-x-auto`) with `flex-nowrap`
- Reduce pill padding slightly for smaller touch targets
- Hide scrollbar with CSS utility

### 3. Filter bar -- Collapsible behind a toggle
6 MultiSelect dropdowns + location slider + save/clear buttons overflow badly. On mobile:
- Show only the search bar by default
- Add a "Filters" toggle button next to search
- When expanded, show filters in a 2-column grid below search
- MultiSelect dropdown: add `right-0` positioning option to prevent viewport overflow

### 4. Table -- Switch to card list on mobile
The 8-column table is unusable on phones. On mobile (using `useIsMobile` hook):
- Replace the table with a compact card list
- Each card shows: aging dot, logo, company name, score badge, outreach stage pill, and a chevron
- Tapping a card opens the prospect sheet (same as clicking a row today)
- Keep the full table on `md:` screens and above

### 5. Kanban -- Reduce column width, add snap scroll
- Reduce column width from `w-72` to `w-64` on mobile
- Already horizontally scrollable, just needs minor width adjustment

### 6. ProspectSheet -- Full width on mobile
- Override sheet width: `w-full sm:w-3/4 sm:max-w-2xl`
- Ensure touch-friendly input sizes (already mostly fine)

### 7. ProspectPage -- Responsive padding and stacking
- Change `px-6` to `px-4 sm:px-6` in header and content
- The `grid-cols-1 lg:grid-cols-3` layout already stacks on mobile -- just needs padding fixes
- Header badges: ensure they wrap nicely (already using `flex-wrap`)

### 8. InsightsPage -- Responsive padding
- Change `px-8` to `px-4 sm:px-8` throughout

### 9. Global CSS
- Add a `scrollbar-hide` utility class for the horizontal scroll containers

## Technical Details

### Files to modify:

| File | What changes |
|------|-------------|
| `src/components/TerritoryPlanner.tsx` | Import `useIsMobile`, add mobile header menu, scrollable stat pills, filter toggle state + collapsible filters, mobile card view replacing table, responsive padding (`px-4 sm:px-8`) |
| `src/components/ProspectSheet.tsx` | Sheet width override for mobile |
| `src/pages/ProspectPage.tsx` | Responsive padding (`px-4 sm:px-6`) |
| `src/pages/InsightsPage.tsx` | Responsive padding (`px-4 sm:px-8`) |
| `src/components/MultiSelect.tsx` | Add `right-0` to dropdown to prevent overflow on right-edge filters |
| `src/index.css` | Add `.scrollbar-hide` utility |

### Mobile card layout (replaces table):
```text
+---------------------------------------+
| [dot] [logo] Company Name    [score] >|
|              Outreach Stage  Tier      |
+---------------------------------------+
```

### Header mobile layout:
```text
[Logo] Territory Planner   [+ Add] [...]
```
The `[...]` opens a dropdown with: Insights, CSV, Upload, Table/Kanban toggle, Theme, Reset.

### Filter toggle:
```text
[Search........................] [Filters]
```
Tapping "Filters" expands a panel below with dropdowns in a 2-col grid.

