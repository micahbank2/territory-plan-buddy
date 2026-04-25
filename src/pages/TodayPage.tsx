import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProspects } from "@/hooks/useProspects";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTerritories } from "@/hooks/useTerritories";
import { getScoreLabel, getLogoUrl, type Prospect } from "@/data/prospects";
import { getBriefing } from "@/data/briefing";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  ArrowLeft, AlertTriangle, Clock, BarChart3, Building2,
  CheckCircle, ChevronRight, Sparkles, TrendingUp, Target,
} from "lucide-react";

export default function TodayPage() {
  const navigate = useNavigate();
  const { activeTerritory } = useTerritories();
  const { data, ok } = useProspects(activeTerritory ?? undefined);
  const { opportunities } = useOpportunities(activeTerritory);

  // Capture today once on mount — Pitfall 4: prevents re-running engine on every render
  const now = useMemo(() => new Date(), []);
  const briefing = useMemo(
    () => getBriefing(data, opportunities, now),
    [data, opportunities, now],
  );

  if (!ok) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <div data-no-print className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight">Today</h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{briefing.todayLabel}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 relative z-10">

        {/* Hero metrics row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Active" value={briefing.hero.activeProspects} />
          <Stat label="Hot" value={briefing.hero.hotCount} accent="primary" />
          <Stat
            label="Weighted Pipeline"
            value={
              briefing.hero.weightedPipeline >= 1000
                ? `$${(briefing.hero.weightedPipeline / 1000).toFixed(0)}k`
                : `$${briefing.hero.weightedPipeline.toLocaleString()}`
            }
            accent="primary"
          />
          <Stat
            label="Overdue"
            value={briefing.hero.overdueTaskCount}
            accent={briefing.hero.overdueTaskCount > 0 ? "destructive" : "default"}
          />
        </section>

        {/* Inbox-zero celebration — only shown when prospects exist AND nothing actionable */}
        {briefing.inboxZero && data.length > 0 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-base font-semibold">Inbox zero.</p>
            <p className="text-sm text-muted-foreground">Nothing demands action today. Go close some deals.</p>
          </div>
        )}

        {/* Today's Plan — Hot prospects with no recent contact */}
        {briefing.todayPlan.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Today's Plan</h2>
              <span className="ml-1 text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                {briefing.todayPlan.length}
              </span>
            </div>
            <div className="grid gap-2">
              {briefing.todayPlan.map((item) => {
                const prospect = data.find((p) => String(p.id) === item.prospectId);
                const scoreInfo = getScoreLabel(item.score);
                return (
                  <button
                    key={item.prospectId}
                    onClick={() => navigate(`/prospect/${item.prospectId}`)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                  >
                    {prospect ? <ProspectLogo prospect={prospect} /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">{item.name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.reason}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={cn("text-xs font-bold", scoreInfo.color)}>{item.score}</div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Overdue Tasks — flat list (engine already sorted oldest-first, capped at 10) */}
        {briefing.overdueTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-base font-bold">Overdue Tasks</h2>
              <span className="ml-1 text-xs bg-destructive/10 text-destructive font-semibold px-2 py-0.5 rounded-full">
                {briefing.hero.overdueTaskCount}
              </span>
              {briefing.hero.overdueTaskCount > briefing.overdueTasks.length && (
                <span className="text-xs text-muted-foreground">showing top {briefing.overdueTasks.length}</span>
              )}
            </div>
            <div className="grid gap-2">
              {briefing.overdueTasks.map((task) => {
                const prospect = data.find((p) => String(p.id) === task.prospectId);
                return (
                  <button
                    key={`${task.prospectId}-${task.taskId}`}
                    onClick={() => navigate(`/prospect/${task.prospectId}`)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                  >
                    {prospect ? <ProspectLogo prospect={prospect} /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-semibold group-hover:text-primary transition-colors">{task.prospectName}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-foreground">{task.text}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs bg-destructive/10 text-destructive font-semibold px-2 py-0.5 rounded">
                      {task.daysOverdue}d overdue
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Going Stale — Hot/Warm with 30+d staleness and score>=40 */}
        {briefing.goingStale.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold">Going Stale</h2>
              <span className="ml-1 text-xs bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded-full">
                {briefing.goingStale.length}
              </span>
            </div>
            <div className="grid gap-2">
              {briefing.goingStale.map((item) => {
                const prospect = data.find((p) => String(p.id) === item.prospectId);
                const scoreInfo = getScoreLabel(item.score);
                return (
                  <button
                    key={item.prospectId}
                    onClick={() => navigate(`/prospect/${item.prospectId}`)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                  >
                    {prospect ? <ProspectLogo prospect={prospect} /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">{item.name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.reason}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-bold", scoreInfo.color)}>{item.score} ({scoreInfo.short})</div>
                      <div className="text-xs text-muted-foreground">
                        {item.daysStale != null ? `${item.daysStale}d since touch` : "Never touched"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* New Pipeline This Week — opps created in last 7 days */}
        {briefing.newPipeline.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold">New Pipeline This Week</h2>
              <span className="ml-1 text-xs bg-emerald-500/10 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                {briefing.newPipeline.length}
              </span>
            </div>
            <div className="grid gap-2">
              {briefing.newPipeline.map((opp) => (
                <button
                  key={opp.oppId}
                  onClick={() => opp.prospectId && navigate(`/prospect/${opp.prospectId}`)}
                  className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                >
                  <Target className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">{opp.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{opp.stage}</span>
                      {opp.potentialValue > 0 && <span>· ${(opp.potentialValue / 1000).toFixed(0)}k</span>}
                      <span>· {opp.daysSinceCreated === 0 ? "today" : `${opp.daysSinceCreated}d ago`}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — no prospects at all (distinct from inbox-zero) */}
        {data.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-base font-semibold">No prospects yet.</p>
            <p className="text-sm text-muted-foreground">Add your first prospect to start your morning briefing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProspectLogo({ prospect }: { prospect: Prospect }) {
  const url = prospect.website ? getLogoUrl(normalizeUrl(prospect.website), 32) : null;
  if (prospect.customLogo) {
    return <img src={prospect.customLogo} alt="" className="w-6 h-6 rounded object-contain bg-white" />;
  }
  if (url) {
    return <img src={url} alt="" className="w-6 h-6 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return <Building2 className="w-5 h-5 text-muted-foreground" />;
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: number | string;
  accent?: "default" | "primary" | "destructive";
}) {
  const colorClass =
    accent === "primary"
      ? "text-primary"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-black font-mono mt-0.5", colorClass)}>{value}</div>
    </div>
  );
}
