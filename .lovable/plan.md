

# Territory Planner Improvements + New Features

## 1. Logo Display Fix

Switch to Google's favicon service (`https://www.google.com/s2/favicons?domain=DOMAIN&sz=64`) as the primary source -- it works for virtually any website. Clearbit as fallback for higher-quality logos.

## 2. Quick Add Prospect

"Add Prospect" button next to the heading opens a dialog with fields: Company Name (required), Website, Industry (dropdown), Location Count, Status, Tier. New `add` function in `useProspects` hook.

## 3. Proper Delete Confirmation Dialog

Replace browser `confirm()` with a styled AlertDialog showing company name, "This action cannot be undone" warning, red Delete button + Cancel.

## 4. UX/UI Enhancements (21st.dev-inspired)

- Subtle hover card transitions on table rows (scale/shadow lift)
- Skeleton loading states
- Toast notifications (sonner) for all actions
- Keyboard shortcut hint (Cmd+K) for search
- Animated stat pill counters
- Destructive glow on delete button hover
- Empty state illustration when no results

## 5. Additional Features (No External APIs / No Cost)

### A. Bulk Actions
Add checkboxes to table rows with a top toolbar that appears when items are selected. Actions: bulk update outreach stage, bulk assign tier, bulk delete. Speeds up workflow dramatically.

### B. Prospect Activity Timeline
On the prospect detail page, show a unified timeline of all interactions (emails, calls, LinkedIn messages) and field changes in chronological order. Pure frontend -- just renders the existing `interactions` array as a visual timeline with icons and relative timestamps ("3 days ago").

### C. CSV Export
"Export CSV" button on the All Prospects page that generates a downloadable CSV of the current filtered view using the browser's built-in Blob/download API. No backend needed.

### D. Saved Filters / Views
Let users save their current filter combinations as named views (e.g., "Hot Tier 1 prospects", "Churned with competitor"). Stored in localStorage alongside prospect data. Renders as clickable tabs above the filter bar.

### E. Drag-and-Drop Kanban Board View
Toggle between the table view and a kanban board where columns represent outreach stages (Cold, Contacted, Meeting Booked, etc.). Prospects are draggable cards. Uses native HTML5 drag-and-drop -- no external library needed.

### F. Notes with Timestamps
On the prospect detail page, convert the single "notes" text field into a threaded notes log. Each note entry gets an automatic timestamp. Notes are displayed newest-first. Simple append-only model stored in the prospect object.

### G. Duplicate Detection
When adding a new prospect (or on page load), flag potential duplicates by comparing company names using basic string similarity (Levenshtein or normalized substring match). Show a warning banner: "Possible duplicate of X" with a link to the existing record.

### H. Dashboard Sparklines
Add tiny inline sparkline charts next to each stat pill showing the trend over time (e.g., how many prospects were added per week). Track a simple `createdAt` timestamp on each prospect and compute counts per week. Uses recharts (already installed).

## Technical Details

### Files to modify:
1. **`src/hooks/useProspects.ts`** -- Add `add`, bulk update/delete functions
2. **`src/components/TerritoryPlanner.tsx`** -- Quick Add dialog, Google favicon, bulk actions, saved views tabs, kanban toggle, CSV export button, skeleton loading, animated stats, search shortcut, duplicate detection
3. **`src/pages/ProspectPage.tsx`** -- AlertDialog delete, Google favicon, toast notifications, activity timeline, threaded notes
4. **`src/index.css`** -- Animation keyframes for hover effects and transitions
5. **`src/data/prospects.ts`** -- Add `createdAt` field to Prospect type

### New dependencies: None -- all features use existing installed packages (recharts, shadcn components, sonner) plus native browser APIs (Blob, HTML5 drag-and-drop).

