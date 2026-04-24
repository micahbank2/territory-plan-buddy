import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemoryRouter } from "react-router-dom";
import { ProspectSheet } from "@/components/ProspectSheet";
import { initProspect, type Prospect } from "@/data/prospects";

// Mock the responsive hook so we render the desktop Sheet branch (jsdom-friendly)
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

function makeProspect(id: string = "test-prospect-id"): Prospect {
  return initProspect({
    id,
    name: `Test Co ${id}`,
    website: "test.com",
    industry: "QSR / Fast Casual",
    locationCount: 100,
    outreach: "Not Started",
    priority: "",
    tier: "",
    competitor: "",
    status: "Prospect",
  } as any);
}

function makeProps(overrides: Record<string, any> = {}) {
  const prospect = (overrides.data?.[0] as Prospect) || makeProspect();
  return {
    prospectId: overrides.prospectId ?? prospect.id,
    onClose: vi.fn(),
    data: overrides.data ?? [prospect],
    update: vi.fn(),
    remove: vi.fn(),
    deleteNote: vi.fn(),
    addContact: vi.fn().mockResolvedValue(undefined),
    updateContact: vi.fn().mockResolvedValue(undefined),
    removeContact: vi.fn().mockResolvedValue(undefined),
    addInteraction: vi.fn().mockResolvedValue(undefined),
    removeInteraction: vi.fn().mockResolvedValue(undefined),
    addNote: vi.fn().mockResolvedValue(undefined),
    addTaskDirect: vi.fn().mockResolvedValue(undefined),
    removeTaskDirect: vi.fn().mockResolvedValue(undefined),
    signals: [],
    addSignal: vi.fn().mockResolvedValue(null),
    removeSignal: vi.fn().mockResolvedValue(undefined),
    territoryId: null,
    ...overrides,
  };
}

function renderSheet(props: any = {}) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProspectSheet {...(makeProps(props) as any)} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("ProspectSheet — tabs (Plan 02 targets)", () => {
  beforeEach(() => {
    cleanup();
  });

  // Test D — UX-01 acceptance: four tab triggers visible.
  it("renders 4 tab triggers (Overview, Activity, Contacts, Tasks)", () => {
    renderSheet({ activeTab: "overview", onTabChange: vi.fn() });
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /contacts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /tasks/i })).toBeInTheDocument();
  });

  // Test E — UX-02 controlled prop: passing activeTab="activity" shows the Activity panel.
  it("shows Activity panel when activeTab='activity' prop is passed", () => {
    renderSheet({ activeTab: "activity", onTabChange: vi.fn() });
    // Activity tab trigger is selected
    const activityTrigger = screen.getByRole("tab", { name: /activity/i });
    expect(activityTrigger).toHaveAttribute("data-state", "active");
    // Activity-specific content visible
    expect(screen.getByText(/log activity/i)).toBeInTheDocument();
  });

  // Test F — UX-02 SC-3 persistence: switching prospectId while keeping the same
  // activeTab keeps the Activity tab selected, proving controlled-prop is the source of truth.
  it("preserves Activity tab across prospectId switches (UX-02 SC-3)", () => {
    const pA = makeProspect("p1");
    const pB = makeProspect("p2");
    const onTabChange = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <TooltipProvider>
          <ProspectSheet
            {...(makeProps({ data: [pA, pB], prospectId: "p1", activeTab: "activity", onTabChange }) as any)}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: /activity/i })).toHaveAttribute("data-state", "active");

    // Switch prospect while keeping activeTab="activity"
    rerender(
      <MemoryRouter>
        <TooltipProvider>
          <ProspectSheet
            {...(makeProps({ data: [pA, pB], prospectId: "p2", activeTab: "activity", onTabChange }) as any)}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );
    // Tab still active because the parent owns it
    expect(screen.getByRole("tab", { name: /activity/i })).toHaveAttribute("data-state", "active");

    // Reset cycle: parent passes activeTab="overview" (simulates handleSheetClose then reopen)
    rerender(
      <MemoryRouter>
        <TooltipProvider>
          <ProspectSheet
            {...(makeProps({ data: [pA, pB], prospectId: "p2", activeTab: "overview", onTabChange }) as any)}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("data-state", "active");
  });

  // Test G — onTabChange callback fires with the tab value when a trigger is clicked.
  it("calls onTabChange with the tab value when a tab trigger is clicked", () => {
    const onTabChange = vi.fn();
    renderSheet({ activeTab: "overview", onTabChange });
    fireEvent.click(screen.getByRole("tab", { name: /tasks/i }));
    expect(onTabChange).toHaveBeenCalledWith("tasks");
  });
});
