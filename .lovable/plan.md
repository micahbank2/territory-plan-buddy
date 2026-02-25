

# Replace Account Data, Fix Tooltip Clipping, and Multi-Select Stat Pills

## 1. Replace All Account Data with New CSV

Replace the hardcoded `RAW_SEED` array in `src/data/prospects.ts` with the 309 accounts from the uploaded CSV. The CSV has three columns:

- `Account Name` --> `name`
- `Enterprise Client Status` --> `status` (values: "Prospect" or "Churned")
- `Website` --> `website` (strip `http://www.` prefix to store clean domain)

Each record will be initialized with `initProspect()` so all other fields (industry, locationCount, contacts, interactions, etc.) start empty/default and can be filled in manually via the app.

Logos will automatically pull in via the existing `getLogoUrl()` function which uses Google Favicons based on the website domain -- no changes needed there.

Scoring, filtering, and all downstream features remain intact since they all read from the same `Prospect` interface and compute dynamically.

Also bump the `STORAGE_KEY` from `"tp-data-v5"` to `"tp-data-v6"` so existing localStorage is ignored and the fresh seed data loads on next visit.

## 2. Fix Score Tooltip Clipping

The tooltips are being cut off because the table container at line 1085 of `TerritoryPlanner.tsx` has `overflow-hidden` in its `rounded-xl` class. Radix tooltips render via a Portal so they should escape the container, but the issue is likely the combination of `overflow-hidden` on ancestors.

**Fix**: Update the `TooltipContent` component in `src/components/ui/tooltip.tsx` to always use `collisionPadding={12}` and add `z-[9999]` to ensure it renders above everything and respects viewport boundaries. Also ensure the `avoidCollisions` prop is true (it is by default).

Additionally, in `ScoreBadge`, change `side="top"` to `side="left"` so the tooltip opens to the side rather than above, which avoids clipping against the top of the viewport and the table edges.

## 3. Multi-Select Stat Pills

Currently each stat pill calls `clr()` then sets one filter, replacing all other filters. The user wants toggle behavior where clicking a pill adds/removes that filter without clearing others.

**Changes to `TerritoryPlanner.tsx`**:
- "Hot" pill: toggle "Hot" in/out of a priority filter (add `fPriority` state, or reuse by filtering on priority field)
  - Actually, since there's no `fPriority` filter state, the simplest approach is to make the stat pills that map to existing filter dimensions toggle those filters:
    - "50+ Locs", "100+ Locs", "500+ Locs" --> toggle location range
    - "Prospects" --> toggle "Prospect" in `fStatus`
    - "Churned" --> toggle "Churned" in `fStatus`
    - "Hot", "Warm" --> these need a new `fPriority` filter state since priority filtering doesn't currently exist as a multi-select
- Add `fPriority` state (`useState<string[]>([])`) and include it in the filter chain
- Add a Priority `MultiSelect` dropdown next to the existing filter dropdowns
- Update each stat pill's `onClick` to toggle its value in the corresponding filter array instead of calling `clr()`
- "Total Accounts" pill will still clear all filters (acts as a reset)

## Files to Modify

1. **`src/data/prospects.ts`**: Replace `RAW_SEED` array with 309 new accounts from CSV. Bump `STORAGE_KEY` to `"tp-data-v6"`.

2. **`src/components/ui/tooltip.tsx`**: Add `collisionPadding={12}` as default prop, increase z-index to `z-[9999]`.

3. **`src/components/TerritoryPlanner.tsx`**:
   - Add `fPriority` state and wire it into the filter chain
   - Add Priority `MultiSelect` in the filter bar
   - Update stat pill click handlers to toggle filters instead of replacing them
   - Change `ScoreBadge` tooltip `side` from `"top"` to `"left"`
   - Include `fPriority` in `clr()`, `hasFilters`, saved views, etc.

4. **`src/pages/InsightsPage.tsx`**: Same `ScoreBadge` tooltip side fix if present.
