

## Add "Has/Missing" Data Filter

### What it does
Adds a new filter dropdown next to the existing ones (Industry, Outreach, etc.) that lets you filter prospects by whether they **have** or are **missing** key data like contacts, notes, interactions, tasks, AI readiness, website, etc. For example: "No Contacts", "Has Contacts", "No Notes", "Has AI Readiness".

### Changes

**`src/components/TerritoryPlanner.tsx`**
1. Add new state: `const [fDataFilter, setFDataFilter] = useState<string[]>([])` for the has/missing filter selections.
2. Add a new `MultiSelect` in the filter bar (after Priority, before Locations) with options like:
   - "Has Contacts" / "No Contacts"
   - "Has Notes" / "No Notes"  
   - "Has Interactions" / "No Interactions"
   - "Has Tasks" / "No Tasks"
   - "Has AI Readiness" / "No AI Readiness"
   - "Has Website" / "No Website"
3. In the `filtered` useMemo, apply each selected data filter condition. E.g. "No Contacts" → `p.contacts?.length === 0 || !p.contacts`.
4. Update `clr()`, `hasFilters`, `SavedView` interface, `handleSaveView`, `loadView`, and the `useMemo` dependency array to include the new filter state.

### Technical detail
- The filter works as OR within a category (e.g. selecting "No Contacts" + "No Notes" shows prospects missing contacts OR missing notes) — consistent with how existing multi-select filters behave.
- Actually, re-thinking: the "Has X" and "No X" options are mutually exclusive per field but multiple fields can be selected. The simplest approach: treat each selected option as an AND condition — "No Contacts" AND "No Notes" = prospects missing both. This is more useful for the user's stated goal of finding gaps.
- Uses the existing `MultiSelect` component with a placeholder like "Data" or "Has / Missing".

