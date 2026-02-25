

# Territory Planner: Logo Upload, Bigger Badges, Score Context, and Home Page Enhancements

## 1. Custom Logo Upload Fallback

When no logo loads from Google Favicons, allow users to upload their own logo image for that prospect.

**How it works:**
- The `LogoImg` component gets an "upload" overlay button that appears when the fallback Building2 icon is shown (or on hover of any logo)
- Clicking opens a file picker; the selected image is converted to a base64 data URL and stored in a new `customLogo` field on the Prospect object
- Custom logos take priority over Google Favicon
- A small "x" button on hover lets you remove a custom logo

**Files:**
- `src/data/prospects.ts` -- Add `customLogo?: string` to the `Prospect` interface
- `src/components/TerritoryPlanner.tsx` -- Update `LogoImg` to accept `onUpload` callback, show upload affordance on fallback
- `src/pages/ProspectPage.tsx` -- Same `LogoImg` upgrade, wire upload to `update(id, { customLogo })` 

## 2. Bigger Status/Competitor/Tier Badges

Currently these are tiny `text-[11px] px-2 py-0.5` chips. Make them more prominent:

**List view (TerritoryPlanner.tsx):**
- Status badge: bump to `text-xs px-2.5 py-1 rounded-lg font-bold`
- Competitor badge: same sizing upgrade
- Both get slightly more padding and bolder text

**Detail page header (ProspectPage.tsx):**
- Status, Competitor, and Tier badges in the header: bump to `text-sm px-3 py-1 rounded-lg font-bold`
- More visible with stronger background opacity

## 3. Score Context -- Make the Number Meaningful

The score number (e.g., "90") is shown but users don't know if it's good or bad.

**Changes:**
- Add a score label: "Excellent" (60+), "Strong" (40-59), "Moderate" (20-39), "Low" (1-19), "Needs Work" (0 or below)
- Color coding: green for excellent/strong, blue for moderate, gray for low, red for negative
- In the list view, show a small colored dot + the label abbreviation next to the number
- In the detail page header, show the full label under the score number
- Add a tooltip explaining the scoring system when hovering the score

## 4. Stale Accounts + Top Scored on Home Page

Port the "Top Scored -- Never Contacted" and "Stale Accounts" lists from the Insights page to the home page, positioned below the stat pills and above the table.

**Implementation:**
- Two compact horizontal cards side by side (grid cols 2) showing top 5 each
- Each row: logo + name + score, clickable to navigate to prospect
- Collapsible with a toggle so power users can hide them once they've reviewed

## 5. Additional Feature Ideas

### A. Smart Score Breakdown Tooltip
When hovering or clicking the score on a prospect detail page, show a breakdown: "+40 for 500+ locations", "+20 for QSR industry", "+25 for Hot priority", etc. Helps users understand WHY a score is what it is. Pure frontend logic using the existing `scoreProspect` function expanded to return itemized reasons.

### B. Quick Action Buttons on Home Page Rows
Add small icon buttons (visible on hover) directly on each table row for common actions: log a quick call, change stage, mark as hot. Saves a click vs opening the full detail page.

### C. Weekly Email-Style Digest Card
On the home page, show a dismissible "This Week" summary card at the very top: "You added X prospects, logged Y interactions, Z accounts need attention." Computed from timestamps. Dismissible per session.

## Technical Details

### Files to modify:
1. **`src/data/prospects.ts`** -- Add `customLogo?: string` to Prospect interface
2. **`src/components/TerritoryPlanner.tsx`** -- Bigger badges, score labels/colors, LogoImg upload, stale+untouched cards on home, quick action row buttons, weekly digest card
3. **`src/pages/ProspectPage.tsx`** -- Bigger badges, score label + breakdown tooltip, LogoImg upload
4. **`src/pages/InsightsPage.tsx`** -- Score label consistency

### No new dependencies needed.

