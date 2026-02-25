

# Territory Planner UX Improvements + New Features

## 1. Remove Owner Field from Prospect Detail Page
Remove the "Owner" line from the Details metadata card on the prospect page (line 531 of ProspectPage.tsx). You own all accounts -- no need for this field.

## 2. Move Pagination to Bottom of Table
Currently pagination sits above the table (lines 523-545 of TerritoryPlanner.tsx). Move it to below the table (after the `</table>` closing tag) so users can paginate after scrolling through results. Keep the "Showing X-Y of Z" text and prev/next buttons in the same style.

## 3. Additional Features to Make This a Prospecting Machine

### A. Global Command Palette (Cmd+K)
Upgrade the current Cmd+K shortcut from just focusing search to a full command palette (using the already-installed `cmdk` package). Quick-jump to any prospect by name, switch views, trigger actions like "Add Prospect" or "Export CSV" -- all from the keyboard. Power-user essential.

### B. Last Contacted Aging Indicator
Show a colored dot or badge next to each prospect in the list view indicating how long since last interaction: green (< 7 days), yellow (7-30 days), red (30+ days), gray (never). Helps identify stale accounts at a glance. Computed from the `interactions` array -- no API needed.

### C. Follow-Up Reminders / Next Steps
Add a "Next Step" field on the prospect detail page -- a short text + date picker. On the All Prospects list, prospects with overdue next steps get a visual flag. Stored in localStorage alongside existing data.

### D. Pipeline Summary Bar
A thin horizontal stacked bar at the top showing the distribution of prospects across outreach stages (Not Started / Contacted / Meeting Set / etc.) with color coding. Clicking a segment filters the list. Gives instant pipeline health visibility.

### E. Quick Inline Edit on Table Rows
Double-click a cell (e.g., Outreach Stage, Tier) in the table to edit it inline without navigating to the detail page. Speeds up bulk data entry significantly.

### F. Prospect Comparison View
Select 2-3 prospects and open a side-by-side comparison table showing key metrics (locations, score, tier, stage, competitor). Helps prioritize which accounts to focus on.

### G. Weekly Digest / Stats Summary Page
A new `/insights` page showing: prospects added this week, interactions logged, stage movement (how many moved forward), top-scored untouched accounts. All computed from existing data timestamps.

## Technical Details

### Files to modify:
1. **`src/pages/ProspectPage.tsx`** -- Remove owner field from Details card, add Next Step field
2. **`src/components/TerritoryPlanner.tsx`** -- Move pagination below table, add command palette, aging indicators, pipeline bar, inline editing
3. **`src/data/prospects.ts`** -- Add `nextStep` and `nextStepDate` fields to Prospect type
4. **`src/hooks/useProspects.ts`** -- No changes needed (existing `update` function handles new fields)
5. **`src/pages/InsightsPage.tsx`** (new) -- Weekly digest / stats summary page
6. **`src/App.tsx`** -- Add route for `/insights`
7. **`src/index.css`** -- Add any new animation keyframes for command palette transitions

### Dependencies: None new -- `cmdk` is already installed for the command palette.
