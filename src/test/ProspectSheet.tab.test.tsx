import { describe, it } from "vitest";

// These scaffolds are the acceptance targets for Phase 03 Plan 02 (UX-01 + UX-02).
// They intentionally remain `it.todo()` here so Plan 01's verification reports
// 0 failures while leaving a concrete to-do list for the next plan to flip into
// real tests.
//
// Plan 02 will:
//   1. Convert these `it.todo` calls to `it(...)` with bodies that exercise the
//      tabbed Overview / Activity / Contacts / Tasks layout.
//   2. Add `activeTab` and `onTabChange` props to ProspectSheet (UX-02 controlled).
//   3. Lift `sheetTab` state into TerritoryPlanner so tab choice persists across
//      prospect switches and resets on sheet close (UX-02 SC-3).
//
// The behavior each todo describes is the contract Plan 02 must satisfy.

describe("ProspectSheet — tabs (Plan 02 targets)", () => {
  // Test D — UX-01 acceptance: four tab triggers visible.
  // Plan 02 body will:
  //   render(<ProspectSheet ...props activeTab="overview" onTabChange={vi.fn()} />)
  //   expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
  //   expect(screen.getByRole("tab", { name: /activity/i })).toBeInTheDocument();
  //   expect(screen.getByRole("tab", { name: /contacts/i })).toBeInTheDocument();
  //   expect(screen.getByRole("tab", { name: /tasks/i })).toBeInTheDocument();
  it.todo("renders 4 tab triggers (Overview, Activity, Contacts, Tasks)");

  // Test E — UX-02 controlled prop: passing activeTab="activity" shows the Activity panel.
  // Plan 02 body will:
  //   render(<ProspectSheet ...props activeTab="activity" onTabChange={vi.fn()} />)
  //   const activityPanel = screen.getByRole("tabpanel", { name: /activity/i });
  //   expect(activityPanel).toBeVisible();
  it.todo("shows Activity panel when activeTab='activity' prop is passed");

  // Test F — UX-02 SC-3 persistence: switching prospectId while keeping the same
  // activeTab keeps the Activity tab selected. This is what makes the test
  // worthwhile — proves the controlled prop is the source of truth, not internal
  // useState that resets on prop change.
  // Plan 02 body will:
  //   const { rerender } = render(<ProspectSheet prospectId="A" activeTab="activity" ... />);
  //   rerender(<ProspectSheet prospectId="B" activeTab="activity" ... />);
  //   expect(screen.getByRole("tabpanel", { name: /activity/i })).toBeVisible();
  it.todo("preserves Activity tab across prospectId switches (UX-02 SC-3)");

  // Test G — onTabChange callback fires with the tab value when a trigger is clicked.
  // Plan 02 body will:
  //   const onTabChange = vi.fn();
  //   render(<ProspectSheet ...props activeTab="overview" onTabChange={onTabChange} />);
  //   fireEvent.click(screen.getByRole("tab", { name: /tasks/i }));
  //   expect(onTabChange).toHaveBeenCalledWith("tasks");
  it.todo("calls onTabChange with the tab value when a tab trigger is clicked");
});
