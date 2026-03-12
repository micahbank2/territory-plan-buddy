
Plan to fix this (and why it still looks bad)

1) Root-cause fixes first
- The panel width change was applied in shared UI, but this specific prospect slide-over sets its own size in `ProspectSheet`, so it can still appear unchanged.
- The hardest-to-read content is still coming from compact-mode components (`SignalsSection` + compact `AIReadinessCard`) that still use a lot of `text-xs`, `text-[9px]`, `text-[10px]`, and muted contrast.

2) Implementation plan
- Make the prospect slide-over noticeably larger on desktop:
  - Update `src/components/ProspectSheet.tsx` (`<SheetContent ...>`) to a guaranteed wider size (not token-limited), e.g. near full desktop side panel width with `max-w-none` + explicit width cap.
  - Keep mobile drawer behavior unchanged.
- Do a focused “make it pop” readability pass in the slide-over:
  - `src/components/SignalsSection.tsx` (compact view): larger heading/body text, stronger contrast, better spacing, less washed-out muted styles for critical copy.
  - `src/components/AIReadinessCard.tsx` (compact view): bump title/body/talking-point text sizes and increase contrast.
  - `src/components/ProspectSheet.tsx`: remove remaining tiny text hotspots in section labels/meta rows where readability is currently weak.
- Improve hierarchy (not just size):
  - Stronger section headers, clearer label/value contrast, slightly roomier line-height and spacing so blocks are scannable.

3) Technical details (exact targets)
- `src/components/ProspectSheet.tsx`
  - Desktop sheet size class on `SheetContent` (current: `sm:max-w-2xl`) -> explicit wider width strategy so it is visibly larger at your current viewport.
  - Replace tiny typography classes in sheet content where still present (`text-[10px]`, very small metadata labels) with readable equivalents.
- `src/components/SignalsSection.tsx`
  - Compact title `Signals` from tiny muted label style -> stronger `text-sm`/`font-bold`/foreground.
  - Empty-state paragraph from `text-xs text-muted-foreground` -> larger and higher-contrast body text.
  - Signal row title/description/meta sizing and contrast adjusted upward.
- `src/components/AIReadinessCard.tsx`
  - Compact header/body/talking-point labels and timestamps moved up from tiny muted text to readable sizes/contrast.

4) Validation checklist after changes
- Open a prospect from `/` and confirm the right panel is clearly wider than before on desktop.
- Go to the Signals block (empty + with items) and verify text is readable without squinting.
- Expand AI Readiness in the same panel and verify talking point/summary/meta copy is easy to read and copy.
- Quick mobile sanity check to ensure larger typography doesn’t break layout.
