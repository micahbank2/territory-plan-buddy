import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useProspects } from "@/hooks/useProspects";
import { useTerritories } from "@/hooks/useTerritories";
import { scoreProspect, getScoreLabel, getLogoUrl, STAGES, type Prospect } from "@/data/prospects";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  ArrowLeft, AlertTriangle, Clock, UserX, BarChart3, Building2,
  ExternalLink, CheckCircle, ChevronRight,
} from "lucide-react";
import yextLogoBlack from "@/assets/yext-logo-black.jpg";
import yextLogoWhite from "@/assets/yext-logo-white.jpg";
import { RetroGrid } from "@/components/ui/retro-grid";

function daysBetween(a: string, b: Date): number {
  return Math.floor((b.getTime() - new Date(a).getTime()) / 86400000);
}

export default function TodayPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { activeTerritory } = useTerritories();
  const { data, ok } = useProspects(activeTerritory ?? undefined);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Overdue tasks grouped by prospect
  const overdueTasks = useMemo(() => {
    const results: { prospect: Prospect; tasks: { id: string; text: string; dueDate: string }[] }[] = [];
    for (const p of data) {
      const overdue = (p.tasks || []).filter(
        (t) => t.dueDate && t.dueDate < todayStr
      );
      if (overdue.length > 0) {
        results.push({
          prospect: p,
          tasks: overdue.map((t) => ({ id: t.id, text: t.text, dueDate: t.dueDate! })),
        });
      }
    }
    return results.sort((a, b) => b.tasks.length - a.tasks.length);
  }, [data, todayStr]);

  // 2. Stale high-priority: score 40+, not touched in 30+ days
  const staleHighPriority = useMemo(() => {
    return data
      .filter((p) => {
        const score = scoreProspect(p);
        if (score < 40) return false;
        if (!p.lastTouched) return true;
        return daysBetween(p.lastTouched, now) >= 30;
      })
      .sort((a, b) => scoreProspect(b) - scoreProspect(a));
  }, [data]);

  // 3. Never contacted: zero interactions, top 5 by score
  const neverContacted = useMemo(() => {
    return data
      .filter((p) => !p.interactions || p.interactions.length === 0)
      .sort((a, b) => scoreProspect(b) - scoreProspect(a))
      .slice(0, 5);
  }, [data]);

  // 4. Pipeline summary: count by outreach stage
  const pipelineSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of STAGES) counts[stage] = 0;
    for (const p of data) {
      const stage = p.outreach || "Not Started";
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return STAGES.map((stage) => ({ stage, count: counts[stage] || 0 }));
  }, [data]);

  const totalOverdue = overdueTasks.reduce((sum, g) => sum + g.tasks.length, 0);

  if (!ok) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <RetroGrid className="fixed inset-0 pointer-events-none opacity-30" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-5 object-contain" />
              <h1 className="text-lg font-bold tracking-tight">Today</h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 relative z-10">

        {/* Section 1: Overdue Tasks */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-bold">Overdue Tasks</h2>
            {totalOverdue > 0 && (
              <span className="ml-1 text-xs bg-destructive/10 text-destructive font-semibold px-2 py-0.5 rounded-full">{totalOverdue}</span>
            )}
          </div>
          {overdueTasks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              All caught up — no overdue tasks.
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.map(({ prospect, tasks }) => (
                <div key={prospect.id} className="bg-card border border-border rounded-lg p-4">
                  <button
                    onClick={() => navigate(`/prospect/${prospect.id}`)}
                    className="flex items-center gap-2 mb-2 group"
                  >
                    <ProspectLogo prospect={prospect} />
                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">{prospect.name}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <div className="space-y-1.5 pl-7">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="text-destructive font-medium text-xs">
                          {daysBetween(t.dueDate, now)}d overdue
                        </span>
                        <span className="text-foreground">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Stale High-Priority */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">Stale High-Priority Accounts</h2>
            {staleHighPriority.length > 0 && (
              <span className="ml-1 text-xs bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded-full">{staleHighPriority.length}</span>
            )}
          </div>
          {staleHighPriority.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              No high-scoring accounts are going stale.
            </div>
          ) : (
            <div className="grid gap-2">
              {staleHighPriority.map((p) => {
                const score = scoreProspect(p);
                const scoreInfo = getScoreLabel(score);
                const staleDays = p.lastTouched ? daysBetween(p.lastTouched, now) : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/prospect/${p.id}`)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                  >
                    <ProspectLogo prospect={p} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">{p.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{p.industry || "—"}</span>
                        {p.locationCount != null && <span>· {p.locationCount} locs</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-bold", scoreInfo.color)}>{score} ({scoreInfo.label})</div>
                      <div className="text-xs text-muted-foreground">
                        {staleDays != null ? `${staleDays}d since touch` : "Never touched"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Never Contacted */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserX className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold">Never Contacted</h2>
            <span className="text-xs text-muted-foreground">Top 5 by score</span>
          </div>
          {neverContacted.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Every prospect has at least one interaction.
            </div>
          ) : (
            <div className="grid gap-2">
              {neverContacted.map((p) => {
                const score = scoreProspect(p);
                const scoreInfo = getScoreLabel(score);
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/prospect/${p.id}`)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-all text-left w-full group"
                  >
                    <ProspectLogo prospect={p} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">{p.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{p.industry || "—"}</span>
                        {p.locationCount != null && <span>· {p.locationCount} locs</span>}
                        {p.competitor && <span>· vs {p.competitor}</span>}
                      </div>
                    </div>
                    <div className={cn("text-xs font-bold shrink-0", scoreInfo.color)}>{score}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: Pipeline Summary */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Pipeline Summary</h2>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="space-y-2.5">
              {pipelineSummary.map(({ stage, count }) => {
                const maxCount = Math.max(...pipelineSummary.map((s) => s.count), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 shrink-0 text-right">{stage}</span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground text-right">
              {data.length} total prospects
            </div>
          </div>
        </section>
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
