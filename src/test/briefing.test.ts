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

// Keep helpers referenced so they're not flagged unused in the RED phase.
void initProspect;
void ({} as Partial<Prospect>);
void makeOpp;

describe("getBriefing", () => {
  it("canary — stub returns deterministic empty Briefing for empty inputs", () => {
    const b = getBriefing([], [], TODAY);
    expect(b.inboxZero).toBe(true);
    expect(b.todayPlan).toEqual([]);
    expect(b.overdueTasks).toEqual([]);
    expect(b.goingStale).toEqual([]);
    expect(b.newPipeline).toEqual([]);
    expect(b.hero.activeProspects).toBe(0);
  });

  it.todo("todayLabel is formatted as 'Friday, April 24, 2026' for fixed TODAY");
  it.todo("hero.weightedPipeline reuses forecastPipeline output (no STAGE_WEIGHTS redefinition in briefing.ts)");
  it.todo("hero.activeProspects excludes Churned and Closed Lost Prospect statuses");
  it.todo("todayPlan caps at 5 items, sorted by score desc, includes Hot prospects with lastTouched > 14d OR never contacted");
  it.todo("overdueTasks filters task.dueDate < todayStr, sorts daysOverdue desc, caps at 10");
  it.todo("overdueTasks excludes tasks with empty dueDate");
  it.todo("hero.overdueTaskCount counts ALL overdue, not just the capped 10");
  it.todo("goingStale requires lastTouched != null AND >= 30 days AND score >= 40 AND priority Hot|Warm");
  it.todo("never-contacted Hot prospect is in todayPlan but NOT in goingStale");
  it.todo("newPipeline filters opps with created_at within last 7 days, sorted by daysSinceCreated asc");
  it.todo("inboxZero is false when any of todayPlan/overdueTasks/goingStale is non-empty");
});
