import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PipelineForecastBar } from "@/components/PipelineForecastBar";
import type { Opportunity } from "@/hooks/useOpportunities";

const make = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: crypto.randomUUID(),
  territory_id: "t1",
  user_id: "u1",
  name: "Test Deal",
  type: "Net New",
  potential_value: 100_000,
  incremental_acv: null,
  point_of_contact: "",
  stage: "Propose",
  notes: "",
  products: "",
  close_date: "",
  prospect_id: null,
  website: "",
  created_at: "",
  ...overrides,
});

const renderBar = (opps: Opportunity[]) =>
  render(
    <TooltipProvider>
      <PipelineForecastBar opportunities={opps} />
    </TooltipProvider>,
  );

describe("PipelineForecastBar", () => {
  beforeEach(() => localStorage.clear());

  it("renders headline weighted total + raw open for non-empty pipeline", () => {
    renderBar([make({ stage: "Propose", potential_value: 100_000 })]);
    expect(screen.getByTestId("pipeline-forecast-bar")).toBeInTheDocument();
    // weighted ($70,000) appears in headline + legend chip; raw open ($100,000) in headline
    expect(screen.getAllByText(/\$70,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$100,000/)).toBeInTheDocument();
  });

  it("renders 'No active pipeline' empty state when zero open opportunities exist", () => {
    renderBar([make({ stage: "Closed Lost", potential_value: 100_000 })]);
    expect(screen.getByText(/no active pipeline/i)).toBeInTheDocument();
  });

  it("renders quota % when localStorage['my_numbers_v2'] has FY27 entries", () => {
    localStorage.setItem("my_numbers_v2", JSON.stringify([
      { month: "2026-04", incrementalQuota: 60_000, incrementalBookings: 0, renewedAcv: 0, pipelineAcv: 0, meetings: 0, outreachTouches: 0 },
    ]));
    renderBar([make({ stage: "Propose", potential_value: 30_000 })]);
    // weighted = 21,000; quota = 60,000; pct = 35.0%
    expect(screen.getByText(/35\.0%/)).toBeInTheDocument();
  });
});
