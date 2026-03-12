import { useState } from "react";
import { Zap, Plus, X, Brain, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SIGNAL_TYPES, OPPORTUNITY_TYPES, SIGNAL_RELEVANCE,
  type Signal,
} from "@/hooks/useSignals";
import type { Prospect } from "@/data/prospects";

interface SignalsSectionProps {
  prospect: Prospect;
  signals: Signal[];
  onAdd: (signal: Omit<Signal, "id" | "created_at" | "user_id">) => Promise<Signal | null>;
  onRemove: (id: string) => Promise<void>;
  territoryId?: string | null;
  compact?: boolean;
}

const RELEVANCE_ICON_COLORS: Record<string, string> = {
  Hot: "text-destructive",
  Warm: "text-[hsl(var(--warning))]",
  Low: "text-muted-foreground",
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  "Leadership Change": "bg-primary/10 text-primary",
  "Expansion": "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  "Competitor Contract Ending": "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  "Bad Reviews / Reputation Issue": "bg-destructive/10 text-destructive",
  "Rebrand / Redesign": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Acquisition / Merger": "bg-primary/10 text-primary",
  "New Locations": "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  "Funding Round": "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  "Tech Vendor Evaluation": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Website Redesign": "bg-primary/10 text-primary",
  "Other": "bg-muted text-muted-foreground",
};

const SIGNAL_TYPE_TIPS: Record<string, string> = {
  "Leadership Change": "A new CMO, VP Marketing, CTO, or other key decision maker was hired. New leaders often re-evaluate vendors.",
  "Expansion": "The company announced new locations, entered new markets, or is scaling rapidly. Growth strains existing systems.",
  "Competitor Contract Ending": "Their current vendor contract (SOCi, Birdeye, etc.) is expiring or they expressed dissatisfaction. Prime switching window.",
  "Bad Reviews / Reputation Issue": "Negative press, review bombing, or public reputation problems. Creates urgency for reputation management.",
  "Rebrand / Redesign": "Company is rebranding, updating their website, or refreshing their digital presence. Natural time to evaluate new tools.",
  "Acquisition / Merger": "Company was acquired or merged. New ownership often means new vendor evaluations and budget reallocation.",
  "New Locations": "Specific location openings announced. Each new location needs listings, pages, and local SEO.",
  "Funding Round": "Received new investment. More budget available for growth tools and infrastructure.",
  "Tech Vendor Evaluation": "Actively evaluating new technology vendors. Could be in an RFP process or informal research phase.",
  "Website Redesign": "Rebuilding their website or digital properties. Good time to pitch Yext Pages or Search.",
  "Other": "Any other relevant trigger event not covered above.",
};

const OPPORTUNITY_TYPE_TIPS: Record<string, string> = {
  "Executive": "Opportunity driven by a leadership change or executive relationship",
  "Expansion": "Opportunity driven by company growth or new locations",
  "Churn": "Opportunity to win back a churned customer or capture a competitor's churning client",
  "Reputation": "Opportunity driven by review/reputation issues the prospect is facing",
  "Competitive Displacement": "Opportunity to replace an existing competitor vendor",
  "Other": "Other opportunity type",
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

function FieldWithTooltip({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
        {tip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-2.5 h-2.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{tip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

export function SignalsSection({ prospect, signals, onAdd, onRemove, territoryId, compact = false }: SignalsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [signalType, setSignalType] = useState(SIGNAL_TYPES[0]);
  const [opportunityType, setOpportunityType] = useState(OPPORTUNITY_TYPES[0]);
  const [relevance, setRelevance] = useState("Warm");
  const [source, setSource] = useState("");
  const [categorizing, setCategorizing] = useState(false);

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

  const autoCategorize = async () => {
    if (!title.trim()) {
      toast.error("Enter a title first");
      return;
    }
    setCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("categorize-signal", {
        body: { title, description, companyName: prospect.name, industry: prospect.industry },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.signal_type) setSignalType(data.signal_type);
      if (data.opportunity_type) setOpportunityType(data.opportunity_type);
      if (data.relevance) setRelevance(data.relevance);
      toast.success("AI categorization applied!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Categorization failed");
    } finally {
      setCategorizing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const result = await onAdd({
      prospect_id: prospect.id as string,
      territory_id: territoryId || null,
      signal_type: signalType,
      opportunity_type: opportunityType,
      title: title.trim(),
      description: description.trim(),
      relevance,
      source: source.trim(),
    });
    if (result) {
      setTitle("");
      setDescription("");
      setSignalType(SIGNAL_TYPES[0]);
      setOpportunityType(OPPORTUNITY_TYPES[0]);
      setRelevance("Warm");
      setSource("");
      setShowForm(false);
      toast.success("⚡ Signal added!");
    }
  };

  return (
    <div className={cn("space-y-3", compact ? "" : "")}>
      <div className="flex items-center justify-between">
        <h3 className={cn(
          "font-bold uppercase tracking-wider flex items-center gap-1.5",
          compact ? "text-sm text-foreground" : "text-sm text-foreground"
        )}>
          <Zap className={cn("text-[hsl(var(--warning))]", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          Signals {signals.length > 0 && <span className="text-muted-foreground">({signals.length})</span>}
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="p-1 rounded-md hover:bg-primary/10 transition-colors">
          {showForm ? <X className="w-4 h-4 text-muted-foreground" /> : <Plus className="w-4 h-4 text-primary" />}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30 animate-fade-in-up">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New VP Marketing hired from Domino's"
            className={cn(inputClass, "text-xs")}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Previously oversaw Yext implementation at Domino's. Likely familiar with the platform and its value."
            className={cn(inputClass, "text-xs resize-none")}
            rows={2}
          />
          <div className="flex gap-2 items-center">
            <Button onClick={autoCategorize} disabled={categorizing || !title.trim()} size="sm" variant="outline" className="gap-1 text-xs shrink-0">
              {categorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              Auto-categorize
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldWithTooltip label="Signal Type" tip={SIGNAL_TYPE_TIPS[signalType]}>
              <select value={signalType} onChange={(e) => setSignalType(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {SIGNAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldWithTooltip>
            <FieldWithTooltip label="Opportunity" tip={OPPORTUNITY_TYPE_TIPS[opportunityType]}>
              <select value={opportunityType} onChange={(e) => setOpportunityType(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {OPPORTUNITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldWithTooltip>
            <FieldWithTooltip label="Relevance">
              <select value={relevance} onChange={(e) => setRelevance(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {SIGNAL_RELEVANCE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FieldWithTooltip>
            <FieldWithTooltip label="Source">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., LinkedIn, Google News, industry contact"
                className={cn(inputClass, "text-xs py-1.5")}
              />
            </FieldWithTooltip>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!title.trim()} size="sm" className="text-xs gap-1">
              <Zap className="w-3 h-3" /> Add Signal
            </Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost" className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {signals.length === 0 && !showForm && (
        <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
          <p className="text-sm text-foreground/60 leading-relaxed">
            No signals logged yet. Signals are trigger events that indicate a prospect might be ready to buy — like leadership changes, expansion plans, or competitor contracts ending. Add one when you spot something relevant during your research.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {signals.map((s) => (
          <div key={s.id} className="flex items-start gap-2.5 p-2.5 border border-border rounded-lg group hover:border-primary/20 transition-colors relative">
            <Zap className={cn("w-4 h-4 mt-0.5 shrink-0", RELEVANCE_ICON_COLORS[s.relevance] || "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{s.title}</span>
                <span className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded", SIGNAL_TYPE_COLORS[s.signal_type] || "bg-muted text-muted-foreground")}>
                  {s.signal_type}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                  {s.opportunity_type}
                </span>
              </div>
              {s.description && <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{s.description}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                {s.source && <span className="text-xs text-muted-foreground">via {s.source}</span>}
                <span className="text-xs text-muted-foreground">{relativeTime(s.created_at)}</span>
              </div>
            </div>
            <button
              onClick={() => { onRemove(s.id); toast("🗑️ Signal removed"); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Badge for table view
export function SignalIndicator({ relevance, onClick }: { relevance: string | null; onClick?: () => void }) {
  if (!relevance) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn("inline-flex items-center", RELEVANCE_ICON_COLORS[relevance])}
      title={`${relevance} signal`}
    >
      <Zap className="w-3.5 h-3.5" />
    </button>
  );
}
