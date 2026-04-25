import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyNumbersTrendsTab } from "@/components/myNumbers/MyNumbersTrendsTab";
import {
  FY27_MONTHS,
  DEFAULT_QUOTAS,
  type NumbersEntry,
} from "@/data/myNumbers/storage";

function makeEntries(
  overrides: Partial<Record<string, Partial<NumbersEntry>>> = {},
): NumbersEntry[] {
  return FY27_MONTHS.map((m) => ({
    month: m,
    incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
    incrementalBookings: 0,
    renewedAcv: 0,
    pipelineAcv: 0,
    meetings: 0,
    outreachTouches: 0,
    ...overrides[m],
  }));
}

function makeIncrementalCalcs(entries: NumbersEntry[]) {
  let cumB = 0;
  let cumQ = 0;
  return entries.map((e) => {
    cumB += e.incrementalBookings;
    cumQ += e.incrementalQuota;
    return {
      ytdBookings: cumB,
      ytdQuota: cumQ,
      baseCommission: 0,
      ytdAccel: 0,
      monthT1: 0,
      monthT2: 0,
      monthT3: 0,
    };
  });
}

describe("MyNumbersTrendsTab", () => {
  it("renders three chart sections", () => {
    const entries = makeEntries();
    render(
      <MyNumbersTrendsTab
        entries={entries}
        pipelineByMonth={{ incr: new Map(), renew: new Map() }}
        incrementalCalcs={makeIncrementalCalcs(entries)}
      />,
    );
    expect(screen.getByTestId("trends-attainment")).toBeInTheDocument();
    expect(screen.getByTestId("trends-activity")).toBeInTheDocument();
    expect(screen.getByTestId("trends-coverage")).toBeInTheDocument();
  });

  it("renders chart headers for all three trends", () => {
    const entries = makeEntries();
    render(
      <MyNumbersTrendsTab
        entries={entries}
        pipelineByMonth={{ incr: new Map(), renew: new Map() }}
        incrementalCalcs={makeIncrementalCalcs(entries)}
      />,
    );
    expect(screen.getByText(/Quota Attainment/i)).toBeInTheDocument();
    expect(screen.getByText(/Activity Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline Coverage/i)).toBeInTheDocument();
  });

  it("does not crash when entries have zero quotas (avoids div-by-zero on coverage chart)", () => {
    const entries = makeEntries({
      "2026-02": { incrementalQuota: 0, incrementalBookings: 0 },
    });
    const calcs = makeIncrementalCalcs(entries);
    expect(() =>
      render(
        <MyNumbersTrendsTab
          entries={entries}
          pipelineByMonth={{ incr: new Map([["2026-02", 5000]]), renew: new Map() }}
          incrementalCalcs={calcs}
        />,
      ),
    ).not.toThrow();
  });
});
