import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getScoreLabel, scoreBreakdown, type Prospect } from "@/data/prospects";

export function ScoreBadge({
  score,
  prospect,
  compact = false,
}: {
  score: number;
  prospect?: Prospect;
  compact?: boolean;
}) {
  const info = getScoreLabel(score);
  const breakdown = prospect ? scoreBreakdown(prospect) : [];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
            <span className="font-bold text-foreground">{score}</span>
            {!compact && (
              <span className="text-[10px] font-semibold" style={{ color: info.color }}>
                {info.short}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" align="center" collisionPadding={16} className="text-xs max-w-[220px] p-3 z-[100]">
          <p className="font-bold mb-1.5" style={{ color: info.color }}>
            {info.label} — {score} pts
          </p>
          {breakdown.length > 0 ? (
            <div className="space-y-0.5 border-t border-border pt-1.5 mb-1.5">
              {breakdown.map((b, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className={cn("font-bold", b.value >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>
                    {b.value > 0 ? "+" : ""}
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mb-1.5">No scoring factors detected.</p>
          )}
          <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5">
            Higher scores are prioritized in Action Items & Insights.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
