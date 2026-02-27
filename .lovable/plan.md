

# Fix: CSV Import Data Loss and Header Resilience

## Root Cause

Your data lives in **browser localStorage**, which is tied to the specific URL (origin) of the preview. When code changes are deployed, the preview URL can change, and all localStorage data is lost. The CSV import itself worked correctly -- you saw the preview, confirmed it, and got the success toast -- but the data disappeared when the app was redeployed to a new URL.

## What Gets Fixed

### 1. Smarter Header Matching (prevent future silent failures)
Even though "locations" was already a recognized alias, the current system silently drops any column it doesn't recognize. We'll add:
- **Header normalization**: strip accents, collapse whitespace, lowercase, remove underscores
- **Fuzzy matching**: if exact match fails, try "starts with" and "contains" fallbacks
- **Unrecognized column warnings**: show which CSV columns couldn't be mapped so you know if something was missed
- **More aliases**: add common variations like "# locations", "store count", "number of locations", "locs count"

### 2. Post-Import Verification Toast
After confirming an import, the success toast will include a breakdown: "12 added, 5 updated, 3 skipped, 2 columns not mapped: [Store Type, Region]" -- so you immediately know if something didn't map.

### 3. LocalStorage Persistence Guard
- Add a **data export reminder** after imports: a subtle prompt suggesting you export/download your data as backup
- Add the prospect count to the page header so data loss is immediately obvious (e.g., "309 prospects" visible at all times)

## Technical Details

### Files to modify:

| File | Changes |
|------|---------|
| `src/components/CSVUploadDialog.tsx` | Add `normalizeHeader()` function, fuzzy column matching with 3-tier priority (exact -> starts-with -> contains), show unmapped columns warning in preview, enhanced success toast with column mapping summary |
| `src/components/TerritoryPlanner.tsx` | Show prospect count in header area for quick visual verification |

### Header normalization function:
```text
normalizeHeader("# Locations") -> "locations"
normalizeHeader("Location_Count") -> "location count"  
normalizeHeader("Num. Locations") -> "num locations"
```

### Matching priority:
1. Exact match (after normalization)
2. Starts-with match
3. Contains match

### Unmapped columns UI:
A small amber warning banner in the preview step:
"2 columns not mapped: Store Type, Region"
This way you immediately know if your CSV had columns the system didn't recognize.

Note: The fundamental data persistence issue (localStorage being origin-scoped) is a known limitation. A full fix would require migrating prospect data to Lovable Cloud's database, which is a separate larger effort.
