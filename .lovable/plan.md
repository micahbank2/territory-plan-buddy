

# Location Range Slider + Drag-and-Drop Logo Upload

## 1. Location Count Range Slider

Replace the text-based "min locations" filter with a dual-handle range slider for more intuitive filtering.

### Changes in `src/components/TerritoryPlanner.tsx`:
- Replace `fMinLocs: string` state with `fLocRange: [number, number]` initialized to `[0, maxLocs]`
- Compute `maxLocs` from the dataset (highest `locationCount` across all prospects)
- Add a "Locations" filter button that opens a Popover containing a dual-thumb Radix Slider
- Slider shows live min/max labels with comma-formatted numbers (e.g., "1,500")
- Step size of 10, with "Reset" link inside the popover
- Update all references: `clr()`, `hasFilters`, `handleSaveView()`, `loadView()`, `SavedView` type, and the stat pill click handlers (50+, 100+, 500+ Locs set the lower bound accordingly)
- Filter logic changes from `>= parseInt(fMinLocs)` to `>= fLocRange[0] && <= fLocRange[1]`

## 2. Drag-and-Drop Logo Upload

Upgrade the `LogoImg` component from a file-picker button to a drag-and-drop zone.

### Changes in `src/components/TerritoryPlanner.tsx` (LogoImg component):
- Add `onDragOver` and `onDrop` event handlers to the logo container divs
- When a file is dragged over, show a visual highlight (border glow / overlay)
- On drop, read the file as base64 and call `onUpload`
- Keep the click-to-browse as a secondary option (the hidden file input stays)
- The fallback state (Building2 icon) shows "Drop logo here" text on drag-over
- Works in both the list view and the ProspectPage detail view

### Changes in `src/pages/ProspectPage.tsx`:
- Same drag-and-drop upgrade for the larger logo on the detail page header

## Files to modify
1. `src/components/TerritoryPlanner.tsx` -- Range slider filter + drag-and-drop on LogoImg
2. `src/pages/ProspectPage.tsx` -- Drag-and-drop on detail page logo

