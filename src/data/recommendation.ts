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

function buildCompetitorCallout(p: Prospect): Callout | null {
  const c = p.competitor || "";
  if (!c || c === "Unknown" || c === "Yext") return null;
  // "Other: X" is the canonical free-text form — strip the prefix for display
  const display = c.startsWith("Other: ") ? c.slice(7) : c;
  const severityMap: Record<string, CalloutSeverity> = {
    "SOCi": "warn",
    "Birdeye": "warn",
    "Reputation.com": "warn",
    "Uberall": "info",
    "Podium": "info",
    "Rio SEO": "info",
    "Chatmeter": "info",
  };
  return {
    kind: "competitor",
    severity: severityMap[display] ?? "info",
    text: `On ${display}`,
  };
}

function buildSuggestedAction(
  p: Prospect,
  callouts: Callout[],
  score: number,
  daysSinceLastTouch: number | null,
): string {
  const kinds = new Set(callouts.map((c) => c.kind));

  if (kinds.has("hot-not-started")) {
    return "Hot prospect with zero outreach — start a first-touch sequence today.";
  }
  if (kinds.has("never-contacted") && score >= 40) {
    return `${p.name} scores ${score} but has never been contacted — open with a tailored intro.`;
  }
  if (kinds.has("stale-90")) {
    return `Reopen ${p.name} with a re-engagement email — ${daysSinceLastTouch}d of silence is past recovery without a fresh angle.`;
  }
  if (kinds.has("going-cold")) {
    return "Hot deal slipping — book a 15-minute check-in this week to keep momentum.";
  }
  if (kinds.has("no-contacts")) {
    return "No contacts on file — research the org chart and add a Champion or Decision Maker before next outreach.";
  }
  if (kinds.has("missing-decision-maker")) {
    const competitor =
      p.competitor && p.competitor !== "Unknown" && p.competitor !== "Yext"
        ? p.competitor
        : null;
    return competitor
      ? `Find and contact a VP of Marketing — competing with ${competitor} means you need exec air cover.`
      : "Find and contact a VP of Marketing or Head of Digital to anchor the deal.";
  }
  if (kinds.has("high-score-cold-priority")) {
    return `Score ${score} but marked Cold — re-evaluate priority or document why this account is parked.`;
  }
  if (kinds.has("stale-30")) {
    return `Re-engage with a relevant signal-driven touch — ${daysSinceLastTouch}d since last contact.`;
  }
  if (kinds.has("missing-champion")) {
    return "Identify a Champion inside the buying group — you're scoring well but need an internal advocate.";
  }
  if (p.outreach === "Meeting Booked") {
    return "Meeting booked — finalize agenda and pre-read 24h before.";
  }
  if (score < 20) {
    return "Low-scoring account — confirm fit before investing more cycles.";
  }
  return `Maintain cadence — ${p.name} is on track for normal follow-up.`;
}

export function getRecommendation(p: Prospect): Recommendation {
  const score = scoreProspect(p);
  const info = getScoreLabel(score);
  const contacts = p.contacts || [];
  const interactions = p.interactions || [];

  const hasDecisionMaker = contacts.some((c) => c.role === "Decision Maker");
  const hasChampion = contacts.some((c) => c.role === "Champion");

  // Mirror agingHelpers.ts:6 exactly — Math.floor / 86400000 avoids Phase 05 UTC drift bug
  const daysSinceLastTouch =
    interactions.length === 0
      ? null
      : Math.floor(
          (Date.now() -
            Math.max(
              ...interactions.map((i) => new Date(i.date).getTime()),
            )) /
            86400000,
        );

  const callouts: Callout[] = [];

  // Block 1: priority/outreach
  if (p.priority === "Hot" && p.outreach === "Not Started") {
    callouts.push({
      kind: "hot-not-started",
      severity: "critical",
      text: "Hot, not started",
    });
  }

  // Block 2: staleness — exclusive chain, only one fires
  if (daysSinceLastTouch === null && score >= 40) {
    callouts.push({
      kind: "never-contacted",
      severity: "critical",
      text: "Never contacted",
    });
  } else if (daysSinceLastTouch !== null && daysSinceLastTouch > 90) {
    callouts.push({
      kind: "stale-90",
      severity: "critical",
      text: `${daysSinceLastTouch}d stale`,
    });
  } else if (
    p.priority === "Hot" &&
    daysSinceLastTouch !== null &&
    daysSinceLastTouch > 14
  ) {
    callouts.push({
      kind: "going-cold",
      severity: "warn",
      text: "Hot going cold",
    });
  } else if (daysSinceLastTouch !== null && daysSinceLastTouch > 30) {
    callouts.push({
      kind: "stale-30",
      severity: "warn",
      text: `${daysSinceLastTouch}d since touch`,
    });
  }

  // Block 3: contact coverage — exclusive chain
  if (contacts.length === 0) {
    callouts.push({
      kind: "no-contacts",
      severity: "critical",
      text: "No contacts",
    });
  } else if (score >= 40 && !hasDecisionMaker) {
    callouts.push({
      kind: "missing-decision-maker",
      severity: "warn",
      text: "Missing Decision Maker",
    });
  } else if (score >= 60 && !hasChampion) {
    callouts.push({
      kind: "missing-champion",
      severity: "info",
      text: "Missing Champion",
    });
  }

  // Block 4: Cold priority + high score
  if (p.priority === "Cold" && score >= 60) {
    callouts.push({
      kind: "high-score-cold-priority",
      severity: "warn",
      text: "High potential, marked Cold",
    });
  }

  // Block 5: competitor
  const competitorCallout = buildCompetitorCallout(p);
  if (competitorCallout) callouts.push(competitorCallout);

  // Block 6: customer status
  if (p.status === "Customer") {
    callouts.push({
      kind: "customer",
      severity: "info",
      text: "Existing customer",
    });
  }

  // Severity sort + cap at 3
  const rank: Record<CalloutSeverity, number> = {
    critical: 0,
    warn: 1,
    info: 2,
  };
  callouts.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const topCallouts = callouts.slice(0, 3);

  return {
    score,
    scoreLabel: info.label,
    scoreShort: info.short,
    scoreColor: info.color,
    callouts: topCallouts,
    suggestedAction: buildSuggestedAction(p, topCallouts, score, daysSinceLastTouch),
    daysSinceLastTouch,
    hasDecisionMaker,
    hasChampion,
    contactCount: contacts.length,
  };
}
