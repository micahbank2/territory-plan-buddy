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
  it.todo("empty pipeline returns zeros across all fields");
  it.todo("single Develop deal at $100k yields $10k weighted (10%) + $100k rawOpen");
  it.todo("single Propose deal at $100k yields $70k weighted (70%)");
  it.todo("single Negotiate deal at $100k yields $85k weighted (85%)");
  it.todo("Business Alignment=35% weight applied correctly");
  it.todo("Closed Won deal goes to booked, not weighted (openCount stays 0)");
  it.todo("Won (legacy stage) classified same as Closed Won — booked, not weighted");
  it.todo("Closed Lost and Dead are excluded from rawOpen, weighted, and booked");
  it.todo("byStage is sorted by weighted desc across mixed stages");
  it.todo("multiple deals in same stage aggregate raw, weighted, and count");
  it.todo("pctOfQuota = weighted / quota * 100; returns 0 when quota is 0");
  it.todo("STAGE_WEIGHTS covers all 10 OPP_STAGES (no missing stage)");
});
