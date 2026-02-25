
# Polish Pass: Yext Logos, Light Mode Fix, Score Tooltips, UI Refinements

## 1. Add Yext Logo Assets

Copy both uploaded Yext logo files into the project:
- `user-uploads://Yext_Logo_Black-8000x8000-64f762d_1.jpg` to `src/assets/yext-logo-black.jpg`
- `user-uploads://Yext_Logo_White-8000x8000-64f762d_1.jpg` to `src/assets/yext-logo-white.jpg`

Create a `YextLogo` component that renders the black logo in light mode and white logo in dark mode using `next-themes` `useTheme()`. Place it in the header next to the title.

## 2. Fix Light Mode Text Visibility

Replace all `text-primary-foreground` classes in the header, buttons, and toggles across `TerritoryPlanner.tsx` and `InsightsPage.tsx` with `text-foreground` (which correctly adapts to both themes). This fixes the invisible text issue in light mode.

Affected areas:
- Header title, subtitle, buttons, view toggles, theme toggle, reset button
- Insights page header title, back arrow
- All header action buttons (`Insights`, `CSV`, `Compare`, etc.)

## 3. Bigger Header Title + Yext Logo

- Increase header title from `text-2xl` to `text-4xl font-black`
- Center the header content (logo + title + subtitle) using flex centering
- Add the `YextLogo` component (about 40px tall) to the left of the title
- Remove the small "Yext" pill badge (redundant now that the logo is present)
- Make the subtitle slightly larger (`text-sm` instead of `text-xs`)

The Insights page header will get the same treatment -- bigger title (`text-2xl`), Yext logo, remove the redundant pill badge.

## 4. Emoji/Icon Duplication Cleanup

Remove redundant emojis where Lucide icons already exist:
- "Action Items" header: Remove the target emoji, keep the collapsible chevron icon
- "Top Scored -- Never Contacted": Remove the lightning emoji, keep the `Zap` icon
- "Stale Accounts (30+ days)": Remove the spider web emoji, keep the `AlertTriangle` icon
- Insights page: Same cleanup for section headers that have both icons and emojis
- Pipeline stage labels in the summary bar: Remove `STAGE_EMOJI` prefix since the colored dots already indicate stage

## 5. Score Tooltip with Breakdown

Upgrade the `ScoreBadge` component to show a detailed breakdown tooltip:
- Import `scoreBreakdown` from `@/data/prospects`
- Accept the full `prospect` object (not just `score`)
- Render each breakdown item as a line: `+40 500+ locations`
- Add a footer note: "Higher scores are prioritized in Action Items and Insights"

This requires passing the prospect to `ScoreBadge` everywhere it's used (table rows, kanban cards, action item lists, ProspectSheet).

## 6. Table Column Text -- More Prominent

Change lines 1135-1136 in TerritoryPlanner.tsx:
- Locations: `text-muted-foreground` to `text-foreground font-medium`
- Industry: `text-muted-foreground` to `text-foreground font-medium`

## 7. Grid Background -- More Visible

In `src/index.css`, update `.yext-grid-bg`:
- Increase grid-line opacity from `0.04` to `0.08`
- Add a subtle radial gradient glow overlay at the center for depth:
  `radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 70%)`

## 8. Stat Pill Label + Sizing Fixes

Update the stat pills array:
- `"Total"` becomes `"Total Accounts"`
- `"100+"` becomes `"100+ Locs"`
- `"500+"` becomes `"500+ Locs"`
- Increase pill padding from `px-4 py-2.5` to `px-5 py-3.5`
- Increase number font from `text-lg` to `text-xl`
- Increase label font from `text-xs` to `text-sm`

## Files to Modify

1. **Copy assets**: `src/assets/yext-logo-black.jpg` and `src/assets/yext-logo-white.jpg`
2. **`src/index.css`**: Grid background opacity + radial glow
3. **`src/components/TerritoryPlanner.tsx`**: Header redesign (bigger title, Yext logo, light mode fix), stat pill labels/sizing, emoji cleanup, score tooltip upgrade, table column text prominence
4. **`src/components/ProspectSheet.tsx`**: Score tooltip upgrade, emoji cleanup
5. **`src/pages/InsightsPage.tsx`**: Header light mode fix, bigger title, Yext logo, emoji cleanup
6. **`src/data/prospects.ts`**: No changes needed (scoreBreakdown already exists)
