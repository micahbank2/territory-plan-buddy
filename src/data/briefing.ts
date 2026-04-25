import type { Prospect } from "@/data/prospects";
import type { Opportunity } from "@/hooks/useOpportunities";
import { scoreProspect } from "@/data/prospects";
import { forecastPipeline } from "@/data/forecast";

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

const daysBetween = (iso: string, today: Date): number =>
  Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000);

export function getBriefing(
  prospects: Prospect[],
  opportunities: Opportunity[],
  today: Date,
): Briefing {
  const todayStr = today.toISOString().split("T")[0];

  // 1. Active filter — exclude churned and closed-lost prospect noise everywhere
  const active = prospects.filter(
    (p) => p.status !== "Churned" && p.status !== "Closed Lost Prospect",
  );

  // 2. Today's Plan — Hot prospects either never contacted OR > 14 days stale
  const todayPlan: BriefingItem[] = active
    .filter((p) => p.priority === "Hot")
    .filter(
      (p) => p.lastTouched == null || daysBetween(p.lastTouched, today) >= 14,
    )
    .map((p) => {
      const score = scoreProspect(p);
      const daysStale =
        p.lastTouched == null ? null : daysBetween(p.lastTouched, today);
      const reason =
        daysStale == null
          ? `Hot · never contacted · score ${score}`
          : `Hot · ${daysStale}d since touch · score ${score}`;
      return {
        prospectId: String(p.id),
        name: p.name,
        reason,
        score,
        daysStale,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 3. Overdue Tasks — flatten across active prospects, then sort + cap
  const overdueAll: OverdueTaskItem[] = [];
  for (const p of active) {
    for (const t of p.tasks || []) {
      if (!t.dueDate || t.dueDate >= todayStr) continue;
      overdueAll.push({
        prospectId: String(p.id),
        prospectName: p.name,
        taskId: t.id,
        text: t.text,
        dueDate: t.dueDate,
        daysOverdue: daysBetween(t.dueDate, today),
      });
    }
  }
  overdueAll.sort((a, b) => b.daysOverdue - a.daysOverdue);
  const overdueTasks = overdueAll.slice(0, 10);

  // 4. Going Stale — Hot/Warm + lastTouched non-null + 30d+ + score>=40
  const goingStale: BriefingItem[] = active
    .filter((p) => p.priority === "Hot" || p.priority === "Warm")
    .filter(
      (p) => p.lastTouched != null && daysBetween(p.lastTouched, today) >= 30,
    )
    .map((p) => {
      const score = scoreProspect(p);
      const daysStale = daysBetween(p.lastTouched!, today);
      return {
        prospectId: String(p.id),
        name: p.name,
        reason: `${p.priority} · ${daysStale}d since touch · score ${score}`,
        score,
        daysStale,
      };
    })
    .filter((item) => item.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // 5. New Pipeline — opps with created_at in last 7 days
  const newPipeline: OppMovementItem[] = opportunities
    .filter((o) => {
      if (!o.created_at) return false;
      const days = daysBetween(o.created_at, today);
      return days >= 0 && days <= 7;
    })
    .map((o) => ({
      oppId: o.id,
      name: o.name,
      stage: o.stage,
      potentialValue: o.potential_value || 0,
      daysSinceCreated: daysBetween(o.created_at, today),
      prospectId: o.prospect_id,
    }))
    .sort((a, b) => a.daysSinceCreated - b.daysSinceCreated);

  // 6. Hero — counts + reuse weighted total from Phase 7 engine
  const forecast = forecastPipeline(opportunities, 0);
  const hero = {
    activeProspects: active.length,
    hotCount: active.filter((p) => p.priority === "Hot").length,
    weightedPipeline: forecast.weighted,
    overdueTaskCount: overdueAll.length,
  };

  // 7. Inbox zero — actionable lists empty (newPipeline is informational)
  const inboxZero =
    todayPlan.length === 0 &&
    overdueTasks.length === 0 &&
    goingStale.length === 0;

  return {
    generatedAt: today.toISOString(),
    todayLabel: today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    hero,
    todayPlan,
    overdueTasks,
    goingStale,
    newPipeline,
    inboxZero,
  };
}
