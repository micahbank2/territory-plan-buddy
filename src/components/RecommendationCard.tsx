import { useMemo } from "react";
import { getRecommendation } from "@/data/recommendation";
import type { Prospect } from "@/data/prospects";

interface RecommendationCardProps {
  prospect: Prospect;
  compact?: boolean;
}

export function RecommendationCard({ prospect }: RecommendationCardProps) {
  const rec = useMemo(() => getRecommendation(prospect), [prospect]);
  return (
    <div
      data-testid="recommendation-card"
      className="rounded-lg border border-border bg-card/40 backdrop-blur-sm p-3"
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Why call this account
      </span>
      <p className="text-xs">{rec.suggestedAction}</p>
    </div>
  );
}
