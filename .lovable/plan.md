

## Plan: Add Incremental ACV Field to Opportunities

### What
Add an optional "Incremental ACV" field to deals. Example: a renewal has $200K ACV but the customer currently pays $150K, so the incremental value is $50K. This field is not required — sometimes incremental equals the full ACV or isn't relevant.

### Changes

**1. Database migration** — Add `incremental_acv` column to `opportunities` table:
```sql
ALTER TABLE public.opportunities ADD COLUMN incremental_acv integer DEFAULT NULL;
```
Nullable, no default value forced — keeps it optional.

**2. `src/hooks/useOpportunities.ts`**
- Add `incremental_acv: number | null` to the `Opportunity` interface
- Add `"incremental_acv"` to the `DB_FIELDS` set
- Add it to the SELECT column list in `load()`

**3. `src/pages/OpportunitiesPage.tsx`** (Add Deal form + table)
- Add `incremental_acv: null` to `emptyOpp`
- Add an "Incremental ACV ($)" input field next to the existing ACV field in the Add Deal dialog (optional, no validation)
- Add an "Incremental" column in the table next to ACV — show value if set, dash or blank if null
- Include incremental ACV in the footer totals row

**4. `src/components/OpportunitySheet.tsx`** (Deal detail panel)
- Add local state `localIncrementalACV` mirroring the existing `localACV` pattern
- Add an editable "Incremental ACV" field below the ACV field
- Show incremental ACV in the header summary area next to ACV when set
- Wire up `commitField` and `saveAll` to handle `incremental_acv`

**5. `src/components/OpportunityKanban.tsx`** (Kanban cards)
- Show incremental ACV on cards when set, as a smaller secondary value below the main ACV

### Technical Details
- The field follows the exact same pattern as `potential_value`: integer, nullable, sanitized via `DB_FIELDS`, committed via `commitField`
- No form validation needed — blank/empty means null, parsed via `parseInt() || null`
- In `sanitizeForDb`, treat `incremental_acv` like `close_date`: omit if falsy

