

# Restore All 303 Prospects from CSV

## Problem
The `RAW_SEED` array in `src/data/prospects.ts` currently only has 120 entries (IDs 1-120). The remaining 183 entries (IDs 121-303) were lost during a previous edit. Your Lovable preview shows 303 because it reads stale localStorage data, but the live/published version seeds from the truncated array.

## Solution
Append the missing 183 prospect entries (IDs 121-303) to the `RAW_SEED` array in `src/data/prospects.ts`, parsed directly from your uploaded CSV. Each entry will include `id`, `name`, `website`, `transitionOwner`, `status`, and where available: `locationCount`, `industry`, and `locationNotes`.

Notable prospects being restored include:
- Whole Foods Market Canada (500 locations)
- Shake Shack (420+ locations)
- Piggly Wiggly (493 stores)
- Key Food Stores (450 stores)
- Petro Canada (1,500+ stations)
- Wind Hotels / Wyndham (9,100+ hotels)
- Office Depot (810 stores)
- PODS Moving & Storage (230+ centers)
- And 175 more

## Industry Mapping
Some CSV industries don't match the existing `INDUSTRIES` array. These will be mapped to the closest match or "Other":
- "Convenience Store/Gas" -> "Gas Stations"
- "Grocery/Supermarket" -> "Grocery"
- "Childcare/Education Franchise" -> "Daycare/Tutoring"
- "Fast Casual/Bakery-Cafe" -> "QSR/Fast Casual"
- Niche categories (Video Rental, Attractions/Zoo, etc.) -> "Other"

## Files to modify
1. **`src/data/prospects.ts`** -- Add 183 entries to the `RAW_SEED` array (IDs 121-303)

## Additional: Bump Storage Key
Change `STORAGE_KEY` from `"tp-data-v4"` to `"tp-data-v5"` so that both the preview and live version re-seed from the now-complete array, ensuring all 303 prospects appear everywhere.

