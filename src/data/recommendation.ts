import { scoreProspect, getScoreLabel, type Prospect } from "@/data/prospects";

export type CalloutSeverity = "info" | "warn" | "critical";

export type CalloutKind =
  | "missing-decision-maker"
  | "missing-champion"
  | "no-contacts"
  | "never-contacted"
  | "stale-30"
  | "stale-90"
  | "going-cold"
  | "competitor"
  | "hot-not-started"
  | "high-score-cold-priority"
  | "customer";

export interface Callout {
  kind: CalloutKind;
  severity: CalloutSeverity;
  text: string;
}

export interface Recommendation {
  score: number;
  scoreLabel: string;
  scoreShort: string;
  scoreColor: string;
  callouts: Callout[];
  suggestedAction: string;
  daysSinceLastTouch: number | null;
  hasDecisionMaker: boolean;
  hasChampion: boolean;
  contactCount: number;
}

export function getRecommendation(p: Prospect): Recommendation {
  const score = scoreProspect(p);
  const info = getScoreLabel(score);
  return {
    score,
    scoreLabel: info.label,
    scoreShort: info.short,
    scoreColor: info.color,
    callouts: [],
    suggestedAction: `Stub recommendation for ${p.name}`,
    daysSinceLastTouch: null,
    hasDecisionMaker: false,
    hasChampion: false,
    contactCount: 0,
  };
}
