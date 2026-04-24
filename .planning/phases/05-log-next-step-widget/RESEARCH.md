# Phase 05: Log + Next Step Widget — Research

**Researched:** 2026-04-24
**Domain:** React form composition, shadcn primitives, sub-collection mutations, two-row commit
**Confidence:** HIGH — all findings sourced from direct code inspection of the target files

---

<phase_requirements>
## Phase Requirements (Proposed — to be added to REQUIREMENTS.md by planner)

| ID | Description | Research Support |
|----|-------------|------------------|
| LOG-01 | A single Activity-tab widget captures interaction type + notes + optional follow-up task in one submit | Existing inline implementation at `src/components/ProspectSheet.tsx:805-856` is the extraction target |
| LOG-02 | Follow-up task default due date is +3 business days from today, editable via Calendar popover | `date-fns@3.6.0` exposes `addBusinessDays(date, n)`; Calendar primitive already used at line 845 |
| LOG-03 | Submit creates the interaction row first, then (if enabled) the follow-up task; partial failure surfaces a clear toast and does not silently lose data | `useProspects.addInteraction` and `addTask` toast on error but do not rollback (lines 512-530, 570-587 in `src/hooks/useProspects.ts`) — Phase 05 must add the partial-failure UX |
| LOG-04 | `last_touched` updates on submit | Auto-handled — `useProspects.update()` writes `last_touched = today` on every prospect mutation; addInteraction does NOT touch the prospects row, so the widget must call `update(prospect.id, {})` or rely on a small change |
| LOG-05 | Widget renders inside the Activity TabsContent on both desktop Sheet and mobile Drawer | Phase 03 wrapper at `src/components/ProspectSheet.tsx:92` already swaps via `useIsMobile()` |
| LOG-06 | Form, submit, follow-up toggle, and partial-failure path are covered by tests in `src/test/LogActivityWidget.test.tsx` | Phase 03 test file `src/test/ProspectSheet.tab.test.tsx` is the proven pattern reference |
</phase_requirements>

---

## Summary

The "Log + Next Step" widget is **already partially implemented** as an inline JSX block inside ProspectSheet (`src/components/ProspectSheet.tsx:805-856`), built during Phase 03's tab restructure. It currently combines the interaction logger and the follow-up task entry, gated by a `showFollowUp` toggle, sharing one submit button (`logActivity()` at lines 298-318).

Three gaps remain that justify Phase 05 as a hardening pass rather than a greenfield build:

1. **Default due date is empty** — the spec says +3 business days, the current code defaults `newTaskDate` to `""` (line 143), forcing the user to open the calendar every time.
2. **No partial-failure handling** — `logActivity()` calls `addInteractionDirect` then `addTaskDirect` sequentially with no error tracking. If addInteraction succeeds but addTask fails, the user sees the success toast (line 317) followed by a separate error toast from inside `addTask` (line 578), and the widget state is cleared (lines 313-316). The interaction is on disk, the task isn't, and the form has lost the user's typed task text.
3. **No test coverage** — `src/test/ProspectSheet.tab.test.tsx` only verifies the four tabs render; the widget itself has no behavior tests.

The widget also lives inline as ~50 lines of JSX inside a 1,200-line component file. CLAUDE.md guidance ("Extract to sub-components when adding new features, don't make it bigger" — known-pattern #5) and Phase 03's stated decomposition philosophy both argue for extracting the widget to its own component as part of the hardening.

**Primary recommendation:** Single plan. Extract the existing inline JSX into `src/components/LogActivityWidget.tsx`, add the +3-business-day default, replace the sequential awaits with a partial-failure-aware submit, and add `src/test/LogActivityWidget.test.tsx` covering the four contract points (renders, single submit creates both rows, follow-up is optional, partial failure surfaces error). No new dependencies; no hook surface changes.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| `date-fns` | ^3.6.0 | `addBusinessDays(today, 3)` for default due date | Already imported in ProspectSheet (`format` at line 3); standard date utility | `package.json` |
| shadcn `Button` | local | Submit | Already used in widget at line 852 | `src/components/ui/button.tsx` |
| shadcn `Popover` + `Calendar` | local | Date picker | Already used in widget at lines 837-848 | `src/components/ui/popover.tsx`, `src/components/ui/calendar.tsx` |
| `useProspects.addInteraction` | local | Insert one interaction row | Direct CRUD (Phase 01 DATA-02) | `src/hooks/useProspects.ts:512-530` |
| `useProspects.addTask` | local | Insert one task row | Direct CRUD (Phase 01 DATA-04) | `src/hooks/useProspects.ts:570-587` |
| `sonner` `toast` | ^1.7.4 | Success/error feedback | Already used everywhere | `src/components/ProspectSheet.tsx:24` |

### Form composition — recommended primitives

The current widget uses raw `<select>` and `<input>` elements (lines 813-816, 833) styled with `selectClass` and `inputClass` (defined in TerritoryPlanner.tsx, threaded through somehow — actually they appear inline in ProspectSheet via `cn()` calls). For LOG-01 the recommended primitives are:

| Need | Primitive | Why |
|------|-----------|-----|
| Interaction type chooser | Keep raw `<select>` (current pattern) OR use shadcn `<Select>` | Current pattern works; shadcn Select adds visual polish but more JSX. **Keep raw `<select>`** to match existing widget styling — see line 813. |
| Notes single-line | Replace `<input>` with shadcn `<Textarea>` (`@/components/ui/textarea`) | Notes can run long ("Discussed Q3 ROI numbers, agreed to send proposal Wed"). Single-line input truncates poorly and does not visually invite detail. **Recommend Textarea, 2 rows default, expandable.** |
| Follow-up toggle | Keep current `<button>` micro-toggle (line 819-828) | The Plus → Check icon transition is good UX. shadcn `<Checkbox>` is heavier and breaks the inline feel. |
| Follow-up task text | Match interaction notes input — use `<Textarea>` 1 row OR keep `<input>` | Tasks are typically short ("Send proposal", "Schedule demo"). **Keep `<input>`** at line 833. |
| Due date | Keep `<Popover>` + `<Calendar mode="single">` | Already correct (lines 837-848). |
| Submit | shadcn `<Button size="sm">` | Already correct (line 852). |

No new primitives need installation.

### `date-fns` `addBusinessDays`

```typescript
import { addBusinessDays, format } from "date-fns";

// At form-mount (or when showFollowUp flips true):
const defaultDue = format(addBusinessDays(new Date(), 3), "yyyy-MM-dd");
setNewTaskDate(defaultDue);
```

`addBusinessDays(date, amount)` skips Saturdays and Sundays. It does NOT skip US federal holidays — that level of holiday-awareness would require `@date-fns/utc` or a calendar library and is out of scope for a productivity tool with one user. (HIGH confidence on signature; date-fns API is stable since v2 and unchanged in v3.6.0.)

---

## Architecture Patterns

### Where the widget mounts

`src/components/ProspectSheet.tsx:803-856` is the existing inline implementation, inside the Activity TabsContent block (`<TabsContent value="activity" ...>`).

```
Activity tab structure (current — `src/components/ProspectSheet.tsx`):
  803  <TabsContent value="activity" ...>
  805    Log Activity widget          <-- EXTRACT THIS
  857    Notes (Add Note + log)
  889    Activity Timeline (interactions list)
  1050  </TabsContent>
```

After extraction the structure stays the same, just with `<LogActivityWidget {...props} />` replacing lines 805-856:

```
  803  <TabsContent value="activity" ...>
  805    <LogActivityWidget
            prospectId={prospect.id}
            addInteraction={addInteractionDirect}
            addTask={addTaskDirect}
            triggerLastTouchedBump={() => update(prospect.id, {})}
          />
  806    Notes (unchanged)
  807    Activity Timeline (unchanged)
       </TabsContent>
```

### Component shape

```typescript
// src/components/LogActivityWidget.tsx (NEW)
import { useState, useMemo } from "react";
import { addBusinessDays, format } from "date-fns";
import { Target, CalendarIcon, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { INTERACTION_TYPES, type InteractionLog, type Task } from "@/data/prospects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LogActivityWidgetProps {
  prospectId: string;
  addInteraction: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<void>;
  addTask: (prospectId: string, t: Omit<Task, "id">) => Promise<void>;
  triggerLastTouchedBump?: () => Promise<void>; // calls update(id, {}) to refresh last_touched
}

export function LogActivityWidget({ prospectId, addInteraction, addTask, triggerLastTouchedBump }: LogActivityWidgetProps) {
  const [type, setType] = useState(INTERACTION_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [taskText, setTaskText] = useState("");
  const defaultDue = useMemo(
    () => format(addBusinessDays(new Date(), 3), "yyyy-MM-dd"),
    []
  );
  const [taskDue, setTaskDue] = useState(defaultDue);
  const [submitting, setSubmitting] = useState(false);

  // Reset due date to +3bd when toggling follow-up on
  const toggleFollowUp = () => {
    if (!showFollowUp) setTaskDue(defaultDue);
    setShowFollowUp(!showFollowUp);
  };

  const handleSubmit = async () => { /* see "Both-rows-commit contract" below */ };
  // ... JSX
}
```

### Both-rows-commit contract (LOG-03)

Three options were considered:

**A. `Promise.all([addInteraction, addTask])` — parallel, single error**
- Pro: simple
- Con: addInteraction can succeed while addTask fails; `Promise.all` rejects on first failure but does not undo the success. If the user sees the rejection toast, they cannot tell whether the interaction landed.

**B. Sequential, await each, hard-fail on first error**
- Pro: predictable order
- Con: same as A — interaction may persist while task does not; user sees a generic error and the form clears.

**C. Sequential with explicit error tracking + retain-on-failure (RECOMMENDED)**
- Run `addInteraction` first.
- If it fails: keep the form state intact, surface the toast (already raised inside the hook at line 521), and **do not** attempt the task. User can retry both.
- If it succeeds: clear notes/type, attempt `addTask` if `showFollowUp && taskText.trim()`.
- If task fails: keep the follow-up section open with text + due date intact, surface a clear toast (`"Activity logged. Follow-up task failed to save — retry?"`), and provide an inline retry button on the form. The interaction is in the timeline; the user can re-submit just the task.

Implementation sketch:

```typescript
const handleSubmit = async () => {
  if (!notes.trim() && !(showFollowUp && taskText.trim())) {
    toast.error("Add notes or a follow-up task");
    return;
  }

  setSubmitting(true);
  let interactionOk = false;
  try {
    await addInteraction(prospectId, {
      type,
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim() || `${type} logged`,
    });
    interactionOk = true;
    // hook toasts on its own error path; no in-component toast needed for the failure case
  } catch (err) {
    // Hook does not throw — it returns silently after toasting.
    // This catch is defensive; in current useProspects, addInteraction toasts and returns.
  }

  if (!interactionOk) {
    setSubmitting(false);
    return; // form state preserved
  }

  // Interaction landed — clear interaction inputs immediately so user sees progress
  setNotes("");
  setType(INTERACTION_TYPES[0]);

  if (showFollowUp && taskText.trim()) {
    try {
      await addTask(prospectId, { text: taskText.trim(), dueDate: taskDue });
      // success path: clear task inputs
      setTaskText("");
      setTaskDue(defaultDue);
      setShowFollowUp(false);
      toast.success("Activity logged + task created");
    } catch (err) {
      // hook already toasted; surface a more contextual message
      toast.error("Activity logged, but follow-up task failed — try again from the open form");
      // KEEP showFollowUp + taskText + taskDue intact for retry
    }
  } else {
    setShowFollowUp(false);
    toast.success("Activity logged");
  }

  setSubmitting(false);

  // Bump last_touched (LOG-04) — addInteraction inserts to prospect_interactions
  // but does NOT update prospects.last_touched. update() does.
  await triggerLastTouchedBump?.();
};
```

**Caveat on the catch blocks:** Reading `useProspects.ts:512-530` and `570-587`, neither `addInteraction` nor `addTask` throws — both check `error` from Supabase, `toast.error()`, and return. The `try/catch` above is therefore defensive (does not actually fire on Supabase errors). To detect failure, the widget needs either:

1. Hook signature change: have `addInteraction`/`addTask` return `boolean` or `Promise<{ok: boolean}>`.
2. Caller-side detection: re-read `prospect.interactions` length before vs. after — fragile.
3. **Recommended:** Add a return value to the hooks. Change `addInteraction` to `Promise<boolean>` (true on success, false on error after toasting). This is a 4-line change in `useProspects.ts` and matches the contract of `add()` which already returns `string | undefined` (line 164).

**Hook signature change required for LOG-03:**

```typescript
// src/hooks/useProspects.ts:512 — addInteraction
const addInteraction = useCallback(async (prospectId, interaction): Promise<boolean> => {
  // ... existing body
  if (error) { toast.error(...); return false; }
  // ... existing setData logic
  return true;
}, [user]);

// Same change for addTask at line 570.
```

Callers that currently `await addInteractionDirect?.(...)` and discard the result keep working (boolean is ignored). The widget reads the return value:

```typescript
const interactionOk = await addInteraction(prospectId, {...});
if (!interactionOk) { setSubmitting(false); return; }
```

This is the cleanest path and is internally consistent with how `add()` already signals failure (returns `undefined`).

### last_touched bump (LOG-04)

`addInteraction` (line 514) inserts into `prospect_interactions` only. It does **not** update `prospects.last_touched`. The aging-dot UX in TerritoryPlanner relies on `lastTouched` to colorize stale accounts — logging an activity that does not bump it is a real user-visible bug.

Two fixes:

1. **Caller-side bump (recommended):** After successful interaction, call `update(prospect.id, {})`. The empty-fields update at `useProspects.ts:110` writes `last_touched: today` unconditionally (line 143), regardless of which other fields are passed. Cost: one extra Supabase round-trip per Log Activity submit.

2. **Hook-side bump:** Add `last_touched` write inside `addInteraction`. Cleaner semantically but couples the hook to the prospect row. Lower-effort caller pattern wins for now — defer the hook change to a future cleanup.

### Submit-while-submitting protection

Add `disabled={submitting}` on the Button (line 852 currently has no disabled state). Without this, a slow Supabase round-trip + a user double-click creates two interactions and two tasks. This is a real bug today on the inline widget.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| +3 business-day calculation | Custom day-of-week loop | `date-fns` `addBusinessDays(new Date(), 3)` | Already a dep, one-liner, handles weekends |
| Date picker | Custom calendar grid | shadcn `Calendar` + `Popover` | Already used in widget at lines 837-848 |
| Form validation | Zod schema | Inline `notes.trim() || taskText.trim()` check | Form has 2 fields and one optional sub-form — Zod is overkill |
| Toast notifications | Custom snackbar | `sonner` `toast` | Already used (line 24) |
| Async UI lock | Loader spinner state machine | `disabled={submitting}` on the Button | Standard React pattern |

---

## Common Pitfalls

### Pitfall 1: Default due date snapshotted once and goes stale
**What goes wrong:** `useMemo(() => addBusinessDays(new Date(), 3), [])` computes once on mount. If the widget mounts when the user opens ProspectSheet at 11pm and they submit at 12:01am, the default is yesterday's +3bd.
**Prevention:** Recompute when `showFollowUp` flips true: `if (!showFollowUp) setTaskDue(format(addBusinessDays(new Date(), 3), "yyyy-MM-dd"))`. (Shown in handler `toggleFollowUp` above.)
**Warning sign:** A test that mocks system time, mounts the widget, advances time, toggles follow-up, and asserts the new default.

### Pitfall 2: Sub-collection replace via update()
**What goes wrong:** Passing `interactions: [...]` to `update()` triggers the deprecated path (now ignored — `useProspects.ts:118` strips it). Easy to slip back into.
**Prevention:** Always call `addInteraction(prospectId, {...})` and `addTask(prospectId, {...})` directly. Never pass `interactions` or `tasks` to `update()`.
**Warning sign:** Any line that has `update(id, { interactions: ..., tasks: ... })` — Phase 01 stripped these from update() but a regression would silently no-op.

### Pitfall 3: Drawer + iOS keyboard interactions on mobile
**What goes wrong:** On mobile, `vaul` Drawer with a Textarea inside can have its bottom sheet covered by the iOS keyboard. The user cannot see what they're typing.
**Prevention:** The current ProspectSheet wraps content in `overflow-y-auto` which lets the form scroll above the keyboard. Test in mobile viewport (Chrome DevTools mobile emulation) — submit button must be reachable above keyboard. If not, add `mb-32` to the widget container on mobile, or use `vaul`'s `setBackgroundColorOnScale` and `snapPoints` features.
**Source:** `vaul` docs note iOS keyboard handling is opt-in; check vaul GitHub issues for `keyboard` if observed. (LOW confidence — not verified in this research; flag for mobile manual UAT.)

### Pitfall 4: Toast spam on partial failure
**What goes wrong:** The current `addInteraction` and `addTask` each toast on error. The widget then ALSO toasts. User sees three toasts ("Failed to add interaction", "Failed to add task", "Activity logged but follow-up task failed").
**Prevention:** Either (a) suppress hook-level toast when calling from widget (add a `silent: true` option to the hooks — invasive), or (b) accept the duplicate; it's still better than silent failure. **Recommend (b)** — duplicate toasts on error are noisy but not data-losing. Phase 05 should not refactor hook toast behavior.

### Pitfall 5: `INTERACTION_TYPES` includes "Task Completed"
**What goes wrong:** `INTERACTION_TYPES = ["Email", "Call", "LinkedIn Message", "Task Completed"]` (`src/data/prospects.ts:45`). Showing "Task Completed" in the Log Activity dropdown is wrong — that type is reserved for the auto-log when a user completes a task from the Tasks tab (`completeTask` at line 237).
**Prevention:** Filter the type list — current widget already does this at line 814: `INTERACTION_TYPES.filter(t => t !== "Task Completed")`. Preserve this filter in the extracted component.

---

## Code Examples

### Default due date computation

```typescript
// At top of LogActivityWidget body
const defaultDue = useMemo(
  () => format(addBusinessDays(new Date(), 3), "yyyy-MM-dd"),
  []
);
const [taskDue, setTaskDue] = useState(defaultDue);

// When toggling follow-up on, refresh the default
const toggleFollowUp = () => {
  if (!showFollowUp) {
    setTaskDue(format(addBusinessDays(new Date(), 3), "yyyy-MM-dd"));
  }
  setShowFollowUp(prev => !prev);
};
```

### Submit with partial-failure tolerance

See "Both-rows-commit contract" above. Key shape:

```typescript
const handleSubmit = async () => {
  if (!notes.trim() && !(showFollowUp && taskText.trim())) {
    toast.error("Add notes or a follow-up task");
    return;
  }

  setSubmitting(true);
  const interactionOk = await addInteraction(prospectId, {
    type,
    date: new Date().toISOString().split("T")[0],
    notes: notes.trim() || `${type} logged`,
  });

  if (!interactionOk) {
    setSubmitting(false);
    return;
  }

  setNotes("");

  if (showFollowUp && taskText.trim()) {
    const taskOk = await addTask(prospectId, { text: taskText.trim(), dueDate: taskDue });
    if (taskOk) {
      setTaskText("");
      setTaskDue(defaultDue);
      setShowFollowUp(false);
      toast.success("Activity logged + task created");
    } else {
      toast.error("Activity logged, but follow-up task failed — retry?");
      // Keep follow-up form open with values intact
    }
  } else {
    toast.success("Activity logged");
  }

  setSubmitting(false);
  await triggerLastTouchedBump?.();
};
```

### Test scaffold (mirroring `src/test/ProspectSheet.tab.test.tsx`)

```typescript
// src/test/LogActivityWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogActivityWidget } from "@/components/LogActivityWidget";

describe("LogActivityWidget", () => {
  beforeEach(() => vi.useRealTimers());

  it("renders type select, notes textarea, follow-up toggle, submit button", () => { /* ... */ });

  it("submit with notes only creates an interaction and clears notes", async () => {
    const addInteraction = vi.fn().mockResolvedValue(true);
    const addTask = vi.fn();
    render(<LogActivityWidget prospectId="p1" addInteraction={addInteraction} addTask={addTask} />);
    // ... type into notes, click submit
    await waitFor(() => expect(addInteraction).toHaveBeenCalledOnce());
    expect(addTask).not.toHaveBeenCalled();
  });

  it("submit with follow-up creates both rows", async () => { /* ... */ });

  it("default due date is +3 business days", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-04-22")); // Wednesday
    // ... toggle follow-up, assert input shows 2026-04-27 (Monday, skips Sat+Sun)
  });

  it("interaction failure preserves form state and does not call addTask", async () => {
    const addInteraction = vi.fn().mockResolvedValue(false);
    const addTask = vi.fn();
    // ... submit, assert addTask not called, notes still in input
  });

  it("interaction success + task failure surfaces task error toast and keeps follow-up form open", async () => {
    const addInteraction = vi.fn().mockResolvedValue(true);
    const addTask = vi.fn().mockResolvedValue(false);
    // ... submit, assert task input still visible with text
  });
});
```

---

## Plan Breakdown Recommendation

**Single plan: 05-01-PLAN.md — Extract LogActivityWidget + harden submit + add tests**

Rationale: the wire-up step is a single import-and-replace in `ProspectSheet.tsx`. Splitting widget creation and wire-up into two plans creates artificial overhead — the widget is unverifiable until it's mounted and the tests run.

Tasks (RED/GREEN cadence per project pattern):

1. **Task 1 (RED, ~30 min):** Create `src/test/LogActivityWidget.test.tsx` with `it.todo` for the six contract tests above. Add `addInteraction` and `addTask` return-type change in `useProspects.ts` (return `Promise<boolean>`) — this is a non-breaking change since callers ignore the return.
2. **Task 2 (GREEN, ~60 min):** Create `src/components/LogActivityWidget.tsx` with full body. Replace inline JSX block at `ProspectSheet.tsx:805-856` with `<LogActivityWidget ... />`. Remove now-unused state vars (`interactionType`, `interactionNotes`, `newTaskText`, `newTaskDate`, `showFollowUp`) from ProspectSheet body if no longer referenced elsewhere. Note: `addTask`/`completeTask`/`removeTask` helpers (lines 229-250) still use `newTaskText`/`newTaskDate` for the OLD task form on the Tasks tab — verify the Tasks tab still has its own task-add form OR confirm those vars are dead code and remove them. Convert all six test placeholders to runnable assertions.
3. **(Optional Task 3 if needed):** Add LOG-* requirement IDs to `REQUIREMENTS.md`. Update `ROADMAP.md` Phase 5 entry from "TBD" to the Plan 05-01 reference.

If Task 2 ends up touching more than ~250 lines of diff (likely), split off Task 3 as a separate cleanup pass.

**Total estimated effort:** 1.5-2.5 hours of agent execution time.

---

## Mobile considerations

- **Drawer position:** The widget should be the **first** child of `<TabsContent value="activity">`. It is not sticky — the user scrolls to see Notes and Activity Timeline below it. This matches the current Phase 03 layout.
- **vaul Drawer + iOS keyboard:** Reference pattern in `OpportunitySheet.tsx:450-466` is `direction="right"` (right-edge drawer, full height). Phase 03 verified ProspectSheet uses the same pattern (Plan 03-01 commit). On iOS the keyboard pushes the viewport up but the drawer's internal `overflow-y-auto` should let the form scroll. If the submit button gets hidden, add `pb-safe` (Tailwind safe-area utility) to the form container. **Flag for mobile manual UAT** in the plan's verification section.
- **Touch target sizes:** The follow-up toggle button (current line 819) has no explicit padding — `text-xs font-medium` makes it ~16px tall. Below the 44x44 minimum from UX-V2-02. Recommendation: add `py-1.5 px-2 -mx-2` to the toggle to expand the hit area without changing the visual size. (UX-V2-02 is deferred to v2, but a 5-minute fix on a touched line is reasonable.)

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely client-side React component work. No external CLI tools, services, or runtimes required beyond Bun + Vite + Vitest already verified by Phase 03.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.0.0 |
| Config file | `vitest.config.ts` (jsdom env, globals enabled) |
| Setup file | `src/test/setup.ts` (matchMedia mock) |
| Quick run command | `bunx vitest run src/test/LogActivityWidget.test.tsx` |
| Full suite command | `bunx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| LOG-01 | Widget renders type/notes/toggle/submit | unit | `bunx vitest run src/test/LogActivityWidget.test.tsx -t "renders"` | ❌ Wave 0 |
| LOG-01 | Submit creates interaction (no follow-up) | unit | `... -t "creates an interaction"` | ❌ Wave 0 |
| LOG-01 | Submit creates both rows when follow-up enabled | unit | `... -t "creates both rows"` | ❌ Wave 0 |
| LOG-02 | Default due date is +3 business days | unit | `... -t "default due date"` | ❌ Wave 0 |
| LOG-03 | Interaction failure preserves form state | unit | `... -t "interaction failure"` | ❌ Wave 0 |
| LOG-03 | Task failure after interaction success keeps follow-up form | unit | `... -t "task failure"` | ❌ Wave 0 |
| LOG-04 | last_touched bumps on submit | manual UAT | open prospect, log activity, verify aging dot greens | ❌ Manual |
| LOG-05 | Renders on mobile drawer | manual UAT | iOS Safari emulation, open Activity tab | ❌ Manual |

### Sampling Rate

- **Per task commit:** `bunx vitest run src/test/LogActivityWidget.test.tsx -x`
- **Per wave merge:** `bunx vitest run`
- **Phase gate:** Full suite green + manual UAT for LOG-04, LOG-05.

### Wave 0 Gaps

- [ ] `src/test/LogActivityWidget.test.tsx` — covers LOG-01, LOG-02, LOG-03
- [ ] No new framework install needed; Vitest infra is set up.

---

## Open Questions

1. **Should `addInteraction`/`addTask` return `Promise<boolean>` or `Promise<{ ok: boolean; id?: string }>`?**
   - Boolean is simpler and matches the widget's needs.
   - Object is forward-compatible (caller could optimistically focus a newly-created task in the timeline).
   - Recommendation: **Boolean.** Defer the object shape to a future need.

2. **Should the +3-business-day default skip US federal holidays?**
   - `addBusinessDays` skips weekends only. April 27, 2026 is a Monday — fine. But if you log an activity on July 3, 2026 (Friday, day before Independence Day Saturday → observed Friday in 2026 actually), the default lands on Wednesday July 8 — accurate enough.
   - Recommendation: **No holiday awareness.** Single-user productivity tool, user can adjust the date manually for the 6 federal holidays per year.

3. **Should the widget have a "Cancel" button to clear without submitting?**
   - Current widget has none. Form clears on submit only.
   - Recommendation: **No.** User can just clear inputs manually; adding a Cancel button is more chrome for marginal value.

---

## Sources

### Primary (HIGH confidence — direct code inspection)

- `src/components/ProspectSheet.tsx` — full file (1,200 lines): widget location at 803-856, `logActivity()` at 298-318, props contract at 35-58, hook destructure at 92, state vars at 133-144
- `src/hooks/useProspects.ts` — full file (639 lines): `addInteraction` at 512-530, `addTask` at 570-587, `update()` last_touched bump at 143, rollback pattern at 110-162
- `src/data/prospects.ts` — `INTERACTION_TYPES` at 45, `Task` type, `InteractionLog` type
- `src/test/ProspectSheet.tab.test.tsx` — pattern reference (148 lines): `makeProspect` factory, `renderSheet` helper, mock pattern
- `.planning/phases/01-data-integrity-security/01-02-SUMMARY.md` — rollback pattern, direct CRUD migration, `addInteraction`/`addTask` introduced
- `.planning/phases/03-component-decomposition-ux-polish/03-RESEARCH.md` — section map, tab IA decision, vaul Drawer pattern
- `.planning/phases/03-component-decomposition-ux-polish/03-02-SUMMARY.md` — controlled-tab pattern, Radix Tabs test convention (pointerDown + mouseDown + click)
- `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — phase scope, requirement ID conventions
- `./CLAUDE.md` — confirms scope match (priority roadmap item #2)
- `package.json` — `date-fns ^3.6.0`, `vitest ^3.2.4`, `@testing-library/react ^16.0.0`

### Secondary (HIGH confidence — stable API knowledge)

- `date-fns` `addBusinessDays(date, amount)` — public stable API since v2; signature unchanged in v3.6.0; skips Sat+Sun, no holiday handling. (Training-data confidence; the function and signature are documented and unchanged.)

### Tertiary (LOW confidence — flagged for verification)

- `vaul` Drawer + iOS keyboard behavior — known issue area; specific quirks not verified in this research. Flag as mobile manual UAT in plan.

---

## Metadata

**Confidence breakdown:**
- Existing widget location and shape: HIGH — read directly from source
- Hook contracts (`addInteraction`, `addTask`, `update`): HIGH — read directly from source
- Both-rows-commit recommendation (Option C): HIGH — derived from Phase 01 rollback pattern + Promise.all tradeoffs
- date-fns `addBusinessDays`: HIGH — stable public API
- Mobile vaul + keyboard: LOW — unverified, flagged for UAT
- Plan breakdown (single plan): HIGH — scope is small enough that splitting creates overhead

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable domain; no fast-moving dependencies)
