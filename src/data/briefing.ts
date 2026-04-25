import type { Prospect } from "@/data/prospects";
import type { Opportunity } from "@/hooks/useOpportunities";

export interface BriefingItem {
  prospectId: string;
  name: string;
  reason: string;
  score: number;
  daysStale: number | null;
}

export interface OverdueTaskItem {
  prospectId: string;
  prospectName: string;
  taskId: string;
  text: string;
  dueDate: string;
  daysOverdue: number;
}

export interface OppMovementItem {
  oppId: string;
  name: string;
  stage: string;
  potentialValue: number;
  daysSinceCreated: number;
  prospectId: string | null;
}

export interface Briefing {
  generatedAt: string;
  todayLabel: string;
  hero: {
    activeProspects: number;
    hotCount: number;
    weightedPipeline: number;
    overdueTaskCount: number;
  };
  todayPlan: BriefingItem[];
  overdueTasks: OverdueTaskItem[];
  goingStale: BriefingItem[];
  newPipeline: OppMovementItem[];
  inboxZero: boolean;
}

export function getBriefing(
  prospects: Prospect[],
  opportunities: Opportunity[],
  today: Date,
): Briefing {
  // Stub — Task 2 fills in the engine. Touching `prospects`/`opportunities` to
  // keep the parameters live for type-checking and to avoid lint flags.
  void prospects;
  void opportunities;
  return {
    generatedAt: today.toISOString(),
    todayLabel: today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    hero: {
      activeProspects: 0,
      hotCount: 0,
      weightedPipeline: 0,
      overdueTaskCount: 0,
    },
    todayPlan: [],
    overdueTasks: [],
    goingStale: [],
    newPipeline: [],
    inboxZero: true,
  };
}
