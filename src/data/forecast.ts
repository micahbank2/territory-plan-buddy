import type { Opportunity } from "@/hooks/useOpportunities";

export type StageClassification = "open" | "booked" | "lost";

export interface StageWeight {
  stage: string;
  weight: number;        // 0..1
  classification: StageClassification;
}

export const STAGE_WEIGHTS: Record<string, StageWeight> = {
  "Develop":             { stage: "Develop",             weight: 0.10, classification: "open" },
  "Discovery":           { stage: "Discovery",           weight: 0.20, classification: "open" },
  "Business Alignment":  { stage: "Business Alignment",  weight: 0.35, classification: "open" },
  "Validate":            { stage: "Validate",            weight: 0.50, classification: "open" },
  "Propose":             { stage: "Propose",             weight: 0.70, classification: "open" },
  "Negotiate":           { stage: "Negotiate",           weight: 0.85, classification: "open" },
  "Won":                 { stage: "Won",                 weight: 1.00, classification: "booked" },
  "Closed Won":          { stage: "Closed Won",          weight: 1.00, classification: "booked" },
  "Closed Lost":         { stage: "Closed Lost",         weight: 0,    classification: "lost" },
  "Dead":                { stage: "Dead",                weight: 0,    classification: "lost" },
};

export const STAGE_BAR_COLORS: Record<string, string> = {
  "Develop":            "bg-slate-400",
  "Discovery":          "bg-blue-500",
  "Business Alignment": "bg-indigo-500",
  "Validate":           "bg-violet-500",
  "Propose":            "bg-amber-500",
  "Negotiate":          "bg-orange-500",
  "Won":                "bg-emerald-500",
  "Closed Won":         "bg-emerald-500",
};

export interface ByStage {
  stage: string;
  count: number;
  raw: number;             // sum of potential_value for this stage
  weighted: number;        // sum of potential_value * weight for this stage
  weight: number;
  classification: StageClassification;
}

export interface Forecast {
  rawOpen: number;          // sum of potential_value across "open" stages only
  weighted: number;         // sum of weighted contributions across "open" stages only
  booked: number;           // sum of potential_value across "booked" stages (Won + Closed Won)
  openCount: number;        // count of opps in "open" stages
  byStage: ByStage[];       // every stage that has at least one opp, sorted by weighted desc
  pctOfQuota: number;       // weighted / quota * 100; 0 if quota <= 0
}

export function forecastPipeline(opps: Opportunity[], quota: number): Forecast {
  return {
    rawOpen: 0,
    weighted: 0,
    booked: 0,
    openCount: 0,
    byStage: [],
    pctOfQuota: 0,
  };
}
