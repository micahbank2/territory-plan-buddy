import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, DollarSign, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuotaSummary {
  monthBooked: number;
  monthQuota: number;
  qBooked: number;
  qQuota: number;
  ytdBooked: number;
  ytdQuota: number;
  ytdRenewed: number;
  totalPipeline: number;
  fmtK: (n: number) => string;
  settings: { u4r?: number } & Record<string, any>;
}

export interface TerritoryStatsHeaderProps {
  stats: {
    t: number;
    o100: number;
    o500: number;
    prospects: number;
    ch: number;
  };
  fLocRange: [number, number];
  fStatusList: string[];
  onClearAll: () => void;
  onToggleLocRange: (val: 100 | 500) => void;
  onToggleStatus: (val: "Prospect" | "Churned") => void;
  canManageTerritory: boolean;
  openOpportunitiesCount: number;
  quotaSummary: QuotaSummary;
}

export function TerritoryStatsHeader({
  stats,
  fLocRange,
  fStatusList,
  onClearAll,
  onToggleLocRange,
  onToggleStatus,
  canManageTerritory,
  openOpportunitiesCount,
  quotaSummary,
}: TerritoryStatsHeaderProps) {
  const navigate = useNavigate();

  const pills: [string, number, () => void, boolean][] = [
    ["📊 Total Accounts", stats.t, onClearAll, false],
    ["📍 100+ Locs", stats.o100, () => onToggleLocRange(100), fLocRange[0] === 100],
    ["🏢 500+ Locs", stats.o500, () => onToggleLocRange(500), fLocRange[0] === 500],
    ["🎯 Prospects", stats.prospects, () => onToggleStatus("Prospect"), fStatusList.includes("Prospect")],
    ["💀 Churned", stats.ch, () => onToggleStatus("Churned"), fStatusList.includes("Churned")],
  ];

  const { monthBooked, monthQuota, qBooked, qQuota, ytdBooked, ytdQuota, ytdRenewed, totalPipeline, fmtK, settings } =
    quotaSummary;
  const monthPct = monthQuota > 0 ? monthBooked / monthQuota : 0;
  const qPct = qQuota > 0 ? qBooked / qQuota : 0;
  const ytdPct = ytdQuota > 0 ? ytdBooked / ytdQuota : 0;
  const pctColor = (p: number) =>
    p >= 1 ? "text-emerald-500" : p >= 0.5 ? "text-amber-500" : "text-muted-foreground";
  const barColor = (p: number) =>
    p >= 1 ? "bg-emerald-500" : p >= 0.5 ? "bg-amber-500" : "bg-red-400";
  const u4r = settings?.u4r ?? 0;
  const renewPct = u4r > 0 ? ytdRenewed / u4r : 0;
  const renewBarColor =
    renewPct >= 0.86 ? "bg-emerald-500" : renewPct >= 0.6 ? "bg-amber-500" : "bg-red-400";
  const renewPctColor =
    renewPct >= 0.86 ? "text-emerald-500" : renewPct >= 0.6 ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className="px-4 sm:px-8 pt-6 pb-2">
      <div className="flex items-center gap-2.5 mb-6 overflow-x-auto scrollbar-hide flex-nowrap pb-1">
        {pills.map(([label, value, fn, active], i) => (
          <button
            key={i}
            onClick={() => fn()}
            className={cn(
              "flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl glass-card cursor-pointer group animate-fade-in-up shrink-0",
              active ? "ring-2 ring-primary/50 glow-blue" : "glow-blue"
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors font-medium whitespace-nowrap">
              {label}
            </span>
            <span
              className="text-lg sm:text-xl font-black text-foreground animate-count-up"
              style={{ animationDelay: `${i * 50 + 200}ms` }}
            >
              {value}
            </span>
          </button>
        ))}
      </div>

      {canManageTerritory && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => navigate("/my-numbers")}
            className="rounded-xl border-2 border-blue-500/20 p-5 bg-gradient-to-br from-blue-500/15 to-blue-500/5 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
              <Target className="w-5 h-5" /> CLOSED WON THIS MONTH
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">
              {fmtK(monthBooked)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(monthQuota)} quota</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor(monthPct))}
                  style={{ width: `${Math.min(monthPct * 100, 100)}%` }}
                />
              </div>
              <span className={cn("text-sm font-black font-mono", pctColor(monthPct))}>
                {Math.round(monthPct * 100)}%
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate("/my-numbers")}
            className="rounded-xl border-2 border-violet-500/20 p-5 bg-gradient-to-br from-violet-500/15 to-violet-500/5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-sm font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">
              <TrendingUp className="w-5 h-5" /> CLOSED WON THIS QUARTER
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">
              {fmtK(qBooked)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(qQuota)} quota</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor(qPct))}
                  style={{ width: `${Math.min(qPct * 100, 100)}%` }}
                />
              </div>
              <span className={cn("text-sm font-black font-mono", pctColor(qPct))}>
                {Math.round(qPct * 100)}%
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate("/my-numbers")}
            className="rounded-xl border-2 border-emerald-500/20 p-5 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
              <DollarSign className="w-5 h-5" /> CLOSED WON YTD
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">
              {fmtK(ytdBooked)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(ytdQuota)} annual quota</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor(ytdPct))}
                  style={{ width: `${Math.min(ytdPct * 100, 100)}%` }}
                />
              </div>
              <span className={cn("text-sm font-black font-mono", pctColor(ytdPct))}>
                {Math.round(ytdPct * 100)}%
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate("/opportunities")}
            className="rounded-xl border-2 border-amber-500/20 p-5 bg-gradient-to-br from-amber-500/15 to-amber-500/5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">
              <BarChart3 className="w-5 h-5" /> ACTIVE PIPELINE
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">
              {fmtK(totalPipeline)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{openOpportunitiesCount} open deals</p>
            <div className="mt-3 h-2.5" />
          </button>

          <button
            onClick={() => navigate("/my-numbers")}
            className="rounded-xl border-2 border-teal-500/20 p-5 bg-gradient-to-br from-teal-500/15 to-teal-500/5 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-sm font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-2">
              <ShieldCheck className="w-5 h-5" /> ACV RENEWED
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">
              {fmtK(ytdRenewed)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(u4r)} U4R</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", renewBarColor)}
                  style={{ width: `${Math.min(renewPct * 100, 100)}%` }}
                />
              </div>
              <span className={cn("text-sm font-black font-mono", renewPctColor)}>
                {Math.round(renewPct * 100)}%
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
