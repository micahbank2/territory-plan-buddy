import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { forecastPipeline } from "@/data/forecast";
import type { Opportunity } from "@/hooks/useOpportunities";

interface PipelineForecastBarProps {
  opportunities: Opportunity[];
}

export function PipelineForecastBar({ opportunities }: PipelineForecastBarProps) {
  const f = useMemo(() => forecastPipeline(opportunities, 0), [opportunities]);
  return (
    <div data-testid="pipeline-forecast-bar" className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">Pipeline forecast (stub) — opps: {opportunities.length}, weighted: ${f.weighted}</span>
      </div>
    </div>
  );
}
