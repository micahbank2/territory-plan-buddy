import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useProspects } from "@/hooks/useProspects";
import { scoreProspect, getScoreLabel, STAGES, type Prospect } from "@/data/prospects";
import { cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, Users, MessageSquare, Zap, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import yextLogoBlack from "@/assets/yext-logo-black.jpg";
import yextLogoWhite from "@/assets/yext-logo-white.jpg";

const STAGE_COLORS = [
  "hsl(225, 15%, 50%)",
  "hsl(236, 64%, 57%)",
  "hsl(38, 92%, 55%)",
  "hsl(152, 60%, 45%)",
  "hsl(270, 60%, 58%)",
  "hsl(340, 70%, 55%)",
  "hsl(152, 65%, 38%)",
  "hsl(0, 65%, 55%)",
  "hsl(225, 15%, 40%)",
];

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function InsightsPage() {
  const { data, ok } = useProspects();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const insights = useMemo(() => {
    if (!data.length) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    // Added this week
    const addedThisWeek = data.filter(
      (p) => p.createdAt && new Date(p.createdAt) >= weekAgo
    );

    // Interactions this week
    const interactionsThisWeek = data.reduce((acc, p) => {
      const recent = (p.interactions || []).filter(
        (i) => new Date(i.date) >= weekAgo
      );
      return acc + recent.length;
    }, 0);

    // Interactions this month
    const interactionsThisMonth = data.reduce((acc, p) => {
      const recent = (p.interactions || []).filter(
        (i) => new Date(i.date) >= monthAgo
      );
      return acc + recent.length;
    }, 0);

    // Stage distribution
    const stageDistribution = STAGES.map((stage, i) => ({
      name: stage,
      count: data.filter((p) => p.outreach === stage).length,
      color: STAGE_COLORS[i],
    })).filter((s) => s.count > 0);

    // Top scored untouched
    const untouched = data
      .filter((p) => !p.interactions || p.interactions.length === 0)
      .map((p) => ({ ...p, score: scoreProspect(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Overdue follow-ups
    const overdue = data.filter((p) => {
      if (!p.nextStepDate) return false;
      return new Date(p.nextStepDate) < now;
    });

    // Stale accounts (30+ days no interaction)
    const stale = data
      .filter((p) => {
        if (!p.interactions?.length) return true;
        const latest = Math.max(
          ...p.interactions.map((i) => new Date(i.date).getTime())
        );
        return now.getTime() - latest > 30 * 86400000;
      })
      .map((p) => ({ ...p, score: scoreProspect(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Industry breakdown
    const industryMap = new Map<string, number>();
    data.forEach((p) => {
      if (p.industry) industryMap.set(p.industry, (industryMap.get(p.industry) || 0) + 1);
    });
    const industryData = Array.from(industryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      addedThisWeek,
      interactionsThisWeek,
      interactionsThisMonth,
      stageDistribution,
      untouched,
      overdue,
      stale,
      industryData,
      totalProspects: data.length,
      totalWithLocations: data.filter((p) => p.locationCount && p.locationCount > 0).length,
    };
  }, [data]);

  if (!ok || !insights)
    return (
      <div className="bg-background min-h-screen px-8 pt-8 yext-grid-bg">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );

  const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number | string; sub?: string }) => (
    <div className="glass-card rounded-xl p-5 animate-fade-in-up glow-blue">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="bg-background min-h-screen text-foreground yext-grid-bg">
      {/* Yext Header */}
      <header className="yext-gradient border-b border-primary/10 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-4 h-4 text-foreground/60" />
            </button>
            <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-black text-foreground">Insights & Digest</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Prospects" value={insights.totalProspects} sub={`${insights.totalWithLocations} with location data`} />
          <StatCard icon={TrendingUp} label="Added This Week" value={insights.addedThisWeek.length} />
          <StatCard icon={MessageSquare} label="Interactions (7d)" value={insights.interactionsThisWeek} sub={`${insights.interactionsThisMonth} this month`} />
          <StatCard icon={AlertTriangle} label="Overdue Follow-ups" value={insights.overdue.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stage Distribution */}
          <div className="glass-card rounded-xl p-5 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-foreground mb-4">Pipeline by Stage</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={insights.stageDistribution}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  dataKey="count"
                  label={({ name, count }) => `${name} (${count})`}
                  labelLine={false}
                  fontSize={10}
                >
                  {insights.stageDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Industry Breakdown */}
          <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold text-foreground mb-4">Top Industries</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insights.industryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Untouched */}
          <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Top Scored — Never Contacted</h2>
            </div>
            {insights.untouched.length === 0 ? (
              <p className="text-xs text-muted-foreground">All prospects have been contacted. 🎉</p>
            ) : (
              <div className="space-y-2">
                {insights.untouched.map((p) => {
                  const info = getScoreLabel(p.score);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/prospect/${p.id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/5 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.industry || "No industry"} · {p.locationCount || 0} locs</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                        <span className="text-sm font-bold" style={{ color: info.color }}>{p.score}</span>
                        <span className="text-[10px] font-semibold" style={{ color: info.color }}>{info.short}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stale Accounts */}
          <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Stale Accounts (30+ days)</h2>
            </div>
            {insights.stale.length === 0 ? (
              <p className="text-xs text-muted-foreground">No stale accounts. Keep it up! 💪</p>
            ) : (
              <div className="space-y-2">
                {insights.stale.map((p) => {
                  const info = getScoreLabel(p.score);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/prospect/${p.id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-primary/5 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.interactions?.length
                            ? `Last: ${relativeTime(p.interactions[p.interactions.length - 1].date)}`
                            : "Never contacted"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                        <span className="text-sm font-bold" style={{ color: info.color }}>{p.score}</span>
                        <span className="text-[10px] font-semibold" style={{ color: info.color }}>{info.short}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Follow-ups */}
        {insights.overdue.length > 0 && (
          <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-[hsl(var(--warning))]/10">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Overdue Follow-ups</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.overdue.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/prospect/${p.id}`)}
                  className="p-3 rounded-lg border border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5 hover:bg-[hsl(var(--warning))]/10 transition-colors text-left"
                >
                  <div className="text-xs font-semibold text-foreground">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{p.nextStep}</div>
                  <div className="text-[10px] text-destructive mt-1 overdue-flag">Due: {p.nextStepDate}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
