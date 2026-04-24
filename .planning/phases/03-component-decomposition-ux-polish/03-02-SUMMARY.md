---
phase: 03-component-decomposition-ux-polish
plan: 02
subsystem: ui
tags: [react, shadcn, tabs, controlled-state, vitest, ux-01, ux-02]

# Dependency graph
requires:
  - phase: 03-component-decomposition-ux-polish
    plan: 01
    provides: ProspectSheet wrapped in Drawer/Sheet + 4 it.todo tab tests scaffolds
provides:
  - ProspectSheet rendered as 4-tab IA (Overview / Activity / Contacts / Tasks)
  - sheetTab state lifted to TerritoryPlanner — controlled via activeTab + onTabChange props
  - handleSheetClose helper that resets sheetTab to "overview" on every close
  - Internal-state fallback in ProspectSheet for non-controlled usage (ProspectPage)
  - ProspectPage left column wrapped in matching Tabs structure (visual consistency)
  - 4 GREEN tab tests covering UX-01 (4 tabs render) + UX-02 (controlled prop, persistence, callback wiring)
affects: [03-03 (TerritoryPlanner decomposition), 04-* (AI feature mount points)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controlled-or-internal tab pattern: const tab = activeTab ?? internalTab; const setTab = onTabChange ?? setInternalTab — works for both TerritoryPlanner-controlled and ProspectPage-uncontrolled callers"
    - "Tab state ownership at coordinator (TerritoryPlanner) — switching sheetProspectId keeps sheetTab, closing the sheet resets it to 'overview'"
    - "Radix Tabs in tests: fireEvent.pointerDown + mouseDown + click trigger onValueChange (Roving Focus uses pointerdown to commit selection)"

key-files:
  created: []
  modified:
    - src/components/ProspectSheet.tsx
    - src/components/TerritoryPlanner.tsx
    - src/pages/ProspectPage.tsx
    - src/test/ProspectSheet.tab.test.tsx

key-decisions:
  - "Lift sheetTab to TerritoryPlanner (not ProspectSheet useState) — controlled-prop pattern is the only way to keep tab sticky across prospect switches AND reset on close per UX-02 SC-3"
  - "Optional activeTab/onTabChange props with internal useState fallback — keeps ProspectPage (uncontrolled) and TerritoryPlanner (controlled) on the same component without forking it"
  - "Removed per-section animate-fade-in-up stagger styles inside tabs; kept the class on each TabsContent root so each panel fades in on activation. Eliminates 'waterfall before interact' (per 03-RESEARCH.md recommendation)"
  - "ProspectPage gets a Tabs-wrapped left column rather than a full restructure — keeps the right sidebar (Contacts/StakeholderMap/Details) intact. Contacts tab on the page route shows a pointer to the sidebar instead of duplicating the full edit form. Plan explicitly authorized this minimal change"
  - "fireEvent.click alone doesn't satisfy Radix Tabs Roving Focus — pointerDown + mouseDown + click is the correct test pattern (documented in tech-stack patterns)"

patterns-established:
  - "Tabbed-sheet IA: header sticky outside Tabs, modal sub-Dialogs (Outreach Draft, Meeting Prep, ContactPickerDialog) outside Tabs so they overlay regardless of active tab"
  - "Controlled tab handoff: parent owns activeTab + onTabChange; child accepts both as optional with fallback — same pattern usable for any future cross-component state lift"

requirements-completed: [UX-01, UX-02]

# Metrics
duration: 6m 11s
completed: 2026-04-24
---

# Phase 03 Plan 02: ProspectSheet Tabbed IA Summary

**ProspectSheet now renders four tabs (Overview / Activity / Contacts / Tasks) with sticky tab state owned by TerritoryPlanner — switching prospects keeps the tab, closing the sheet resets to Overview.**

## Performance

- **Duration:** 6m 11s
- **Started:** 2026-04-24T21:33:21Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 4

## Accomplishments

- **UX-01 — 4 tabs shipped.** ProspectSheet wraps its content section in shadcn `<Tabs>` with `<TabsList grid grid-cols-4>` containing four `<TabsTrigger>` elements. The 11 ad-hoc sections of the old vertical scroll are now distributed across the four panels per the 03-RESEARCH.md section map (Overview = Account Details + Research + Signals + AI Readiness + Location Notes; Activity = Log Activity widget + Notes + Activity Timeline; Contacts = Contacts list/edit; Tasks = Open Tasks list extracted from under Log Activity).
- **UX-02 — tab persistence + reset.** `sheetTab` state lives in TerritoryPlanner, passed down as controlled `activeTab` + `onTabChange`. New `handleSheetClose` callback resets it to `"overview"` on close. Switching `sheetProspectId` while the sheet is open does not reset the active tab (Test F covers this).
- **4 GREEN tab tests.** All four `it.todo` placeholders from Plan 01 converted to runnable assertions:
  - Test D: 4 tab triggers render (Overview/Activity/Contacts/Tasks)
  - Test E: `activeTab="activity"` makes the Activity trigger `data-state="active"` and renders Activity content
  - Test F: rerendering with a different `prospectId` but same `activeTab` keeps the active tab; rerendering with `activeTab="overview"` (simulated close cycle) flips it back to Overview
  - Test G: `fireEvent.pointerDown + mouseDown + click` on the Tasks trigger calls `onTabChange("tasks")`
- **ProspectPage parity.** Full-page route gets the same four-tab structure on its left column (Account Details + Signals + AI Readiness in Overview; Notes + Activity Timeline in Activity; sidebar pointer in Contacts; Tasks form + open list in Tasks). Right sidebar (Contacts/StakeholderMap/Details) preserved as-is.
- **Type-clean + build-clean + full suite green** (`bunx tsc --noEmit`, `bunx vite build`, `bunx vitest run` → 32 passed, 1 todo, 0 failures).

## Task Commits

1. **Task 1 (RED): Convert it.todo to runnable failing tests** — `c2568d9` (test)
2. **Task 2 (GREEN): Wrap ProspectSheet in Tabs + lift sheetTab to TerritoryPlanner** — `df1646b` (feat)

## Files Modified

- `src/components/ProspectSheet.tsx` — added Tabs/TabsList/TabsTrigger/TabsContent imports; extended `ProspectSheetProps` with optional `activeTab` + `onTabChange`; introduced `internalTab` fallback state (`tab = activeTab ?? internalTab`); replaced the `<div className="px-6 py-5 space-y-5">` content wrapper with `<Tabs value={tab} onValueChange={setTab}>`; redistributed 11 sections across four `<TabsContent>` panels; stripped per-section `animate-fade-in-up` stagger delays (kept on TabsContent root for per-panel fade-in); kept sub-Dialogs (Outreach Draft, Meeting Prep, ContactPickerDialog) outside Tabs as modal overlays.
- `src/components/TerritoryPlanner.tsx` — added `const [sheetTab, setSheetTab] = useState<string>("overview")`; added `handleSheetClose` useCallback that resets both `sheetProspectId` and `sheetTab`; updated `<ProspectSheet />` render site to pass `activeTab={sheetTab} onTabChange={setSheetTab} onClose={handleSheetClose}`.
- `src/pages/ProspectPage.tsx` — added `Tabs` imports; introduced `activeTab` local useState (no persistence on full-page route per plan note); wrapped the left column in `<Tabs>` with the same four-tab structure; reorganized sections (Account Details + Signals + AI Readiness in Overview; Notes + Activity Timeline in Activity; sidebar pointer in Contacts; Tasks form + list in Tasks); right sidebar untouched.
- `src/test/ProspectSheet.tab.test.tsx` — replaced four `it.todo` blocks with full bodies; added `makeProspect()` factory, `renderSheet()` helper, MemoryRouter + TooltipProvider wrapping; mocked `useIsMobile` to return false (desktop Sheet branch is jsdom-friendly).

## Decisions Made

- **Lifted sheetTab to TerritoryPlanner, not ProspectSheet.** Controlled-prop pattern is the only correct way to satisfy UX-02 SC-3 ("opening a new prospect from the table does not reset the active tab"). Internal `useState` would reset whenever `prospectId` triggers re-mount.
- **Optional controlled props.** `activeTab` and `onTabChange` are optional. When both are absent, ProspectSheet falls back to its own internal `useState("overview")`. This lets ProspectPage reuse the component without forcing it to manage tab state externally.
- **ProspectPage minimal change.** The full-page route has a 2-column layout (left = details/timeline, right = contacts/stakeholder/details). Plan explicitly said "keep this change MINIMAL — if ProspectPage already has some differing layout, don't blow it up." Solution: wrapped the left column in Tabs with the same four labels, kept right sidebar intact, made the Contacts tab a pointer to the sidebar. IA consistency without restructure.
- **Stripped section staggers, kept panel fade-in.** Per 03-RESEARCH.md recommendation: removed the 30/50/100/150/170/180/200/250ms `animationDelay` styles inside tabs (eliminates "waterfall before interact"); kept `animate-fade-in-up` on the four `<TabsContent>` roots so each panel fades in on activation.
- **Radix Tabs test pattern.** `fireEvent.click` alone does not trigger `onValueChange` in Radix Tabs (Roving Focus listens for `pointerdown`). Test G uses `pointerDown + mouseDown + click` in sequence to fully simulate the user gesture in jsdom.
- **Sub-Dialogs stay outside Tabs.** Outreach Draft, Meeting Prep, and ContactPickerDialog render after the Tabs block (still inside `sheetContent`) so they overlay the entire sheet regardless of which tab is active. Moving them inside any TabsContent would unmount them on tab switch.

## Deviations from Plan

None — plan executed exactly as written. Two minor in-flight test adjustments (still inside Task 1 scope, no rule violations):

1. **Test E assertion sharpened**: original plan body would have hit "multiple elements with /log activity/i" because the string appears in both the section h3 AND the submit button. Changed to assert (a) Activity trigger has `data-state="active"`, (b) `getByRole("tabpanel")` exists, (c) `getAllByText(/log activity/i).length > 0`. Same intent, robust to multiple matches.
2. **Test G uses pointerDown + mouseDown + click chain** instead of just `fireEvent.click` — Radix Tabs' Roving Focus needs the pointerdown event to commit selection in jsdom. This is a Radix testing convention, not a deviation from plan intent.

## Issues Encountered

- **Radix Tabs + jsdom:** `fireEvent.click` does not fire `onValueChange` because Radix uses `pointerdown` for tab activation in roving-focus mode. Resolved with the pointerDown→mouseDown→click sequence (documented in tech-stack patterns for future reference).
- **DialogContent a11y warnings (pre-existing, out of scope):** Test runs print "DialogContent requires a DialogTitle" warnings from the nested Outreach Draft and Meeting Prep Dialogs. These exist on `main` already and are explicitly logged as deferred in 03-01-SUMMARY.md.

## Self-Check

Verified files exist:
- src/components/ProspectSheet.tsx — modified
- src/components/TerritoryPlanner.tsx — modified
- src/pages/ProspectPage.tsx — modified
- src/test/ProspectSheet.tab.test.tsx — modified
- .planning/phases/03-component-decomposition-ux-polish/03-02-SUMMARY.md — created

Verified commits exist:
- c2568d9 — test(03-02): convert tab placeholders to runnable failing tests
- df1646b — feat(03-02): wrap ProspectSheet in 4-tab IA + lift sheetTab to TerritoryPlanner

## Self-Check: PASSED

## Next Phase Readiness

- **Plan 03 (TerritoryPlanner decomposition)** is unblocked. The new `sheetTab` + `handleSheetClose` will move with the coordinator slice when TerritoryPlanner is broken into FilterBar / ProspectTable / BulkActions / TerritoryDialogGroup / TerritoryNavbar. Tab state stays at the coordinator.
- **Phase 3 Success Criteria 1 + 3** satisfied (Tests D and F pass).
- **Phase 4 AI features** now have clean per-tab mount points: research findings in Overview, Log Activity widget in Activity, etc. No more 1,141-line vertical scroll.
- **Future enhancement:** ProspectPage Contacts tab is currently a pointer to the sidebar — full parity (move sidebar contacts into the tab) is a follow-up if desired, but not required for IA consistency.

---
*Phase: 03-component-decomposition-ux-polish*
*Completed: 2026-04-24*
