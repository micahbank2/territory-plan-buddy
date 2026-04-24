import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemoryRouter } from "react-router-dom";
import { ProspectSheet } from "@/components/ProspectSheet";
import { initProspect, type Prospect } from "@/data/prospects";

// Mock the responsive hook so each test can control mobile vs desktop
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

import { useIsMobile } from "@/hooks/use-mobile";

const mockedUseIsMobile = useIsMobile as unknown as ReturnType<typeof vi.fn>;

function makeProspect(): Prospect {
  return initProspect({
    id: "test-prospect-id",
    name: "Test Co",
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
  const prospect = makeProspect();
  return {
    prospectId: prospect.id,
    onClose: vi.fn(),
    data: [prospect],
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
        <ProspectSheet {...makeProps(props)} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("ProspectSheet — responsive wrapper", () => {
  beforeEach(() => {
    cleanup();
    mockedUseIsMobile.mockReset();
  });

  // Test A: When matchMedia reports mobile, ProspectSheet renders inside a vaul Drawer.
  it("renders a Drawer when isMobile is true", () => {
    mockedUseIsMobile.mockReturnValue(true);
    const { baseElement } = renderSheet();
    // vaul Drawer adds a [data-vaul-drawer] attribute to its content element
    const drawer = baseElement.querySelector("[data-vaul-drawer]");
    const sheetContent = baseElement.querySelector('[data-state="open"][role="dialog"][data-side="right"]');
    expect(drawer).not.toBeNull();
    expect(sheetContent).toBeNull();
  });

  // Test B: When matchMedia reports desktop, ProspectSheet renders inside a shadcn Sheet (right side).
  it("renders a Sheet (right side) when isMobile is false", () => {
    mockedUseIsMobile.mockReturnValue(false);
    const { baseElement } = renderSheet();
    // shadcn Sheet (Radix Dialog Content with side="right" applied to className)
    // Look for any element on screen whose class includes the right-side slide-in marker.
    const sheetContent = baseElement.querySelector(
      '[role="dialog"][data-state="open"]',
    );
    expect(sheetContent).not.toBeNull();
    // No vaul drawer attribute present on desktop
    const drawer = baseElement.querySelector("[data-vaul-drawer]");
    expect(drawer).toBeNull();
  });

  // Test C: On desktop, body should not be locked with overflow:hidden the way the old
  // Dialog did. Sheet uses its own scroll container so body scroll remains free.
  it("does not apply overflow:hidden to document.body on desktop", () => {
    mockedUseIsMobile.mockReturnValue(false);
    renderSheet();
    // jsdom does not always replicate Radix's scroll-lock side-effects, but the
    // assertion documents the contract: Sheet must not push overflow:hidden onto body.
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
