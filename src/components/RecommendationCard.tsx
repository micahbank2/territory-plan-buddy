import { useMemo } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRecommendation,
  type CalloutSeverity,
  type Callout,
} from "@/data/recommendation";
import type { Prospect } from "@/data/prospects";

interface RecommendationCardProps {
  prospect: Prospect;
  compact?: boolean;
}

const severityClass: Record<CalloutSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

function CalloutChip({ c }: { c: Callout }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold",
        severityClass[c.severity],
      )}
    >
      {c.text}
    </span>
  );
}

export function RecommendationCard({ prospect, compact = false }: RecommendationCardProps) {
  const rec = useMemo(() => getRecommendation(prospect), [prospect]);
  const isEmpty = rec.callouts.length === 0;
  return (
    <div
      data-testid="recommendation-card"
      className={cn(
        "rounded-lg border border-border bg-card/40 backdrop-blur-sm p-3 space-y-2",
        compact && "p-2 space-y-1.5",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Why call this account
        </span>
        <span
          className="ml-auto text-[10px] font-bold"
          style={{ color: rec.scoreColor }}
        >
          {rec.score} · {rec.scoreLabel}
        </span>
      </div>
      {!isEmpty && (
        <div className="flex flex-wrap gap-1.5">
          {rec.callouts.map((c) => (
            <CalloutChip key={c.kind} c={c} />
          ))}
        </div>
      )}
      <p
        className={cn(
          "text-xs text-foreground/90 leading-snug",
          compact && "text-[11px]",
        )}
      >
        {rec.suggestedAction}
      </p>
    </div>
  );
}
