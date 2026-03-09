

## Plan: Add RetroGrid Component and Apply Polished Text Styling

### What You Want
Add the RetroGrid animated grid component (without the black background) and sprinkle its polished text styling (gradient shimmer text, bold hero treatment) across key areas of the app to make it pop.

### Changes

**1. Create `src/components/ui/retro-grid.tsx`**
- Copy the RetroGrid component as provided, using CSS variables so it inherits the current theme colors (no black background forced).

**2. Extend `tailwind.config.ts`**
- Add the `grid` keyframe animation (`translateY(-50%)` to `translateY(0)` over 15s linear infinite).

**3. Apply RetroGrid as a subtle background accent**
- Add RetroGrid behind the **header section** (`yext-gradient` area) with low opacity so the animated grid lines appear subtly behind the logo and title. No black background -- it layers on top of the existing gradient.
- Optionally add it to the **Auth page** behind the login card for visual polish.
- Add it to the **empty state** screen (no prospects yet) for visual interest.

**4. Apply gradient shimmer text styling**
- Update the main "Territory Planner" title (`text-4xl font-black`) to use a gradient text effect (primary to a lighter shade) with the pointer-events-none z-10 treatment from the demo.
- Apply similar gradient text to the "Insights" page header title.
- Add a reusable CSS class `.gradient-text` in `index.css` that applies `bg-clip-text text-transparent` with a primary-based gradient, usable anywhere.

### Files Modified
| File | Change |
|------|--------|
| `src/components/ui/retro-grid.tsx` | New component |
| `tailwind.config.ts` | Add `grid` animation keyframe |
| `src/index.css` | Add `.gradient-text` utility class |
| `src/components/TerritoryPlanner.tsx` | Add RetroGrid to header, apply gradient text to title |
| `src/pages/AuthPage.tsx` | Add RetroGrid behind login card |
| `src/pages/InsightsPage.tsx` | Apply gradient text to header title |

