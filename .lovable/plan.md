

# Yext-ify the Territory Planner

Transform the app into a polished, Yext-branded internal tool inspired by the latest pitch deck screenshots.

## Brand Palette (from screenshots)

The new Yext brand leans into:
- **Dark charcoal backgrounds**: #1C1F2E (main), #232738 (cards), #14172A (deepest)
- **Blue/periwinkle accent**: #4F5BD5 (primary actions, highlights, grid lines)
- **Clean white text** on dark surfaces
- **Subtle blue grid-line patterns** as decorative background elements
- **Rounded pill badges** with blue outlines ("OMNI EDITION" style)
- **Minimal, confident typography** -- Inter font (already in use, perfect)

## Changes by File

### 1. `index.html`
- Add `class="dark"` to the `<html>` tag to default to dark mode
- Update `<title>` to "Territory Planner | Yext"

### 2. `src/index.css` -- Full dark theme overhaul
- Update `.dark` CSS variables to match Yext palette:
  - `--background`: deep navy #14172A
  - `--card`: slightly lighter #1C1F2E
  - `--primary`: periwinkle blue #4F5BD5
  - `--border`: subtle blue-tinted borders (white at ~10% opacity feel)
  - `--muted`: #232738
- Add new utility classes:
  - `.glass-card` -- translucent card with backdrop-blur and subtle border glow
  - `.yext-gradient` -- subtle navy-to-blue gradient for headers
  - `.yext-grid-bg` -- CSS grid-line background pattern (matching the pitch deck aesthetic)
  - `.glow-blue` -- blue box-shadow glow on hover for buttons/cards
- Update the pipeline segment and kanban card styles for the new palette
- Styled scrollbar for dark theme

### 3. `src/components/TerritoryPlanner.tsx`
- **Header**: Navy-to-blue gradient background, "Territory Planner" title in bold white, small "Yext" wordmark or badge beside it
- **Stat pills**: Glass-card style with blue accent borders, larger bolder numbers, blue glow on hover/active
- **Pipeline bar**: Taller (16px), with a subtle glow underneath, updated stage colors to complement the blue palette
- **Search bar**: Glass background, blue focus ring
- **Filter buttons**: Blue-outlined pill style (like "OMNI EDITION" badge in screenshots)
- **Table**: Darker header row, blue-tinted row hover, subtle row separators
- **Kanban columns**: Glass-card backgrounds, blue top-accent border
- **Kanban cards**: Left accent strip colored by stage, glass hover effect
- **"Add Prospect" button**: Blue gradient fill with glow
- **Action items section**: Glass cards with blue icon tints

### 4. `src/pages/ProspectPage.tsx`
- Header section with the same navy gradient
- Score badges with more vibrant coloring against dark background
- Section cards get glass-card styling
- Interaction timeline with blue accent dots

### 5. `src/pages/InsightsPage.tsx`
- Header matches main page gradient
- Chart colors updated to blue/periwinkle palette
- Stat cards and list cards get glass-card treatment
- Pie chart colors adjusted to complement the dark theme

## Visual Details

- The grid-line background pattern (visible in the pitch deck screenshots) will be implemented as a pure CSS repeating-linear-gradient on the body or main container, giving that techy "data platform" feel
- All interactive elements get smooth transitions and a subtle blue glow on hover
- Numbers and stats use slightly larger font weights to feel confident and bold
- The overall feel: dark, professional, techy -- like an internal Yext power tool

