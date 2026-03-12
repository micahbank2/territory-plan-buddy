import { useState } from "react";
import { Brain, CheckCircle, AlertTriangle, Lightbulb, Copy, Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect, AIReadinessData } from "@/data/prospects";

interface AIReadinessCardProps {
  prospect: Prospect;
  onUpdate: (id: any, updates: Partial<Prospect>) => void;
  compact?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-[hsl(var(--success))]",
  B: "text-primary",
  C: "text-[hsl(var(--warning))]",
  D: "text-destructive",
  F: "text-destructive",
};

const GRADE_BG: Record<string, string> = {
  A: "bg-[hsl(var(--success))]/10",
  B: "bg-primary/10",
  C: "bg-[hsl(var(--warning))]/10",
  D: "bg-destructive/10",
  F: "bg-destructive/10",
};

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

export function AIReadinessCard({ prospect, onUpdate, compact = false }: AIReadinessCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const hasResult = prospect.aiReadinessScore != null && prospect.aiReadinessGrade != null;
  const score = prospect.aiReadinessScore;
  const grade = prospect.aiReadinessGrade || "";
  const data = prospect.aiReadinessData as AIReadinessData | null;

  const analyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("ai-readiness", {
        body: {
          name: prospect.name,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          website: prospect.website,
        },
      });

      if (fnError) throw fnError;
      if (result.error) throw new Error(result.error);

      onUpdate(prospect.id, {
        aiReadinessScore: result.overall_score,
        aiReadinessGrade: result.grade,
        aiReadinessData: {
          summary: result.summary,
          strengths: result.strengths,
          risks: result.risks,
          yext_opportunity: result.yext_opportunity,
          talking_point: result.talking_point,
        },
        aiReadinessUpdatedAt: new Date().toISOString(),
      });
      toast.success("AI Readiness analysis complete!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    onUpdate(prospect.id, {
      aiReadinessScore: null,
      aiReadinessGrade: null,
      aiReadinessData: null,
      aiReadinessUpdatedAt: null,
    });
    toast.success("AI Readiness data cleared");
  };

  const copyTalkingPoint = () => {
    if (data?.talking_point) {
      navigator.clipboard.writeText(data.talking_point);
      toast.success("Talking point copied to clipboard!");
    }
  };

  if (!hasResult && !loading) {
    return (
      <div className={cn("border border-dashed border-border rounded-xl flex items-center justify-between gap-3", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">AI Search Readiness</span>
        </div>
        <Button onClick={analyze} disabled={loading} size="sm" variant="outline" className="gap-1.5">
          <Brain className="w-3.5 h-3.5" />
          Analyze
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("border border-primary/20 rounded-xl bg-primary/5 flex items-center justify-center gap-2", compact ? "p-4" : "p-6")}>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Analyzing AI search readiness...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/20 rounded-xl bg-destructive/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <Button onClick={analyze} size="sm" variant="outline">Retry</Button>
      </div>
    );
  }

  if (!hasResult || !data) return null;

  // Compact view for slide-over
  if (compact) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground uppercase">AI Readiness</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-black", GRADE_COLORS[grade])}>{score}</span>
            <span className={cn("px-2 py-0.5 text-sm font-bold rounded-md", GRADE_BG[grade], GRADE_COLORS[grade])}>{grade}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button onClick={analyze} size="sm" variant="ghost" className="h-6 text-[10px] gap-1" disabled={loading}>
                  <RefreshCw className="w-3 h-3" /> Re-analyze
                </Button>
                <Button onClick={clearResult} size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" /> Clear
                </Button>
              </div>
              {prospect.aiReadinessUpdatedAt && (
                <span className="text-[10px] text-muted-foreground">{relativeTime(prospect.aiReadinessUpdatedAt)}</span>
              )}
            </div>
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-primary uppercase flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Talking Point
                </span>
                <Button onClick={copyTalkingPoint} size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed italic">"{data.talking_point}"</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full view for prospect page
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-primary/10 to-transparent px-5 py-4 flex items-center justify-between hover:from-primary/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Search Readiness</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", GRADE_BG[grade])}>
            <span className={cn("text-3xl font-black", GRADE_COLORS[grade])}>{score}</span>
            <span className={cn("text-lg font-bold", GRADE_COLORS[grade])}>{grade}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="p-5 space-y-4 border-t border-border">
          <p className="text-sm text-foreground/80 leading-relaxed">{data.summary}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[hsl(var(--success))] uppercase flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Strengths
              </h4>
              <ul className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2 leading-relaxed">
                    <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[hsl(var(--warning))] uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Risks
              </h4>
              <ul className="space-y-1.5">
                {data.risks.map((r, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2 leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-primary uppercase">Yext Opportunity</h4>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{data.yext_opportunity}</p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Outreach Talking Point</p>
              <p className="text-sm text-foreground italic">"{data.talking_point}"</p>
            </div>
            <Button onClick={copyTalkingPoint} size="sm" variant="outline" className="ml-4 gap-1.5 shrink-0">
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Button onClick={analyze} size="sm" variant="ghost" className="text-xs gap-1" disabled={loading}>
                <RefreshCw className="w-3 h-3" /> Re-analyze
              </Button>
              <Button onClick={clearResult} size="sm" variant="ghost" className="text-xs gap-1 text-destructive hover:text-destructive">
                <Trash2 className="w-3 h-3" /> Clear
              </Button>
            </div>
            {prospect.aiReadinessUpdatedAt && (
              <span className="text-[10px] text-muted-foreground">Analyzed {relativeTime(prospect.aiReadinessUpdatedAt)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Badge component for table view
export function AIReadinessBadge({ prospect, onClick }: { prospect: Prospect; onClick?: () => void }) {
  if (!prospect.aiReadinessGrade) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all hover:scale-105",
        GRADE_BG[prospect.aiReadinessGrade],
        GRADE_COLORS[prospect.aiReadinessGrade]
      )}
      title={`AI Readiness: ${prospect.aiReadinessScore}/100`}
    >
      <Brain className="w-2.5 h-2.5" />
      {prospect.aiReadinessGrade}
    </button>
  );
}
