
# Saved Views UX + Action Items Descriptions

## 1. Saved Views: Deselect Without Deleting

**Problem**: The only way to dismiss a saved view is the red X which permanently deletes it. Users need to click a view to apply it, then click it again (or click elsewhere) to deselect it without losing it.

**Fix** in `TerritoryPlanner.tsx`:
- Track which saved view is currently active: add `const [activeViewId, setActiveViewId] = useState<string | null>(null)`
- When a saved view button is clicked:
  - If it's already active (`activeViewId === v.id`), **deselect** it: call `clr()` to reset filters and set `activeViewId` to `null`
  - If it's not active, **apply** it: call `loadView(v)` and set `activeViewId` to `v.id`
- Style the active view pill with a highlighted/selected appearance (e.g., `bg-primary text-primary-foreground` instead of `bg-primary/5 text-primary`)
- Keep the red X for permanent deletion, but move it behind a right-click or long-press, or keep it as-is since it only shows on hover -- this is fine as long as toggling works

## 2. "Never" Label in Stale Accounts

**Problem**: Line 963 shows `"Never"` for prospects with no interactions. This is confusing in the stale accounts context.

**Fix**: Change `"Never"` to `"No activity yet"` on line 963. This is clearer about what it means.

## 3. Add Description Text Under Action Item Cards

Add a small helper sentence under each card's title so users immediately understand what each section means:

- **Top Scored -- Never Contacted**: Add `"Highest-potential accounts you haven't reached out to yet."` as a subtitle below the heading
- **Stale Accounts (30+ days)**: Add `"Accounts with no logged activity in the last 30 days."` as a subtitle below the heading
- **Upcoming Tasks** (if it exists): Add `"Next steps and follow-ups sorted by due date."` as a subtitle

Each subtitle will be a `<p>` tag with `text-[10px] text-muted-foreground mb-2` styling, placed right after the heading `div`.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TerritoryPlanner.tsx` | Add `activeViewId` state, toggle logic on saved view click, active styling, change "Never" to "No activity yet", add description text under all 3 action item card headings |
