import { describe, it, expect } from "vitest";
import { getBriefing } from "@/data/briefing";
import { initProspect, type Prospect } from "@/data/prospects";
import type { Opportunity } from "@/hooks/useOpportunities";

const TODAY = new Date("2026-04-24T12:00:00Z"); // Friday — deterministic

const makeOpp = (overrides: Partial<Opportunity> = {}): Opportunity => ({
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
  created_at: "2026-04-22T00:00:00Z",
  ...overrides,
});

describe("getBriefing", () => {
  it("empty inputs return inboxZero=true and zero hero counts", () => {
    const b = getBriefing([], [], TODAY);
    expect(b.inboxZero).toBe(true);
    expect(b.todayPlan).toEqual([]);
    expect(b.overdueTasks).toEqual([]);
    expect(b.goingStale).toEqual([]);
    expect(b.newPipeline).toEqual([]);
    expect(b.hero.activeProspects).toBe(0);
    expect(b.hero.hotCount).toBe(0);
    expect(b.hero.weightedPipeline).toBe(0);
    expect(b.hero.overdueTaskCount).toBe(0);
  });

  it("todayLabel is formatted as 'Friday, April 24, 2026' for fixed TODAY", () => {
    const b = getBriefing([], [], TODAY);
    expect(b.todayLabel).toBe("Friday, April 24, 2026");
    expect(b.generatedAt).toBe(TODAY.toISOString());
  });

  it("hero.weightedPipeline reuses forecastPipeline output (no STAGE_WEIGHTS redefinition in briefing.ts)", () => {
    // Propose at $100k → 70k weighted via forecastPipeline (Phase 7)
    const b = getBriefing([], [makeOpp({ stage: "Propose", potential_value: 100_000 })], TODAY);
    expect(b.hero.weightedPipeline).toBe(70_000);
    // Add a Closed Lost — must NOT contribute (proves we are NOT bypassing forecast classification)
    const b2 = getBriefing([], [
      makeOpp({ stage: "Propose", potential_value: 100_000 }),
      makeOpp({ stage: "Closed Lost", potential_value: 999_999 }),
    ], TODAY);
    expect(b2.hero.weightedPipeline).toBe(70_000);
  });

  it("hero.activeProspects excludes Churned and Closed Lost Prospect statuses", () => {
    const active = initProspect({ id: "p1", name: "A", status: "Prospect", priority: "Hot" } as Partial<Prospect> as Partial<Prospect> & { id: any; name: string });
    const churned = initProspect({ id: "p2", name: "B", status: "Churned", priority: "Hot" } as Partial<Prospect> & { id: any; name: string });
    const lost = initProspect({ id: "p3", name: "C", status: "Closed Lost Prospect", priority: "Hot" } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([active, churned, lost], [], TODAY);
    expect(b.hero.activeProspects).toBe(1);
    expect(b.hero.hotCount).toBe(1);
  });

  it("todayPlan caps at 5 items, sorted by score desc, includes Hot prospects with lastTouched > 14d OR never contacted", () => {
    const prospects: Prospect[] = [];
    for (let i = 0; i < 7; i++) {
      prospects.push(initProspect({
        id: `p${i}`, name: `Hot ${i}`, priority: "Hot", tier: "Tier 1",
        industry: "QSR/Fast Casual", locationCount: 600 - i * 50,
        lastTouched: null, // never contacted
      } as Partial<Prospect> & { id: any; name: string }));
    }
    const b = getBriefing(prospects, [], TODAY);
    expect(b.todayPlan).toHaveLength(5);
    // Sorted by score desc — index 0 must have highest locationCount
    expect(b.todayPlan[0].name).toBe("Hot 0");
  });

  it("overdueTasks filters task.dueDate < todayStr, sorts daysOverdue desc, caps at 10", () => {
    const p = initProspect({
      id: "p1", name: "Acme", priority: "Hot",
      tasks: [
        { id: "t1", text: "Task 1", dueDate: "2026-04-20" }, // 4d overdue
        { id: "t2", text: "Task 2", dueDate: "2026-04-10" }, // 14d overdue
        { id: "t3", text: "Task 3", dueDate: "2026-04-25" }, // future, EXCLUDED
      ],
    } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([p], [], TODAY);
    expect(b.overdueTasks).toHaveLength(2);
    expect(b.overdueTasks[0].taskId).toBe("t2"); // 14d before 4d
    expect(b.overdueTasks[0].daysOverdue).toBe(14);
    expect(b.overdueTasks[1].daysOverdue).toBe(4);
  });

  it("overdueTasks excludes tasks with empty dueDate", () => {
    const p = initProspect({
      id: "p1", name: "Acme", priority: "Hot",
      tasks: [
        { id: "t1", text: "No due date", dueDate: "" },
        { id: "t2", text: "Real overdue", dueDate: "2026-04-20" },
      ],
    } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([p], [], TODAY);
    expect(b.overdueTasks).toHaveLength(1);
    expect(b.overdueTasks[0].taskId).toBe("t2");
  });

  it("hero.overdueTaskCount counts ALL overdue, not just the capped 10", () => {
    const tasks = Array.from({ length: 15 }, (_, i) => ({
      id: `t${i}`, text: `Task ${i}`, dueDate: "2026-04-10",
    }));
    const p = initProspect({ id: "p1", name: "Acme", priority: "Hot", tasks } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([p], [], TODAY);
    expect(b.overdueTasks).toHaveLength(10);
    expect(b.hero.overdueTaskCount).toBe(15);
  });

  it("goingStale requires lastTouched != null AND >= 30 days AND score >= 40 AND priority Hot|Warm", () => {
    const stale = initProspect({
      id: "stale", name: "Stale Hot", priority: "Hot", tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
      lastTouched: "2026-03-01", // 54d before TODAY
    } as Partial<Prospect> & { id: any; name: string });
    const tooFresh = initProspect({
      id: "fresh", name: "Fresh Hot", priority: "Hot", tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
      lastTouched: "2026-04-22", // 2d before TODAY
    } as Partial<Prospect> & { id: any; name: string });
    const lowScore = initProspect({
      id: "low", name: "Low Score", priority: "Hot",
      lastTouched: "2026-03-01", // stale enough
    } as Partial<Prospect> & { id: any; name: string });
    const cold = initProspect({
      id: "cold", name: "Cold Stale", priority: "Cold", tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
      lastTouched: "2026-03-01",
    } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([stale, tooFresh, lowScore, cold], [], TODAY);
    const ids = b.goingStale.map((s) => s.prospectId);
    expect(ids).toContain("stale");
    expect(ids).not.toContain("fresh");
    expect(ids).not.toContain("low");
    expect(ids).not.toContain("cold");
  });

  it("never-contacted Hot prospect is in todayPlan but NOT in goingStale", () => {
    const p = initProspect({
      id: "p1", name: "Cold Lead", priority: "Hot", tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
      lastTouched: null,
    } as Partial<Prospect> & { id: any; name: string });
    const b = getBriefing([p], [], TODAY);
    expect(b.todayPlan.map((t) => t.prospectId)).toContain("p1");
    expect(b.goingStale.map((s) => s.prospectId)).not.toContain("p1");
  });

  it("newPipeline filters opps with created_at within last 7 days, sorted by daysSinceCreated asc", () => {
    const opps = [
      makeOpp({ id: "o1", name: "Recent",   created_at: "2026-04-23T00:00:00Z" }), // 1d
      makeOpp({ id: "o2", name: "Boundary", created_at: "2026-04-17T00:00:00Z" }), // 7d
      makeOpp({ id: "o3", name: "TooOld",   created_at: "2026-04-10T00:00:00Z" }), // 14d, EXCLUDED
      makeOpp({ id: "o4", name: "Today",    created_at: "2026-04-24T00:00:00Z" }), // 0d
    ];
    const b = getBriefing([], opps, TODAY);
    expect(b.newPipeline.map((n) => n.oppId)).toEqual(["o4", "o1", "o2"]);
  });

  it("inboxZero is false when any of todayPlan/overdueTasks/goingStale is non-empty", () => {
    const p = initProspect({
      id: "p1", name: "Acme", priority: "Hot", lastTouched: null, tier: "Tier 1",
      industry: "QSR/Fast Casual", locationCount: 600,
    } as Partial<Prospect> & { id: any; name: string });
    // With this prospect, todayPlan will have 1 item → inboxZero false
    const b = getBriefing([p], [], TODAY);
    expect(b.inboxZero).toBe(false);
  });
});
