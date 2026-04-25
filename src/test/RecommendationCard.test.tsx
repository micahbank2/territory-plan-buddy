import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationCard } from "@/components/RecommendationCard";
import { initProspect } from "@/data/prospects";

describe("RecommendationCard", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-24")));
  afterEach(() => vi.useRealTimers());

  it("renders score, label, callouts, and suggested action for Hot+Not Started prospect", () => {
    const p = initProspect({
      id: "1",
      name: "Acme",
      priority: "Hot",
      outreach: "Not Started",
      industry: "QSR/Fast Casual",
      locationCount: 500,
      competitor: "SOCi",
    });
    render(<RecommendationCard prospect={p} />);
    expect(screen.getByTestId("recommendation-card")).toBeInTheDocument();
    expect(screen.getByText(/why call this account/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot, not started/i)).toBeInTheDocument();
    expect(screen.getByText(/start.*today/i)).toBeInTheDocument();
  });

  it("renders without crashing for ideal prospect (no callouts, only suggested action)", () => {
    const p = initProspect({
      id: "1",
      name: "Acme",
      priority: "Warm",
      outreach: "Meeting Booked",
    });
    render(<RecommendationCard prospect={p} />);
    expect(screen.getByTestId("recommendation-card")).toBeInTheDocument();
  });

  it("compact prop renders with smaller padding/text without crashing", () => {
    const p = initProspect({ id: "1", name: "Acme" });
    render(<RecommendationCard prospect={p} compact />);
    expect(screen.getByTestId("recommendation-card")).toBeInTheDocument();
  });
});
