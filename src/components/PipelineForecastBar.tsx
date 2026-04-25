import { useMemo } from "react";
import { TrendingUp, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { forecastPipeline, STAGE_BAR_COLORS } from "@/data/forecast";
import type { Opportunity } from "@/hooks/useOpportunities";
import { FY27_MONTHS, DEFAULT_QUOTAS, ENTRIES_KEY } from "@/data/myNumbers/storage";

function loadAnnualQuota(): number {
  try {
    const stored = localStorage.getItem(ENTRIES_KEY);
    if (stored) {
      const entries: Array<{ month: string; incrementalQuota: number }> = JSON.parse(stored);
      const sum = entries.reduce((s, e) => s + (e.incrementalQuota ?? 0), 0);
      if (sum > 0) return sum;
    }
  } catch {}
  return FY27_MONTHS.reduce((s, m) => s + (DEFAULT_QUOTAS[m] ?? 0), 0);
}

interface PipelineForecastBarProps {
  opportunities: Opportunity[];
}

export function PipelineForecastBar({ opportunities }: PipelineForecastBarProps) {
  const quota = useMemo(() => loadAnnualQuota(), []);
  const f = useMemo(() => forecastPipeline(opportunities, quota), [opportunities, quota]);

  const openByStage = f.byStage.filter(b => b.classification === "open" && b.weighted > 0);
  const totalSegmentWeight = openByStage.reduce((s, b) => s + b.weighted, 0) || 1;

  if (f.openCount === 0) {
    return (
      <div data-testid="pipeline-forecast-bar" className="rounded-lg border border-border bg-muted/30 p-4 text-center">
        <TrendingUp className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground opacity-60" />
        <div className="text-sm font-semibold text-foreground">No active pipeline</div>
        <div className="text-xs text-muted-foreground mt-0.5">Add a deal to see your weighted forecast.</div>
      </div>
    );
  }

  const pctClamp = Math.min(f.pctOfQuota, 100);
  const pctColor =
    f.pctOfQuota >= 100 ? "bg-emerald-500" :
    f.pctOfQuota >= 70  ? "bg-amber-500"   :
    "bg-primary";

  return (
    <div data-testid="pipeline-forecast-bar" className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      {/* Headline row — 2-col grid on mobile, flex w/ dividers on sm+ */}
      <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 sm:flex-wrap">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Weighted Pipeline
          </div>
          <div className="text-2xl font-black font-mono text-primary">${f.weighted.toLocaleString()}</div>
        </div>
        <div className="w-px h-10 bg-border hidden sm:block" />
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw Open</div>
          <div className="text-xl font-black font-mono text-foreground">${f.rawOpen.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{f.openCount} deal{f.openCount !== 1 ? "s" : ""}</div>
        </div>
        {f.booked > 0 && (
          <>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked</div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">${f.booked.toLocaleString()}</div>
            </div>
          </>
        )}
        <div className="sm:ml-auto sm:text-right">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 sm:justify-end">
            <Target className="w-3 h-3" /> % of FY27 Quota
          </div>
          <div className="text-xl font-black font-mono text-foreground">{f.pctOfQuota.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Quota: ${quota.toLocaleString()}</div>
        </div>
      </div>

      {/* Quota progress strip */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", pctColor)}
          style={{ width: `${pctClamp}%` }}
        />
      </div>

      {/* Segmented stage bar */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline by Stage</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {openByStage.map((b) => {
            const widthPct = (b.weighted / totalSegmentWeight) * 100;
            return (
              <Tooltip key={b.stage}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      STAGE_BAR_COLORS[b.stage] ?? "bg-slate-400",
                    )}
                    style={{ width: `${widthPct}%` }}
                    aria-label={`${b.stage}: ${b.count} deals, $${b.weighted.toLocaleString()} weighted (${(b.weight * 100).toFixed(0)}%)`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">{b.stage}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.count} deal{b.count !== 1 ? "s" : ""} · ${b.weighted.toLocaleString()} ({(b.weight * 100).toFixed(0)}%)
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {openByStage.map((b) => (
            <span key={b.stage} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn("inline-block w-2 h-2 rounded-sm", STAGE_BAR_COLORS[b.stage] ?? "bg-slate-400")} />
              {b.stage} · ${b.weighted.toLocaleString()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
