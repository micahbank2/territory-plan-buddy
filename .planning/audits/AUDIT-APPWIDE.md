# Territory Plan Buddy — App-Wide Interface Quality Audit

**Date:** 2026-04-24
**Scope:** All pages except Phase 04 (ContactPickerDialog, PendingOutreachDialog, bulk Mark Contacted), all feature components, TerritoryPlanner shell, ProspectSheet primary surface.
**Excluded:** `src/components/ui/**` (shadcn library), security/data-integrity concerns (see `.planning/codebase/CONCERNS.md`).

---

## Executive Summary

**Total score: 10/16** — The app is a well-composed, visually cohesive productivity tool with strong theming discipline (clean `--variable` token system, full dark-mode parity in CSS, no hex leakage in `src/index.css` except a single mask stub). Performance is respectable given 300+ prospects: the main list is paginated at `PAGE_SIZE = 25`, and the filter pipeline is memoized. Theming scores well; the core app shell is dark-mode-clean and leans on semantic tokens. The two real weaknesses are **accessibility** (icon-only buttons with no `aria-label`, form inputs with placeholders instead of labels, sortable table headers with no `aria-sort`, 10 `onClick`-on-`<td>` handlers with no keyboard equivalent) and **responsive design** (ProspectSheet — the primary per-prospect surface — renders inside a fixed `max-w-4xl` `DialogContent` rather than the Sheet/Drawer pair the CLAUDE.md documents, so on a phone it opens as a cramped centered modal). Neither risk is user-blocking today given the single-user profile, but both will bite the moment the product is shown to another AE or demoed on an iPhone.

**Scores:**
| Dimension | Score |
|---|---|
| Accessibility | 2/4 |
| Performance | 3/4 |
| Theming | 3/4 |
| Responsive | 2/4 |
| **Total** | **10/16** |

---

## 1. Accessibility — 2/4

Keyboard/mouse parity is broken in several interactive regions, and screen reader support is thin. The shadcn primitives give you free focus traps on dialogs, but everything built on raw `div`/`span`/`td` bypasses that safety net.

### Top findings

1. **CRITICAL — Form inputs use placeholders as labels (`src/pages/AuthPage.tsx:~90-110`).** The email/password inputs in `<form onSubmit={handleSubmit}>` use `placeholder="Email"` / `placeholder="Password"` with no associated `<Label htmlFor>` or `aria-label`. Screen readers announce the field as "Email edit blank" only until the user types; password managers may fail to detect the form. Fix: add `<Label htmlFor="email">` and `id="email"`/`id="password"` on the Inputs, or at minimum `aria-label`.

2. **HIGH — Sortable table headers have no `aria-sort` (`src/components/TerritoryPlanner.tsx:1795-1810`).** The `<th onClick={() => doSort(k)}>` cells use `cursor-pointer` and a visual `<SortIcon />` but nothing announces the sort state. Also: `<th>` with only `onClick` is not reachable by keyboard. Fix: render a nested `<button>` inside each header with `aria-sort={ asc ? "ascending" : desc ? "descending" : "none" }`, and move the click handler there.

3. **HIGH — 10 `<td onClick>` handlers with no keyboard equivalent (`src/components/TerritoryPlanner.tsx:1820, 1823, 1875, 1876, 1901, 1922, 1925, 1949`).** Clicking a row opens the ProspectSheet, but Tab/Enter skips the row entirely. Keyboard users cannot open a prospect at all from the table. Fix: wrap each row's content in a single keyboard-focusable anchor/button (or give the `<tr>` `role="button" tabIndex={0} onKeyDown={...}`), and stop putting `onClick` on `<td>` children.

4. **HIGH — Icon-only buttons across the app have no `aria-label`.** Counter-examples: logo upload button (`TerritoryPlanner.tsx:286, 310`), close/X buttons (`AccountCombobox.tsx:73`, `MultiSelect.tsx:92`, `ProspectSheet.tsx:723, 827, 970`, `TerritoryPlanner.tsx:256, 1559, 1586`, `SignalsSection.tsx:171, 262`). Only 9 `aria-label`s total across the non-`ui/` code. Several have `title=` which is a decent fallback for tooltips but not for screen readers. Fix: add `aria-label="Remove contact"` / `"Close filter"` / `"Upload logo"` consistently.

5. **MEDIUM — Inline-edit cells have no keyboard entry path (`src/components/TerritoryPlanner.tsx:1894, 1915, 1942`).** Industry is `onClick`, outreach and tier are `onDoubleClick`. No keyboard user can ever enter edit mode. The `<select>` that appears does have `autoFocus` and `onBlur` save, but there's also no Escape-to-cancel. Fix: after wrapping the row in a keyboard-focusable element, add `onKeyDown` handlers (Enter to start editing, Escape to cancel) and make the pencil hint a `<button>`.

6. **MEDIUM — `htmlFor` appears only 3 times total outside `ui/`.** Every custom dialog (Save View, Create Territory, AddProspectDialog, BulkEditDialog) relies on placeholders. This is a systemic issue, not a one-off.

7. **LOW — Dialog-as-modal on ProspectSheet has an aria issue.** `DialogContent` gives focus-trap and `role="dialog"`, but the content inside has no landmarks (`<header>`, `<main>`, sections with `aria-labelledby`) to let a screen reader skim the 1141-line surface.

**Wins:** shadcn primitives (`Dialog`, `Select`, `Checkbox`, `AlertDialog`) handle focus-trap/escape correctly. `title=` attributes on aging dots and pencil hints do at least supply tooltip text for mouse users. `<label>`/`<Label>` associations are correct inside `src/components/ui/**`.

---

## 2. Performance — 3/4

This is the strongest non-theming dimension. The prospect table is **paginated, not virtualized**, which is the right call for 300-row personal data — virtualization would be overkill. Derived data is memoized cleanly.

### Top findings

1. **LOW — `TerritoryPlanner.tsx:612` uses `useMemo` for a side effect.** `useMemo(() => setPage(1), [...filters])` — this is a `useEffect` in disguise and currently works by accident. Fix: change to `useEffect`. Cheap, but one re-render difference and cleaner semantics.

2. **LOW — Pipeline/Kanban view re-filters the full `filtered` array per stage (`TerritoryPlanner.tsx:1978`).** `filtered.filter((p) => p.outreach === stage)` runs inside a `.map` over stages — that's `O(stages * prospects)` each render. At ~5 stages × 300 prospects it's 1500 comparisons; noise, but trivially fixed with a single `useMemo` that buckets once.

3. **LOW — Home view slices ignore memo opportunities (`TerritoryPlanner.tsx:634, 643, 657, 674`).** Each `homeCards` chunk is already wrapped in one outer `useMemo`, so these are fine — flagging only because the overall pattern (`.slice(0, 5)` on `enriched` after sort) rebuilds on every `enriched` change. Acceptable.

4. **LOW — No `React.memo` or component memoization anywhere.** `TerritoryPlanner` is a 2369-line single component; sub-pieces like `LogoImg`, `Pagination`, `ScoreBadge` re-render on every parent state change. Not a correctness issue; a polish opportunity. If this ever grows beyond 300 rows, consider extracting `<ProspectRow>` as a memoized component keyed by `p.id` + `p.lastTouched`.

5. **MEDIUM — Bundle: no `React.lazy` / dynamic imports anywhere.** InsightsPage (recharts), EnrichmentQueue (925 lines), CSVUploadDialog (741 lines), AddProspectDialog (764 lines) all ship in the initial chunk. Lovable deploys are over the wire every push; `React.lazy` on the route components + dialogs would shave meaningful JS off first paint. `recharts` alone is ~200KB.

6. **LOW — Assets are fine.** `yext-logo-black.jpg` 220KB is the only concern — JPG logo could be a 4KB SVG. `yext-logo-white.jpg` at 44KB is also heavier than it needs to be. Fix: replace both with SVG from brand kit.

7. **Not an N+1.** `useProspects.loadData` (`src/hooks/useProspects.ts:80-83`) fans out 4 parallel `select` queries (contacts, interactions, notes, tasks) and joins client-side — this is the correct shape for the shared-territory model.

**Wins:** `useMemo` is used appropriately for `filtered`, `enriched`, `pipelineCounts`, `homeCards`, `stats`, `quotaSummary`, `maxLocs`, `comparisonProspects` — the heavy work is cached. Pagination at `PAGE_SIZE = 25` caps DOM nodes. No Supabase calls inside render paths.

---

## 3. Theming — 3/4

Dark mode is genuinely good. The token system in `src/index.css` is complete (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--destructive`, `--success`, `--warning`, etc.), both themes define every variable, and the `.aging-*` / `.glass-card` / `.glow-blue` custom classes all consume tokens via `hsl(var(--x))`. No hex leakage in `index.css` (one `#fff` on a `-webkit-mask` at line 136 is fine — masks ignore color).

### Top findings

1. **HIGH — Hardcoded Tailwind color palette in dialogs (17 in `CSVUploadDialog.tsx`, 11 in `OpportunitySheet.tsx`, 10 in `PasteImportDialog.tsx` and `OpportunitiesPage.tsx`, 9 in `ProspectSheet.tsx`, 8 in `TerritoryPlanner.tsx`).** Patterns like `text-amber-600`, `text-emerald-700`, `bg-blue-100 dark:bg-blue-900`, `bg-gray-100 dark:bg-gray-800`. These bypass the semantic token system. `bg-emerald-100 dark:bg-emerald-900` is fine visually because both branches are declared, but it hardcodes the brand accent. Fix: swap `text-emerald-*` → `text-success`, `text-amber-*` → `text-warning`, `text-red-*` → `text-destructive`, `text-blue-*` → `text-primary`. The tokens already exist; they're just not being used.

2. **HIGH — Inline-styled HTML in `ProspectSheet.tsx:407-413` for the export document.** Hex literals `#1a1a1a`, `#2563eb`, `#111`, `#666`, `#e5e7eb`, `#999` in a template string built for a downloadable HTML artifact. This is acceptable for export-only output (will never see dark mode), but worth a comment saying so; otherwise a future editor will "fix" it.

3. **MEDIUM — Google logo SVG in `AuthPage.tsx:86-89` uses hardcoded brand hex (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`).** This is correct — Google's brand guidelines mandate these specific hexes. No action; flagging only so a future pass doesn't "tokenize" them.

4. **LOW — `bg-muted text-muted-foreground` combinations have marginal contrast** (`SignalsSection.tsx:41, 245, 248`, `ProspectSheet.tsx:80, 525, 721, 900, 944`). Light-mode `--muted-foreground: 220 10% 50%` on `--muted: 220 14% 96%` gives ~4.5:1 — borderline AA for normal text and sub-AA for the 10px labels used in SignalsSection. Fix: either bump `--muted-foreground` or only use that combo for 14px+ text.

5. **LOW — Chart styling in `src/components/ui/chart.tsx:48`** uses hardcoded recharts classes referencing `#ccc` and `#fff`. This is recharts's own selector pattern to override library defaults, not a theming error.

**Wins:** Custom CSS is impeccably tokenized — every `hsl(var(--token))`, every `.aging-green { background-color: hsl(var(--success)); }`. Both light and dark define the full palette. No `rgb()` or `rgba()` leakage in the Tailwind layer. `glass-card`, `glow-blue`, `yext-grid-bg` all reference `--primary`.

---

## 4. Responsive Design — 2/4

The tool is desktop-first by the README's own description, but the responsive story is uneven. Breakpoint usage is lopsided (102 `sm:`, 44 `md:`, 17 `lg:`, 0 `xl:`), and the primary per-prospect surface doesn't adapt.

### Top findings

1. **CRITICAL — ProspectSheet renders inside `Dialog` with `max-w-4xl max-h-[90vh]` on every viewport (`src/components/ProspectSheet.tsx: return block`).** CLAUDE.md claims "Sheet on desktop, Drawer on mobile" — that is not what the code does. On an iPhone, a 1141-line prospect surface opens as a centered modal with forced 90vh cap, leaving a stripe of page behind it and no swipe-to-close. `OpportunitySheet.tsx:450-452` does the right thing (`isMobile ? Drawer : ...`). Fix: port the `useIsMobile()` + `Drawer direction="right"` pattern from OpportunitySheet into ProspectSheet.

2. **HIGH — InsightsPage KPI row is not responsive (`src/pages/InsightsPage.tsx:204`).** `grid grid-cols-4 gap-4` — on a 375px iPhone, four cards cram into ~90px each and labels/numbers overflow. Fix: `grid-cols-2 md:grid-cols-4`. The same file does it correctly on line 261 (`grid-cols-2 md:grid-cols-4`), so this is an inconsistency bug.

3. **MEDIUM — TerritoryPlanner filter bar on mobile (`src/components/TerritoryPlanner.tsx:1615`).** `isMobile ? (filtersOpen ? "grid grid-cols-2 gap-3" : "hidden") : "flex"` — the fallback when `filtersOpen` is false hides all filters. A new mobile user has no visual cue that filters exist until they spot the toggle button. Acceptable as a deliberate choice; worth a "Filters (3 active)" counter on the toggle.

4. **MEDIUM — Pipeline/Kanban view has no mobile breakpoint (`TerritoryPlanner.tsx:~1975-2016`).** Full-width stage columns side-by-side; unusable below ~1024px. Fix: stack vertically on `md:` or hide the view on mobile.

5. **MEDIUM — Touch targets < 44px in the inline-edit pattern.** The pencil hint, score pills (`text-[10px] px-1.5 py-0.5`), and pagination buttons (`p-1.5`) are all < 32px tall. Apple HIG and WCAG 2.5.5 want 44px. Fix: increase `p-1.5` → `p-2.5` on pagination chevrons at minimum.

6. **LOW — AuthPage is centered and fine.** LandingPage and ShareJoinPage are simple enough to reflow cleanly.

**Wins:** `OpportunitySheet` correctly switches to a right-edge Drawer on mobile and is the reference pattern the rest of the app should copy. Header bars use `sm:px-8 py-5` consistently. Table → card view switch exists in TerritoryPlanner (line 1752, `isMobile ? (...) : (...desktop table)`) — that's the right architectural call even though the prospect panel itself doesn't follow through.

---

## Prioritized fix list (top 10)

| # | Severity | Dimension | File:line | Fix |
|---|----------|-----------|-----------|-----|
| 1 | CRITICAL | Responsive | `ProspectSheet.tsx` (final return) | Port `useIsMobile()` + `Drawer direction="right"` pattern from `OpportunitySheet.tsx:450-452`. ProspectSheet is the primary per-prospect surface — must be usable on a phone. |
| 2 | CRITICAL | A11y | `AuthPage.tsx:~90-110` | Add `<Label htmlFor="email">` + `id` on email/password Inputs. Forms without labels fail password managers and screen readers. |
| 3 | HIGH | A11y | `TerritoryPlanner.tsx:1795-1810` | Make sortable `<th>` cells use nested `<button aria-sort={...}>` for keyboard access and SR state. |
| 4 | HIGH | A11y | `TerritoryPlanner.tsx` table rows (1820-1949) | Replace 10 `<td onClick>` with a single row-level keyboard-focusable element. Add `onKeyDown` (Enter opens sheet, Escape closes). |
| 5 | HIGH | A11y | ~15 icon buttons across `TerritoryPlanner`, `ProspectSheet`, `SignalsSection`, `MultiSelect`, `AccountCombobox` | Add `aria-label` to every icon-only `<button>`. `title` is not a screen-reader substitute. |
| 6 | HIGH | Theming | `CSVUploadDialog.tsx`, `OpportunitySheet.tsx`, `PasteImportDialog.tsx`, `OpportunitiesPage.tsx`, `ProspectSheet.tsx`, `TerritoryPlanner.tsx` | Replace hardcoded Tailwind palette (`text-emerald-*`, `text-amber-*`, `text-blue-*`, `text-red-*`) with semantic tokens (`text-success`, `text-warning`, `text-primary`, `text-destructive`). |
| 7 | HIGH | Responsive | `InsightsPage.tsx:204` | Change `grid grid-cols-4` → `grid grid-cols-2 md:grid-cols-4`. Matches the pattern used on line 261 of the same file. |
| 8 | MEDIUM | Performance | Route-level (`App.tsx`) and heavy dialogs | Wrap `InsightsPage`, `MyNumbersPage`, `OpportunitiesPage`, `EnrichmentQueue`, `CSVUploadDialog`, `AddProspectDialog` in `React.lazy`. Ship less JS on first paint. |
| 9 | MEDIUM | A11y | `TerritoryPlanner.tsx` inline-edit cells (1894, 1915, 1942) | Add `onKeyDown` Enter-to-edit / Escape-to-cancel; expose the pencil hint as a focusable `<button>`. |
| 10 | MEDIUM | Responsive | `TerritoryPlanner.tsx` pipeline/kanban view (~1975-2016) | Stack kanban columns vertically below `md:` or hide the view on mobile with a "Not available on small screens" message. |

---

## What's strong

- **Theming discipline.** `src/index.css` is a textbook example of a tokenized design system — both themes complete, every custom class (aging dots, glass cards, glow, yext-grid-bg) uses `hsl(var(--x))`. Only one hex literal in the whole file and it's a mask stub.
- **Memoization where it counts.** `filtered`, `enriched`, `pipelineCounts`, `homeCards`, `stats`, `quotaSummary`, `maxLocs`, `comparisonProspects` are all memoized. The filter pipeline doesn't re-compute on every render.
- **Pagination over virtualization.** Correct pragmatic call — 25 rows per page caps DOM cost without pulling in react-window for a personal tool.
- **No N+1 on load.** `useProspects.loadData` fans out 4 parallel `.in("prospect_id", ids)` queries and joins client-side. Clean.
- **OpportunitySheet is the responsive reference.** It correctly renders a mobile Drawer via `useIsMobile()`. Copy that pattern everywhere.
- **Tokens include `--success` and `--warning`**, which many shadcn themes skip. Aging dots consume them directly — that's the right move.
- **shadcn coverage is broad.** `Dialog`, `AlertDialog`, `Select`, `Checkbox`, `Drawer`, `Sheet`, `Tabs`, `Tooltip` are all imported from `ui/` — free focus traps, ARIA roles, and keyboard handling wherever they're actually used.
