import { useState, useEffect } from "react";
import { Brain, CheckCircle, AlertTriangle, Lightbulb, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect, NoteEntry } from "@/data/prospects";

interface AIReadinessResult {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  strengths: string[];
  risks: string[];
  yext_opportunity: string;
  talking_point: string;
}

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

// Parse existing AI Readiness note
function parseExistingResult(noteLog: NoteEntry[] | undefined): AIReadinessResult | null {
  if (!noteLog) return null;
  const aiNote = [...noteLog].reverse().find((n) => n.text.startsWith("[AI Readiness]"));
  if (!aiNote) return null;
  try {
    const jsonStr = aiNote.text.replace("[AI Readiness] ", "");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function AIReadinessCard({ prospect, onUpdate, compact = false }: AIReadinessCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing result from notes on mount
  useEffect(() => {
    const existing = parseExistingResult(prospect.noteLog);
    if (existing) {
      setResult(existing);
    }
  }, [prospect.id, prospect.noteLog]);

  const analyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-readiness", {
        body: {
          name: prospect.name,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          website: prospect.website,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResult(data);

      // Save to notes
      const entry: NoteEntry = {
        id: Date.now().toString(),
        text: `[AI Readiness] ${JSON.stringify(data)}`,
        timestamp: new Date().toISOString(),
      };
      onUpdate(prospect.id, { noteLog: [...(prospect.noteLog || []), entry] });
      toast.success("AI Readiness analysis complete!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyTalkingPoint = () => {
    if (result?.talking_point) {
      navigator.clipboard.writeText(result.talking_point);
      toast.success("Talking point copied to clipboard!");
    }
  };

  if (!result && !loading) {
    return (
      <div className={cn("border border-dashed border-border rounded-xl p-4 flex items-center justify-between gap-3", compact ? "p-3" : "p-4")}>
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
        <Button onClick={analyze} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!result) return null;

  if (compact) {
    return (
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">AI Readiness</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-black", GRADE_COLORS[result.grade])}>{result.overall_score}</span>
            <span className={cn("px-2 py-0.5 text-sm font-bold rounded-md", GRADE_BG[result.grade], GRADE_COLORS[result.grade])}>
              {result.grade}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{result.summary}</p>
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-primary cursor-help flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Talking point
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {result.talking_point}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={copyTalkingPoint} size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
            <Copy className="w-3 h-3" /> Copy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Search Readiness</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", GRADE_BG[result.grade])}>
            <span className={cn("text-3xl font-black", GRADE_COLORS[result.grade])}>{result.overall_score}</span>
            <span className={cn("text-lg font-bold", GRADE_COLORS[result.grade])}>{result.grade}</span>
          </div>
          <Button onClick={analyze} size="sm" variant="ghost" className="text-xs gap-1">
            <Brain className="w-3 h-3" /> Re-analyze
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">{result.summary}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[hsl(var(--success))] uppercase flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Strengths
            </h4>
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-[hsl(var(--success))] shrink-0 mt-0.5" />
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
              {result.risks.map((r, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
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
          <p className="text-sm text-foreground">{result.yext_opportunity}</p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Outreach Talking Point</p>
            <p className="text-sm text-foreground italic">"{result.talking_point}"</p>
          </div>
          <Button onClick={copyTalkingPoint} size="sm" variant="outline" className="ml-4 gap-1.5 shrink-0">
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
        </div>
      </div>
    </div>
  );
}

// Badge component for table view
export function AIReadinessBadge({ prospect, onClick }: { prospect: Prospect; onClick?: () => void }) {
  const result = parseExistingResult(prospect.noteLog);
  if (!result) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all hover:scale-105",
        GRADE_BG[result.grade],
        GRADE_COLORS[result.grade]
      )}
      title={`AI Readiness: ${result.overall_score}/100`}
    >
      <Brain className="w-2.5 h-2.5" />
      {result.grade}
    </button>
  );
}

// Helper to get grade from notes
export function getAIReadinessGrade(noteLog: NoteEntry[] | undefined): string | null {
  const result = parseExistingResult(noteLog);
  return result?.grade || null;
}
