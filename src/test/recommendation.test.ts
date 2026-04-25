import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRecommendation } from "@/data/recommendation";
import { initProspect, type Prospect } from "@/data/prospects";

const today = (offsetDays = 0) => {
  const d = new Date("2026-04-24");
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const make = (overrides: Partial<Prospect>): Prospect =>
  initProspect({ id: "test-1", name: "Test Co", ...overrides });

describe("getRecommendation", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-24")));
  afterEach(() => vi.useRealTimers());

  it("Hot + Not Started raises critical 'Hot, not started' callout", () => {
    const r = getRecommendation(make({ priority: "Hot", outreach: "Not Started" }));
    const chip = r.callouts.find((c) => c.kind === "hot-not-started");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("critical");
    expect(chip!.text).toBe("Hot, not started");
    expect(r.suggestedAction).toMatch(/start.*today/i);
  });

  it("Score 60+ with no Decision Maker flags missing-decision-maker (warn)", () => {
    const r = getRecommendation(
      make({
        industry: "QSR/Fast Casual",
        locationCount: 500,
        priority: "Hot",
        contacts: [
          {
            id: "c1",
            name: "x",
            email: "",
            phone: "",
            title: "",
            notes: "",
            role: "Champion",
          },
        ],
      }),
    );
    const chip = r.callouts.find((c) => c.kind === "missing-decision-maker");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("warn");
  });

  it("Never contacted at score>=40 is critical 'Never contacted'", () => {
    const r = getRecommendation(
      make({ industry: "QSR/Fast Casual", locationCount: 500 }),
    );
    const chip = r.callouts.find((c) => c.kind === "never-contacted");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("critical");
    expect(chip!.text).toBe("Never contacted");
  });

  it("90+ days stale is critical with day count in chip text", () => {
    const r = getRecommendation(
      make({
        interactions: [
          { id: "i1", type: "Email", date: today(120), notes: "" },
        ],
      }),
    );
    const chip = r.callouts.find((c) => c.kind === "stale-90");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("critical");
    expect(chip!.text).toContain("120");
  });

  it("Hot priority + 14d stale flags going-cold (warn) and not stale-30", () => {
    const r = getRecommendation(
      make({
        priority: "Hot",
        outreach: "Actively Prospecting",
        interactions: [
          { id: "i1", type: "Email", date: today(20), notes: "" },
        ],
      }),
    );
    expect(r.callouts.some((c) => c.kind === "going-cold")).toBe(true);
    expect(r.callouts.some((c) => c.kind === "stale-30")).toBe(false);
    const goingCold = r.callouts.find((c) => c.kind === "going-cold");
    expect(goingCold!.severity).toBe("warn");
  });

  it("Cold priority + score 60+ flags 'High potential, marked Cold'", () => {
    const r = getRecommendation(
      make({
        industry: "QSR/Fast Casual",
        locationCount: 500,
        priority: "Cold",
        outreach: "Actively Prospecting",
      }),
    );
    const chip = r.callouts.find((c) => c.kind === "high-score-cold-priority");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("warn");
  });

  it("competitor='Yext' produces no competitor callout", () => {
    const r = getRecommendation(make({ competitor: "Yext" }));
    expect(r.callouts.find((c) => c.kind === "competitor")).toBeUndefined();
  });

  it("competitor='Unknown' produces no competitor callout", () => {
    const r = getRecommendation(make({ competitor: "Unknown" }));
    expect(r.callouts.find((c) => c.kind === "competitor")).toBeUndefined();
  });

  it("competitor='Other: PowerListings' produces 'On PowerListings' chip", () => {
    const r = getRecommendation(make({ competitor: "Other: PowerListings" }));
    const chip = r.callouts.find((c) => c.kind === "competitor");
    expect(chip).toBeDefined();
    expect(chip!.text).toBe("On PowerListings");
    expect(chip!.severity).toBe("info");
  });

  it("competitor='SOCi' produces warn-severity 'On SOCi' chip", () => {
    const r = getRecommendation(make({ competitor: "SOCi" }));
    const chip = r.callouts.find((c) => c.kind === "competitor");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("warn");
    expect(chip!.text).toBe("On SOCi");
  });

  it("callouts capped at 3 even when more apply", () => {
    const r = getRecommendation(
      make({
        priority: "Hot",
        outreach: "Not Started",
        competitor: "SOCi",
        industry: "QSR/Fast Casual",
        locationCount: 500,
        // 4+ candidates: hot-not-started (critical), never-contacted (critical),
        // no-contacts (critical), competitor SOCi (warn)
      }),
    );
    expect(r.callouts.length).toBeLessThanOrEqual(3);
    // Sorted critical first
    expect(r.callouts[0].severity).toBe("critical");
  });

  it("ideal prospect (Meeting Booked, recent touch, both DM+Champion) returns Meeting Booked action", () => {
    const r = getRecommendation(
      make({
        priority: "Warm",
        outreach: "Meeting Booked",
        contacts: [
          {
            id: "c1",
            name: "x",
            email: "",
            phone: "",
            title: "",
            notes: "",
            role: "Decision Maker",
          },
          {
            id: "c2",
            name: "y",
            email: "",
            phone: "",
            title: "",
            notes: "",
            role: "Champion",
          },
        ],
        interactions: [
          { id: "i1", type: "Email", date: today(2), notes: "" },
        ],
      }),
    );
    expect(r.suggestedAction).toMatch(/meeting/i);
  });

  it("never-contacted on a low-score prospect (score<40) does NOT emit never-contacted critical", () => {
    // Plain prospect with Cold priority -> score 0, no interactions
    const r = getRecommendation(make({ priority: "Cold" }));
    expect(r.callouts.find((c) => c.kind === "never-contacted")).toBeUndefined();
  });

  it("Customer status emits info-severity 'Existing customer' chip", () => {
    const r = getRecommendation(
      make({
        status: "Customer",
        contacts: [
          {
            id: "c1",
            name: "x",
            email: "",
            phone: "",
            title: "",
            notes: "",
            role: "Decision Maker",
          },
        ],
        interactions: [
          { id: "i1", type: "Email", date: today(2), notes: "" },
        ],
      }),
    );
    const chip = r.callouts.find((c) => c.kind === "customer");
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe("info");
    expect(chip!.text).toBe("Existing customer");
  });
});
