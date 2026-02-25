

# CSV Upload with Smart Delta Loading

## Overview
Add a CSV Upload button next to the existing CSV Export button. The upload handles incremental loads intelligently: matching existing records by name/website, updating them in place, and only inserting truly new prospects. A preview step lets the user review changes before committing.

## How It Works

### Upload Flow
1. User clicks "Upload CSV" button in header (new button next to existing "CSV" export button)
2. File picker opens, user selects a .csv file
3. App parses the CSV, maps columns to prospect fields
4. A **preview dialog** appears showing:
   - **New prospects** (no match found) -- highlighted green
   - **Updates** (matched by website or fuzzy name) -- highlighted blue, showing what fields will change
   - **Possible duplicates** (fuzzy match 0.5-0.7 similarity) -- highlighted yellow, user can confirm or skip each
   - **Skipped** (exact match, no changes) -- greyed out
5. User clicks "Confirm Import" to apply changes
6. Toast: "CSV imported! 12 added, 8 updated, 3 skipped"

### Matching Logic
```text
For each CSV row:
  1. Exact website match? --> UPDATE that prospect
  2. Name similarity > 0.7? --> UPDATE (auto-matched)
  3. Name similarity 0.5-0.7? --> FLAG as possible duplicate for user review
  4. No match? --> INSERT as new prospect
```

### Column Mapping
The CSV parser will be flexible -- it recognizes common column header variations:
- "Company" / "Name" / "Company Name" --> `name`
- "Website" / "URL" / "Domain" --> `website`
- "Industry" / "Vertical" / "Category" --> `industry`
- "Locations" / "Location Count" / "Locs" / "# Locations" --> `locationCount`
- "Status" --> `status`
- "Owner" / "Transition Owner" / "Rep" --> `transitionOwner`
- "Priority" / "Heat" --> `priority`
- "Tier" --> `tier`
- "Outreach" / "Stage" / "Pipeline" --> `outreach`
- "Competitor" --> `competitor`
- "Notes" / "Location Notes" --> `locationNotes`

Unrecognized columns are ignored.

### Update Rules
When updating an existing prospect:
- **Fill blanks**: If the existing field is empty but CSV has a value, use the CSV value
- **Overwrite**: If both have values and they differ, the CSV value wins (it's the newer data)
- **Never clear**: If CSV has an empty cell but existing has data, keep existing data
- **Preserve app-only fields**: `contacts`, `interactions`, `noteLog`, `nextStep`, `nextStepDate`, `ps` (score) are never overwritten by CSV -- these are app-managed

## Files to Create/Modify

### New: `src/components/CSVUploadDialog.tsx`
- File input + drag-and-drop zone
- CSV parsing logic (split by comma, handle quoted fields)
- Column header auto-mapping
- Match/diff engine using `stringSimilarity` from prospects.ts
- Preview table with color-coded rows (new/update/duplicate/skip)
- Checkboxes to include/exclude individual rows
- "Confirm Import" button that calls `add()` and `update()` from useProspects

### Modify: `src/components/TerritoryPlanner.tsx`
- Add "Upload CSV" button next to existing CSV export button (Upload icon)
- Add state: `const [showUpload, setShowUpload] = useState(false)`
- Render `CSVUploadDialog` with `open={showUpload}` and pass `data`, `add`, `update` props
- Add to Command Palette: "Upload CSV" option

### Modify: `src/hooks/useProspects.ts`
- Add a `bulkAdd` function that adds multiple prospects at once (more efficient than calling `add()` in a loop)
- Add a `bulkMerge` function that takes an array of `{ id, updates }` for batch updates

### No changes needed:
- `src/data/prospects.ts` -- `stringSimilarity` already exported and ready to use
- Score recalculation happens automatically since `ps` is computed on render

## UI Design

### Upload Button
Sits next to the existing CSV export button in the header bar:
```text
[Insights] [CSV ↓] [CSV ↑] [+ Add Prospect]
```
The upload button uses the `Upload` icon from lucide-react.

### Preview Dialog
A large dialog (max-w-4xl) with a scrollable table:
```text
+--------------------------------------------------+
|  CSV Import Preview                               |
|  File: prospects_update.csv (45 rows)             |
|--------------------------------------------------|
|  Summary: 12 New | 8 Updates | 3 Review | 22 Skip|
|--------------------------------------------------|
|  [x] | NEW    | Acme Corp    | acme.com   | QSR  |
|  [x] | UPDATE | White Spot   | whitespot… | +locs|
|  [?] | REVIEW | Whit Spot    | whitspot…  | dup? |
|  [ ] | SKIP   | Food King    | (no change)|      |
|--------------------------------------------------|
|  [Cancel]                    [Confirm Import (23)]|
+--------------------------------------------------+
```

Color coding:
- Green badge: NEW
- Blue badge: UPDATE
- Yellow badge: REVIEW (needs user confirmation)
- Grey badge: SKIP (exact match, no changes)

