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

  it.todo("Hot + Not Started raises critical 'Hot, not started' callout");
  it.todo("Score 60+ with no Decision Maker flags missing-decision-maker (warn)");
  it.todo("Never contacted at score>=40 is critical 'Never contacted'");
  it.todo("90+ days stale is critical with day count in chip text");
  it.todo("Hot priority + 14d stale flags going-cold (warn) and not stale-30");
  it.todo("Cold priority + score 60+ flags 'High potential, marked Cold'");
  it.todo("competitor='Yext' produces no competitor callout");
  it.todo("competitor='Unknown' produces no competitor callout");
  it.todo("competitor='Other: PowerListings' produces 'On PowerListings' chip");
  it.todo("competitor='SOCi' produces warn-severity 'On SOCi' chip");
  it.todo("callouts capped at 3 even when more apply");
  it.todo("ideal prospect (Meeting Booked, recent touch, both DM+Champion) returns Meeting Booked action");
  it.todo("never-contacted on a low-score prospect (score<40) does NOT emit never-contacted critical");
  it.todo("Customer status emits info-severity 'Existing customer' chip");
});
