---
phase: 05-log-next-step-widget
plan: 01
subsystem: ProspectSheet / Activity tab
tags: [ux, hardening, forms, tdd, partial-failure, date-handling]
dependency_graph:
  requires:
    - 03-component-decomposition-ux-polish  # ProspectSheet responsive wrapper, tab IA
    - 01-data-integrity-security           # direct-CRUD addInteraction + addTask hooks
  provides:
    - LogActivityWidget  # reusable single-submit interaction logger
    - Promise<boolean>   # hook contract signalling success/failure for partial-commit callers
  affects:
    - src/components/ProspectSheet.tsx
    - src/hooks/useProspects.ts
tech_stack:
  added: []   # no new deps
  patterns:
    - partial-commit-retention     # keep form state on second-leg failure
    - local-date-parsing           # parseLocalDate avoids UTC-midnight TZ drift
    - boolean-return-contract      # hook callers detect failure without catching rejected promises
key_files:
  created:
    - src/components/LogActivityWidget.tsx
    - src/test/LogActivityWidget.test.tsx
    - .planning/phases/05-log-next-step-widget/05-01-SUMMARY.md
  modified:
    - src/hooks/useProspects.ts        # addInteraction + addTask now return Promise<boolean>
    - src/components/ProspectSheet.tsx # widget mount + dead code removal (−94 lines)
decisions:
  - "addInteraction + addTask return Promise<boolean> instead of void — lets callers distinguish success from hook-toasted failure without a rejected-promise catch (non-breaking; existing void-returning callers ignore the boolean)"
  - "Default follow-up due date recomputes on every toggle-on rather than memo-once so widgets opened before midnight and submitted after midnight don't use stale dates"
  - "Local-date parsing helper (parseLocalDate) added — new Date('yyyy-MM-dd') silently parses as UTC, shifting one day west in every non-UTC zone; format(new Date('2026-04-27'),'PPP') returned 'April 26th, 2026' in EDT before the fix"
  - "Disabled submit button while submitting prevents double-clicks from inserting two interactions + two tasks — was a real bug on the old inline widget"
metrics:
  duration: "~5 min agent execution"
  completed_date: 2026-04-24
requirements:
  - LOG-01
  - LOG-02
  - LOG-03
  - LOG-04
  - LOG-05
  - LOG-06
---

# Phase 05 Plan 01: Log Activity Widget Summary

Extracted the Log Activity widget from ProspectSheet.tsx into its own component, added the +3-business-day default due date, implemented partial-failure retention so typed data never silently vanishes, and locked behavior down with 6 vitest assertions covering LOG-01/02/03.

## One-liner

Single-submit Log Activity widget with +3-business-day default, partial-failure-tolerant form retention, and boolean-returning hook contract so callers can detect which half of a two-row commit landed.

## What Was Built

### New component: `src/components/LogActivityWidget.tsx` (212 lines)

Props contract:
```ts
interface LogActivityWidgetProps {
  prospectId: string;
  addInteraction: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<boolean>;
  addTask: (prospectId: string, t: Omit<Task, "id">) => Promise<boolean>;
  triggerLastTouchedBump?: () => Promise<void> | void;
}
```

Behavior:
- Interaction-type select (filters out "Task Completed"), notes input, optional follow-up task sub-form, single submit button.
- Default follow-up due date = `format(addBusinessDays(new Date(), 3), "yyyy-MM-dd")`, recomputed every time the toggle flips on.
- Submit runs the interaction insert first; if that returns `false`, the form state is preserved entirely (no task attempted, no inputs cleared).
- Interaction success clears `notes` + `type`; then, if the follow-up sub-form is active with task text, the task insert runs. On task failure, the follow-up section stays mounted with the user's typed task text and due date intact and a contextual error toast fires.
- `Button disabled={submitting}` prevents double-submit double-inserts.
- After a successful interaction, `triggerLastTouchedBump()` is called (wired in ProspectSheet to `update(prospect.id, {})`) so `prospects.last_touched` refreshes and the aging dot greens (LOG-04).

### Hook change: `src/hooks/useProspects.ts`

`addInteraction` and `addTask` now return `Promise<boolean>` instead of `Promise<void>`. Error paths return `false` after toasting; success paths return `true`. All existing callers ignore the return value and compile unchanged.

### ProspectSheet integration: `src/components/ProspectSheet.tsx`

- Imported `LogActivityWidget` and mounted it inside `<TabsContent value="activity">` in place of the old inline JSX block.
- Deleted state: `interactionType`, `interactionNotes`, `newTaskText`, `newTaskDate`, `showFollowUp`.
- Deleted helpers: `logActivity`, `logInteraction`, the inline `addTask` wrapper (Tasks tab's `completeTask` + `removeTask` helpers retained).
- Deleted now-unused imports: `format` (date-fns), `INTERACTION_TYPES`, `CalendarIcon`, `Popover`/`PopoverContent`/`PopoverTrigger`, `Calendar`.
- Updated prop-type signatures for `addInteraction` and `addTaskDirect` to `Promise<boolean>` to match the new hook contract.
- Net delta: −94 lines.

### Tests: `src/test/LogActivityWidget.test.tsx` (177 lines)

Six live assertions, all passing:

| # | Requirement | What it verifies |
|---|-------------|------------------|
| 1 | LOG-01 | Renders type select, notes input, follow-up toggle, submit button |
| 2 | LOG-01 | Notes-only submit calls `addInteraction` once with today's date, does NOT call `addTask`, clears the notes input |
| 3 | LOG-01 | Follow-up ON + task text + submit calls both hooks once, clears inputs, collapses the follow-up section |
| 4 | LOG-02 | With fake system time pinned to Wed 2026-04-22, toggling follow-up on shows "April 27th, 2026" on the date-picker button (+3 business days, skips Sat+Sun) |
| 5 | LOG-03 | `addInteraction.mockResolvedValue(false)` — `addTask` not called, notes input retains typed text, submit button re-enables |
| 6 | LOG-03 | `addInteraction` returns true + `addTask` returns false — follow-up sub-form stays mounted with typed task text preserved for retry |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Timezone drift in date display**

- **Found during:** Task 2 test verification (Test 4 initially failed — expected "April 27th, 2026" but button showed "April 26th, 2026")
- **Root cause:** `new Date("2026-04-27")` parses `yyyy-MM-dd` strings as UTC midnight. In any timezone east of UTC (including EDT where this was tested) that clock goes backwards to the previous day, so `format(new Date(taskDue), "PPP")` rendered one day earlier than the user picked. This was a pre-existing bug in the old inline widget — the tests caught it because Test 4 is the first thing that ever pinned system time while asserting the formatted display.
- **Fix:** Added `parseLocalDate(yyyyMmDd)` helper that splits the string and passes Y/M/D to `new Date(y, m-1, d)` — which always produces local midnight. Routed both the display `format()` and the Calendar `selected` prop through it.
- **Files modified:** `src/components/LogActivityWidget.tsx`
- **Commit:** `57e145e`

### Rule-free changes (plan-sanctioned hardening)

- **Widened follow-up toggle hit area** (`py-1.5 px-2 -mx-2`) — the plan specifically called this out as a UX-V2-02 quick fix since we were touching the line anyway. Touch target now clears the 44px minimum.
- **Added `disabled={submitting}`** on the submit button — plan-sanctioned Pitfall-3 guard.

## Verification Results

```
bunx vitest run src/test/LogActivityWidget.test.tsx   → 6/6 pass
bunx vitest run                                         → 49 pass | 1 todo (full suite green, no regressions)
bunx tsc --noEmit                                       → clean, zero errors
bunx vite build                                         → built in 3.23s, no errors
```

Grep checks (per plan verification):
```
rg -n "logActivity|setInteractionType|setInteractionNotes|logInteraction" src/components/ProspectSheet.tsx
# → 0 matches

rg -n "<LogActivityWidget" src/components/ProspectSheet.tsx
# → 1 match, inside <TabsContent value="activity">
```

## Requirements Satisfied

| Req | Coverage | How |
|-----|----------|-----|
| LOG-01 | ✅ Covered by Tests 1-3 | Single widget captures interaction + notes + optional follow-up task in one submit |
| LOG-02 | ✅ Covered by Test 4 | `addBusinessDays(today, 3)` default, re-computed on toggle-on, editable via Calendar popover |
| LOG-03 | ✅ Covered by Tests 5-6 | Interaction-first commit order + boolean return contract + form state retention on either-leg failure |
| LOG-04 | 🔶 Manual UAT | `triggerLastTouchedBump` prop wired in ProspectSheet to `update(prospect.id, {})` which bumps `last_touched` in the DB (line 143 of useProspects.ts). Not directly unit-tested because it requires Supabase; checked via code path review. |
| LOG-05 | 🔶 Manual UAT | Widget mounts inside `<TabsContent value="activity">`; the responsive Sheet↔Drawer wrapper already landed in Phase 03-01 and is upstream of this mount point. Verified by code reading, not runtime mobile render. |
| LOG-06 | ✅ Audited | The only logging UI inside `<TabsContent value="activity">` is now the `<LogActivityWidget />` mount. Notes and Activity Timeline remain (different concerns). |

## Manual UAT Checklist

These steps need a live logged-in session and are flagged for the phase UAT pass:

1. **LOG-04 — aging dot refreshes:**
   - [ ] Open a prospect whose aging dot is yellow or red (>7 days stale).
   - [ ] Activity tab → type any notes → click "Log Activity".
   - [ ] Expected: toast "Activity logged", interaction appears in timeline below, aging dot turns green immediately without page reload.

2. **LOG-04 — dual-submit bumps last_touched exactly once:**
   - [ ] Same session — toggle follow-up on, type a task text, click submit.
   - [ ] Expected: both interaction and task created; aging dot stays green (not a regression to gray).

3. **LOG-05 — mobile drawer render:**
   - [ ] Chrome DevTools → mobile emulation (<768px) → open prospect.
   - [ ] Expected: ProspectSheet renders as a right-edge vaul Drawer.
   - [ ] Activity tab → Log Activity widget visible, scrollable above keyboard, submit button reachable.

4. **LOG-03 — simulated partial failure (optional, requires Supabase offline):**
   - [ ] Disable network or temporarily break the `prospect_tasks` insert permission.
   - [ ] Toggle follow-up, type both notes and task, submit.
   - [ ] Expected: "Activity logged, but follow-up task failed" toast; notes input cleared but follow-up section still visible with task text intact; retry succeeds once network restored.

## Pitfall-4 Observation (duplicate toasts on partial failure)

When `addTask` returns `false`, the hook fires a `toast.error("Failed to add task")` internally, and the widget then fires `toast.error("Activity logged, but follow-up task failed — retry from the open form")`. That's two toasts. This was called out as acceptable in RESEARCH.md (Pitfall 4, option b — "duplicate toasts on error are noisy but not data-losing"). No follow-up quick task needed.

## Known Stubs

None. All state paths wired to live data. The `triggerLastTouchedBump` prop is optional but invoked by ProspectSheet; when omitted (e.g. from tests) the widget falls through cleanly.

## Self-Check: PASSED

- [x] `src/components/LogActivityWidget.tsx` exists (verified: 212 lines, > 120 min)
- [x] `src/test/LogActivityWidget.test.tsx` exists with 6 live assertions (verified: 177 lines, > 120 min)
- [x] `src/components/ProspectSheet.tsx` contains `<LogActivityWidget` mount, zero references to `logActivity|setInteractionType|setInteractionNotes|logInteraction`
- [x] Commit `6dd4abe` exists (Task 1 RED)
- [x] Commit `57e145e` exists (Task 2 GREEN)
- [x] `bunx vitest run` — 49 pass / 1 todo (unchanged baseline todo)
- [x] `bunx tsc --noEmit` — clean
- [x] `bunx vite build` — clean
