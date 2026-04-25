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

// Cold-to-hot funnel gradient — adjacent stages use non-adjacent hues so a
// segmented bar reads as distinct bands instead of one purple smear.
export const STAGE_BAR_COLORS: Record<string, string> = {
  "Develop":            "bg-slate-400",   // early: cold grey
  "Discovery":          "bg-sky-500",     // cyan
  "Business Alignment": "bg-teal-500",    // greenish-blue (jumps away from sky)
  "Validate":           "bg-lime-500",    // yellow-green (mid-funnel signal)
  "Propose":            "bg-amber-500",   // yellow-orange (getting hot)
  "Negotiate":          "bg-orange-500",  // hot
  "Won":                "bg-emerald-500", // booked
  "Closed Won":         "bg-emerald-500", // booked
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
  const buckets = new Map<string, ByStage>();

  for (const o of opps) {
    const stage = o.stage || "Develop";
    const cfg = STAGE_WEIGHTS[stage];
    const weight = cfg?.weight ?? 0;
    const classification: StageClassification = cfg?.classification ?? "open";
    const acv = o.potential_value || 0;

    if (!buckets.has(stage)) {
      buckets.set(stage, { stage, count: 0, raw: 0, weighted: 0, weight, classification });
    }
    const b = buckets.get(stage)!;
    b.count += 1;
    b.raw += acv;
    b.weighted += Math.round(acv * weight);
  }

  const byStage = Array.from(buckets.values()).sort((a, b) => b.weighted - a.weighted);

  let rawOpen = 0, weighted = 0, booked = 0, openCount = 0;
  for (const b of byStage) {
    if (b.classification === "open")   { rawOpen += b.raw; weighted += b.weighted; openCount += b.count; }
    if (b.classification === "booked") { booked  += b.raw; }
  }

  const pctOfQuota = quota > 0 ? (weighted / quota) * 100 : 0;

  return { rawOpen, weighted, booked, openCount, byStage, pctOfQuota };
}
