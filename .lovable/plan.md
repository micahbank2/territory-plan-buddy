
# Make It Pop: Animations, Slide-Over Panel, Dark Theme Refinement, Emojis & Toasts

## 1. Prospect Slide-Over Panel (Airtable-style)

Instead of navigating to a new page when clicking a prospect, open a **right-side slide-over panel** that overlays the list view. The user stays on the main page, can edit fields, and close it to return to the list.

### How it works:
- Use the existing Sheet (Radix Dialog) component with `side="right"` and a wider width (~700px)
- Clicking a prospect row opens the sheet instead of `navigate(`/prospect/${p.id}`)`
- The sheet contains **all the same fields** from ProspectPage: Account Details, Next Step, Notes, Contacts, Activity Timeline, Score breakdown
- The sheet has a header with logo, name, status badges, and a "Open Full Page" link for those who still want the dedicated page
- Closing the sheet (X button, clicking overlay, or pressing Escape) returns focus to the list
- This applies to both table rows and kanban cards

### State changes in TerritoryPlanner.tsx:
- New state: `const [sheetProspectId, setSheetProspectId] = useState<number | null>(null)`
- Replace all `navigate(`/prospect/${p.id}`)` calls with `setSheetProspectId(p.id)`
- Add a `ProspectSheet` component at the bottom of the page that renders the Sheet with prospect detail content
- Keep ProspectPage.tsx intact for direct URL access (`/prospect/:id`)

## 2. Refined Dark Theme + Light/Dark Toggle

### Theme refinement:
- Update the dark palette to use richer, deeper blacks (not pure black): `#0C0E14` background, `#12151E` cards
- Slightly more blue-tinted borders for depth
- Keep the periwinkle primary accent

### Light mode palette:
- Clean white background with soft gray cards
- Same periwinkle primary accent
- Properly styled glass-card and glow effects for light mode

### Toggle:
- Add a Sun/Moon icon toggle button in the header bar (next to the reset button)
- Use `next-themes` (already installed) ThemeProvider to wrap the app
- Clicking toggles between `light` and `dark` class on HTML
- Remove the hardcoded `class="dark"` from index.html, let next-themes manage it
- Persist preference to localStorage

### Files:
- `src/App.tsx` -- wrap with ThemeProvider
- `index.html` -- remove hardcoded `class="dark"`
- `src/index.css` -- refine both light and dark palettes
- `src/components/TerritoryPlanner.tsx` -- add toggle button in header

## 3. Animations for Actions

Add satisfying micro-animations when things happen:

### Stage changes (inline edit or kanban drag):
- Brief green checkmark flash animation on the cell/card when stage is updated

### Adding a prospect:
- The dialog closes with a scale-out animation
- The new row in the table briefly highlights with a green pulse

### Deleting:
- Row fades out with a slide-left + fade animation before being removed
- Kanban card shrinks and fades

### Bulk actions:
- Bulk update shows a brief ripple/pulse across all affected rows

### Saving a view:
- The new view pill animates in with a bounce/scale effect

### Completing/clearing next step:
- Confetti-style checkmark animation (a brief CSS-only pulse)

### Implementation:
- Add new CSS keyframes in `index.css`: `@keyframes success-flash`, `@keyframes delete-slide`, `@keyframes bounce-in`
- Use React state to temporarily apply animation classes, then remove them after the animation completes
- Add a small `useAnimation` pattern: set a `animatingId` state, apply class, clear after 600ms

## 4. Emojis Throughout

Sprinkle emojis contextually across the app:

### Stat pills:
- "Total" -> "Total" (no emoji needed), "50+ Locs" -> "📍 50+ Locs", "100+ Locs" -> "📍 100+", "500+ Locs" -> "🏢 500+", "Hot" -> "🔥 Hot", "Warm" -> "☀️ Warm", "Prospects" -> "🎯 Prospects", "Churned" -> "💀 Churned"

### Pipeline stages:
- "Not Started" -> "⬜ Not Started", "Researching" -> "🔍 Researching", "Contacted" -> "📧 Contacted", "Meeting Set" -> "📅 Meeting Set", "Proposal Sent" -> "📄 Proposal Sent", "Negotiating" -> "🤝 Negotiating", "Closed Won" -> "🏆 Closed Won", "Closed Lost" -> "❌ Closed Lost", "On Hold" -> "⏸️ On Hold"

### Status badges:
- "Prospect" -> "🎯 Prospect", "Churned" -> "💀 Churned"

### Tier badges:
- "Tier 1" -> "⭐ Tier 1", "Tier 2" -> "🥈 Tier 2", "Tier 3" -> "🥉 Tier 3"

### Priority:
- "Hot" -> "🔥 Hot", "Warm" -> "☀️ Warm", "Cold" -> "🧊 Cold"

### Action items section headers:
- "Top Scored -- Never Contacted" -> "⚡ Top Scored -- Never Contacted"
- "Stale Accounts" -> "🕸️ Stale Accounts (30+ days)"
- "Action Items" -> "🎯 Action Items"

### Score labels:
- Add emoji to score label (Excellent -> "🚀 Excellent", etc.)

### Empty states:
- "No prospects match" -> "🔍 No prospects match your filters"
- "All contacted" -> "🎉 All prospects contacted!"

## 5. Fun Toast Bars with Emojis

Replace all `toast.success("...")` calls with emoji-enhanced, more descriptive toasts:

### Examples:
- Add prospect: `toast.success("🎉 Added to your territory!", { description: `"${name}" is ready to go` })`
- Delete prospect: `toast("🗑️ Prospect removed", { description: `"${name}" has been deleted` })`
- Bulk delete: `toast("🗑️ Cleaned up!", { description: `${count} prospects removed` })`
- Stage update: `toast.success("🚀 Stage updated!", { description: `Moved to "${stage}"` })`
- CSV export: `toast.success("📊 CSV downloaded!", { description: "Your data is ready" })`
- View saved: `toast.success("💾 View saved!", { description: `"${name}" is ready to use` })`
- Logo uploaded: `toast.success("🖼️ Logo updated!")`
- Logo removed: `toast("🖼️ Logo removed")`
- Contact added: `toast.success("👤 Contact added!")`
- Contact removed: `toast("👤 Contact removed")`
- Interaction logged: `toast.success("📝 Activity logged!")`
- Note added: `toast.success("📌 Note saved!")`
- Data reset: `toast("🔄 Data reset to defaults")`
- Inline edit: `toast.success("✅ Updated!")`
- Kanban drag: `toast.success("🎯 Moved!", { description: `Now in "${stage}"` })`
- Bulk tier update: `toast.success("🏷️ Tier updated!", { description: `${count} prospects tagged` })`
- Next step cleared: `toast("✅ Next step completed!")`

## Files to Modify

1. **`index.html`** -- Remove hardcoded `class="dark"`, let next-themes manage
2. **`src/index.css`** -- Refined dark palette, improved light palette, new animation keyframes (success-flash, delete-slide, bounce-in)
3. **`src/App.tsx`** -- Wrap with ThemeProvider from next-themes
4. **`src/components/TerritoryPlanner.tsx`** -- Major changes:
   - Add theme toggle in header
   - Replace `navigate()` with slide-over sheet
   - Add ProspectSheet component with all detail fields
   - Add emojis to stat pills, pipeline labels, badges
   - Enhance all toast calls with emojis + descriptions
   - Add animation states for CRUD operations
5. **`src/pages/ProspectPage.tsx`** -- Add emojis to badges/labels, enhance toast calls
6. **`src/pages/InsightsPage.tsx`** -- Add emojis to section headers, enhance stat cards
