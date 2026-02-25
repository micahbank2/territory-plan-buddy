

# Industries Alphabetized, Outreach Stages Updated, Next Step Fix

## 1. Alphabetize Industries Dropdown

Sort the `INDUSTRIES` array in `src/data/prospects.ts` alphabetically, keeping "Other" at the end.

## 2. Replace Outreach Stages

Replace the current `STAGES` array in `src/data/prospects.ts` with:
- "Not Started"
- "Actively Prospecting"
- "Meeting Booked"
- "Closed Lost"
- "Closed Won"

Update `STAGE_COLORS` and `STAGE_EMOJI` in `TerritoryPlanner.tsx` to match the new stage names. Remove old entries (Researching, Contacted, Meeting Set, Proposal Sent, Negotiating, On Hold).

Update scoring in `scoreBreakdown()` and `scoreProspect()` in `prospects.ts`:
- Old: "Meeting Set" / "Proposal Sent" gave +15, "Contacted" gave +5
- New: "Meeting Booked" gives +15, "Actively Prospecting" gives +5

## 3. Fix Next Step "Logging" Experience

The problem: when you mark a next step complete in the sidebar panel (`ProspectSheet.tsx`), the local state `localNextStep` doesn't clear because the `useEffect` sync only runs on `prospect?.id` change, not on field changes. Also, the user wants to be able to "log" a next step and immediately start entering another one.

Fix in `ProspectSheet.tsx`:
- Add `setLocalNextStep("")` to `markNextStepComplete()` (ProspectPage already has this)
- Change the `useEffect` dependency from `[prospect?.id]` to `[prospect?.id, prospect?.nextStep, prospect?.locationCount, prospect?.competitor]` so local state re-syncs when the underlying data changes after a complete action

Same dependency fix in `ProspectPage.tsx` for consistency.

## Files to Modify

| File | Changes |
|------|---------|
| `src/data/prospects.ts` | Alphabetize INDUSTRIES, replace STAGES with 5 new values, update scoring for new stage names |
| `src/components/TerritoryPlanner.tsx` | Update STAGE_COLORS and STAGE_EMOJI maps to match new stages |
| `src/components/ProspectSheet.tsx` | Add `setLocalNextStep("")` in markNextStepComplete, expand useEffect deps |
| `src/pages/ProspectPage.tsx` | Expand useEffect deps for consistency |

