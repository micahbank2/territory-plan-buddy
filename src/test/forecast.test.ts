import { describe, it, expect } from "vitest";
import { forecastPipeline, STAGE_WEIGHTS } from "@/data/forecast";
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
  stage: "Discovery",
  notes: "",
  products: "",
  close_date: "",
  prospect_id: null,
  website: "",
  created_at: "",
  ...overrides,
});

describe("forecastPipeline", () => {
  it("empty pipeline returns zeros across all fields", () => {
    const f = forecastPipeline([], 615_000);
    expect(f.weighted).toBe(0);
    expect(f.rawOpen).toBe(0);
    expect(f.booked).toBe(0);
    expect(f.openCount).toBe(0);
    expect(f.byStage).toEqual([]);
    expect(f.pctOfQuota).toBe(0);
  });

  it("single Develop deal at $100k yields $10k weighted (10%) + $100k rawOpen", () => {
    const f = forecastPipeline([make({ stage: "Develop", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(10_000);
    expect(f.rawOpen).toBe(100_000);
    expect(f.openCount).toBe(1);
  });

  it("single Propose deal at $100k yields $70k weighted (70%)", () => {
    const f = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(70_000);
  });

  it("single Negotiate deal at $100k yields $85k weighted (85%)", () => {
    const f = forecastPipeline([make({ stage: "Negotiate", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(85_000);
  });

  it("Business Alignment=35% weight applied correctly", () => {
    const f = forecastPipeline([make({ stage: "Business Alignment", potential_value: 100_000 })], 615_000);
    expect(f.weighted).toBe(35_000);
  });

  it("Closed Won deal goes to booked, not weighted (openCount stays 0)", () => {
    const f = forecastPipeline([make({ stage: "Closed Won", potential_value: 100_000 })], 615_000);
    expect(f.booked).toBe(100_000);
    expect(f.weighted).toBe(0);
    expect(f.openCount).toBe(0);
  });

  it("Won (legacy stage) classified same as Closed Won — booked, not weighted", () => {
    const f = forecastPipeline([make({ stage: "Won", potential_value: 50_000 })], 615_000);
    expect(f.booked).toBe(50_000);
    expect(f.weighted).toBe(0);
    expect(f.openCount).toBe(0);
  });

  it("Closed Lost and Dead are excluded from rawOpen, weighted, and booked", () => {
    const f = forecastPipeline([
      make({ stage: "Closed Lost", potential_value: 100_000 }),
      make({ stage: "Dead",        potential_value: 100_000 }),
    ], 615_000);
    expect(f.weighted).toBe(0);
    expect(f.booked).toBe(0);
    expect(f.rawOpen).toBe(0);
    expect(f.openCount).toBe(0);
  });

  it("byStage is sorted by weighted desc across mixed stages", () => {
    const f = forecastPipeline([
      make({ stage: "Develop",   potential_value: 100_000 }),  // 10k weighted
      make({ stage: "Propose",   potential_value: 100_000 }),  // 70k weighted
      make({ stage: "Discovery", potential_value: 100_000 }),  // 20k weighted
    ], 615_000);
    expect(f.byStage.map(b => b.stage)).toEqual(["Propose", "Discovery", "Develop"]);
  });

  it("multiple deals in same stage aggregate raw, weighted, and count", () => {
    const f = forecastPipeline([
      make({ stage: "Validate", potential_value: 50_000 }),
      make({ stage: "Validate", potential_value: 50_000 }),
    ], 615_000);
    const v = f.byStage.find(b => b.stage === "Validate")!;
    expect(v.count).toBe(2);
    expect(v.raw).toBe(100_000);
    expect(v.weighted).toBe(50_000);
  });

  it("pctOfQuota = weighted / quota * 100; returns 0 when quota is 0", () => {
    const f1 = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 200_000);
    expect(f1.pctOfQuota).toBe(35); // 70k / 200k * 100
    const f2 = forecastPipeline([make({ stage: "Propose", potential_value: 100_000 })], 0);
    expect(f2.pctOfQuota).toBe(0);
  });

  it("STAGE_WEIGHTS covers all 10 OPP_STAGES (no missing stage)", () => {
    const expected = ["Develop","Discovery","Business Alignment","Validate","Propose","Negotiate","Won","Closed Won","Closed Lost","Dead"];
    for (const s of expected) {
      expect(STAGE_WEIGHTS[s]).toBeDefined();
      expect(STAGE_WEIGHTS[s].stage).toBe(s);
    }
  });
});
