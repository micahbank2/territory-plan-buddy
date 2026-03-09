import { useState } from "react";
import { Zap, Plus, X, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          "font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5",
          compact ? "text-xs" : "text-sm text-foreground"
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Signal title *" className={cn(inputClass, "text-xs")} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={cn(inputClass, "text-xs resize-none")} rows={2} />
          <div className="flex gap-2 items-center">
            <Button onClick={autoCategorize} disabled={categorizing || !title.trim()} size="sm" variant="outline" className="gap-1 text-xs shrink-0">
              {categorizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              Auto-categorize
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Signal Type</label>
              <select value={signalType} onChange={(e) => setSignalType(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {SIGNAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Opportunity</label>
              <select value={opportunityType} onChange={(e) => setOpportunityType(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {OPPORTUNITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Relevance</label>
              <select value={relevance} onChange={(e) => setRelevance(e.target.value)} className={cn(selectClass, "text-xs py-1.5")}>
                {SIGNAL_RELEVANCE.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn, News..." className={cn(inputClass, "text-xs py-1.5")} />
            </div>
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
        <p className="text-xs text-muted-foreground">No signals tracked yet.</p>
      )}

      <div className="space-y-2">
        {signals.map((s) => (
          <div key={s.id} className="flex items-start gap-2.5 p-2.5 border border-border rounded-lg group hover:border-primary/20 transition-colors relative">
            <Zap className={cn("w-4 h-4 mt-0.5 shrink-0", RELEVANCE_ICON_COLORS[s.relevance] || "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{s.title}</span>
                <span className={cn("px-1.5 py-0.5 text-[9px] font-bold rounded", SIGNAL_TYPE_COLORS[s.signal_type] || "bg-muted text-muted-foreground")}>
                  {s.signal_type}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground">
                  {s.opportunity_type}
                </span>
              </div>
              {s.description && <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                {s.source && <span className="text-[9px] text-muted-foreground">via {s.source}</span>}
                <span className="text-[9px] text-muted-foreground">{relativeTime(s.created_at)}</span>
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
