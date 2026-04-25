import React from "react";
import { Target, ShieldCheck, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompSettings } from "@/data/myNumbers/storage";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

interface SummaryCardRowProps {
  ytdTotals: {
    totalIncrBookings: number;
    totalIncrQuota: number;
    totalRenewed: number;
    totalIncrPayout: number;
    totalRenewalPayout: number;
    totalEarnings: number;
  };
  settings: CompSettings;
  incrAttainment: number;
  renewalRetention: number;
  projectedAttainment: number;
  projectedAnnual: number;
  monthlyPace: number;
}

export function SummaryCardRow({
  ytdTotals,
  settings,
  incrAttainment,
  renewalRetention,
  projectedAttainment,
  projectedAnnual,
  monthlyPace,
}: SummaryCardRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        label="YTD Incremental"
        value={fmt(ytdTotals.totalIncrBookings)}
        sub={`of ${fmt(ytdTotals.totalIncrQuota)} quota`}
        pct={incrAttainment}
        icon={<Target className="w-5 h-5" />}
        accent="from-blue-500/10 to-blue-500/5 dark:from-blue-500/15 dark:to-blue-500/5"
      />
      <SummaryCard
        label="YTD Renewal"
        value={fmt(ytdTotals.totalRenewed)}
        sub={`${pct(renewalRetention)} retention of ${fmt(settings.u4r)} U4R`}
        pct={renewalRetention / settings.retentionTarget}
        icon={<ShieldCheck className="w-5 h-5" />}
        accent="from-violet-500/10 to-violet-500/5 dark:from-violet-500/15 dark:to-violet-500/5"
      />
      <SummaryCard
        label="Est. YTD Earnings"
        value={fmt(ytdTotals.totalEarnings)}
        sub={`Incr: ${fmt(ytdTotals.totalIncrPayout)} | Ren: ${fmt(ytdTotals.totalRenewalPayout)}`}
        icon={<DollarSign className="w-5 h-5" />}
        accent="from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/15 dark:to-emerald-500/5"
      />
      <SummaryCard
        label="Annual Pace"
        value={pct(projectedAttainment)}
        sub={`${fmt(projectedAnnual)} projected (${fmt(monthlyPace)}/mo)`}
        icon={<TrendingUp className="w-5 h-5" />}
        accent="from-amber-500/10 to-amber-500/5 dark:from-amber-500/15 dark:to-amber-500/5"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  pct,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  pct?: number;
  icon: React.ReactNode;
  accent?: string;
}) {
  const accentColor = accent || "from-primary/10 to-primary/5";
  const pctColor =
    pct !== undefined
      ? pct >= 1
        ? "text-emerald-500"
        : pct >= 0.7
          ? "text-amber-500"
          : "text-red-500"
      : "";
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 bg-gradient-to-br",
        accentColor,
        "relative overflow-hidden",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-black font-mono text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className={cn("text-sm font-bold font-mono", pctColor)}>
              {Math.round(pct * 100)}% attainment
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-background/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                pct >= 1 ? "bg-emerald-500" : pct >= 0.7 ? "bg-amber-500" : "bg-red-500",
              )}
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
