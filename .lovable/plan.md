

## Plan: Fix CSV Contact Import Detection and Mapping

### Root Cause

The uploaded CSV has columns: `Company, Contact Name, Job Title, ...`

The current `detectContactMode()` function **only** triggers contact import mode when it finds "First Name" or "Last Name" columns. Your CSV uses "Contact Name" (a single full-name field), so it falls through to **prospect mode** instead. In prospect mode, "Company" maps to prospect `name` and each row tries to create a separate prospect — contacts are never created.

Even if contact mode were forced, `mapContactRow` has no alias for "Contact Name", so the name would be blank and the row would be skipped.

### Changes to `src/components/CSVUploadDialog.tsx`

**1. Expand `detectContactMode` to recognize more contact CSV patterns:**
- Add detection for "Contact Name" column (full name, not split first/last)
- Add detection for "Job Title" + "Company" column combo (strong signal of contact data)
- Keep existing first/last name detection

**2. Add contact column aliases for common ZoomInfo/Sales Nav formats:**
- `"contact name"`, `"full name"`, `"name"` → `"fullName"` (new field)
- `"job title"`, `"position"` → `"title"` (already exists but not triggering detection)

**3. Update `mapContactRow` to handle full name field:**
- If `fullName` is populated (from "Contact Name"), use it directly as `contact.name`
- Still fall back to `firstName + lastName` combination when those columns exist
- This makes both ZoomInfo format (`Contact Name`) and split-name format (`First Name, Last Name`) work

**4. Relax the company-matching threshold slightly:**
- Currently uses exact match then fuzzy > 0.7 for auto-include. The company names from ZoomInfo should match well since they're official names.

### What This Fixes
- "The Learning Experience" contacts (Christian Manzano, Stella Carter, Kenneth Deon) will be detected as contacts, matched to the existing prospect, and imported
- All 61 rows in the CSV will be processed as contact imports instead of prospect imports
- The preview will show contact names, titles, and matched companies correctly

### Files Modified
| File | Change |
|------|--------|
| `src/components/CSVUploadDialog.tsx` | Fix `detectContactMode`, add "contact name"/"full name" aliases, update `mapContactRow` to handle full name field |

