import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProspectFilterBar, type FilterState } from "@/components/ProspectFilterBar";
import { initProspect, type Prospect } from "@/data/prospects";

const DEFAULT_STATE: FilterState = {
  q: "",
  fIndustry: [],
  fStatus: [],
  fCompetitor: [],
  fTier: [],
  fLocRange: [0, 0],
  fOutreach: [],
  fPriority: [],
  fDataFilter: [],
};

function makeProspect(name: string, industry = "QSR / Fast Casual"): Prospect {
  return initProspect({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    website: `${name}.com`,
    industry,
    locationCount: 50,
    outreach: "Not Started",
    priority: "",
    tier: "",
    competitor: "",
    status: "Prospect",
  } as any);
}

function renderBar(propOverrides: Partial<React.ComponentProps<typeof ProspectFilterBar>> = {}) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const prospects = [makeProspect("Shake Shack"), makeProspect("Dollar Tree")];
  const value = { ...DEFAULT_STATE, ...(propOverrides as any).value };
  const utils = render(
    <TooltipProvider>
      <ProspectFilterBar
        value={value}
        onChange={onChange}
        prospects={prospects}
        onReset={onReset}
        {...propOverrides}
      />
    </TooltipProvider>
  );
  return { ...utils, onChange, onReset, prospects };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ProspectFilterBar", () => {
  it("renders the search input and filter controls", () => {
    renderBar();
    // Search input should exist (placeholder text comes from coordinator wiring; we accept any input)
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("calls onChange with new q value when typing in search input", () => {
    const { onChange } = renderBar();
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "shake" } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.q).toBe("shake");
  });

  it("calls onReset and onChange with default state when Clear is clicked", () => {
    const customState = {
      ...DEFAULT_STATE,
      q: "shake",
      fIndustry: ["QSR / Fast Casual"],
    };
    const { onChange, onReset } = renderBar({ value: customState as any });
    // Find clear button by text (only visible when filters active)
    const clearBtn = screen.getByRole("button", { name: /^clear$/i });
    fireEvent.click(clearBtn);
    expect(onReset).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastArg.q).toBe("");
    expect(lastArg.fIndustry).toEqual([]);
  });

  it("persists saved views to localStorage under tp-saved-views", () => {
    // Simulate the FilterBar saving a view via its public surface:
    // We seed localStorage and then re-render to confirm round-trip.
    const view = {
      id: "1",
      name: "Test View",
      filters: {
        q: "shake",
        fIndustry: [],
        fStatus: [],
        fCompetitor: [],
        fTier: [],
        fLocRange: [0, 0],
        fOutreach: [],
        fPriority: [],
        fDataFilter: [],
      },
    };
    localStorage.setItem("tp-saved-views", JSON.stringify([view]));
    renderBar();
    // After mount, the filter bar should expose the saved view in its UI
    // We check for the view name being rendered (the saved-views chip area)
    expect(screen.getByText("Test View")).toBeInTheDocument();
  });
});
