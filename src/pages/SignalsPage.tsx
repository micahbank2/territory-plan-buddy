import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useSignals, SIGNAL_TYPES, OPPORTUNITY_TYPES, SIGNAL_RELEVANCE } from "@/hooks/useSignals";
import { useProspects } from "@/hooks/useProspects";
import { useTerritories } from "@/hooks/useTerritories";
import { getLogoUrl } from "@/data/prospects";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  Zap, ArrowLeft, Search, Building2, ExternalLink, Sun, Moon, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/MultiSelect";
import yextLogoBlack from "@/assets/yext-logo-black.jpg";
import yextLogoWhite from "@/assets/yext-logo-white.jpg";

const RELEVANCE_COLORS: Record<string, string> = {
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

function LogoImg({ website, size = 28 }: { website?: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(website, 64);
  if (!website || err || !url) return <div className="rounded-md bg-muted flex items-center justify-center" style={{ width: size, height: size }}><Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} /></div>;
  return <img src={url} alt="" className="rounded-md bg-muted object-contain" style={{ width: size, height: size }} onError={() => setErr(true)} />;
}

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

export default function SignalsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const { activeTerritory } = useTerritories();
  const { data: prospects } = useProspects(activeTerritory);
  const { signals, loading } = useSignals(activeTerritory);

  const [q, setQ] = useState("");
  const [fType, setFType] = useState<string[]>([]);
  const [fOpp, setFOpp] = useState<string[]>([]);
  const [fRel, setFRel] = useState<string[]>([]);

  const prospectMap = useMemo(() => {
    const map: Record<string, any> = {};
    prospects.forEach((p) => { map[p.id as string] = p; });
    return map;
  }, [prospects]);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (q) {
        const lq = q.toLowerCase();
        const prospect = prospectMap[s.prospect_id];
        const matchesSearch = s.title.toLowerCase().includes(lq) ||
          s.description.toLowerCase().includes(lq) ||
          (prospect?.name || "").toLowerCase().includes(lq);
        if (!matchesSearch) return false;
      }
      if (fType.length && !fType.includes(s.signal_type)) return false;
      if (fOpp.length && !fOpp.includes(s.opportunity_type)) return false;
      if (fRel.length && !fRel.includes(s.relevance)) return false;
      return true;
    });
  }, [signals, q, fType, fOpp, fRel, prospectMap]);

  return (
    <div className="bg-background min-h-screen text-foreground yext-grid-bg">
      {/* Header */}
      <div className="yext-gradient border-b border-primary/10">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">Signals Feed</h1>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{filtered.length}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Trigger events and buying signals across your territory</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent">
                <ArrowLeft className="w-3.5 h-3.5" /> Territory
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/insights")} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent hidden sm:inline-flex">
                Insights
              </Button>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-foreground/60 hover:text-foreground/80 hover:bg-primary/10 transition-all hidden md:block">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={signOut} className="p-2 rounded-lg text-foreground/40 hover:text-foreground/80 hover:bg-primary/10 transition-all" title="Sign Out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-8 py-4 space-y-3 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search signals..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all"
            />
          </div>
          <MultiSelect options={SIGNAL_TYPES} selected={fType} onChange={setFType} placeholder="Signal Type" />
          <MultiSelect options={OPPORTUNITY_TYPES} selected={fOpp} onChange={setFOpp} placeholder="Opportunity" />
          <MultiSelect options={SIGNAL_RELEVANCE} selected={fRel} onChange={setFRel} placeholder="Relevance" />
        </div>
      </div>

      {/* Signal Cards */}
      <div className="px-4 sm:px-8 py-6 space-y-3 max-w-4xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Zap className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">No signals found</p>
            <p className="text-xs">Add signals from individual prospect pages to see them here.</p>
          </div>
        )}

        {filtered.map((s) => {
          const prospect = prospectMap[s.prospect_id];
          return (
            <div key={s.id} className="border border-border rounded-xl p-4 hover:border-primary/20 transition-all bg-card">
              <div className="flex items-start gap-3">
                <Zap className={cn("w-5 h-5 mt-0.5 shrink-0", RELEVANCE_COLORS[s.relevance] || "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-foreground">{s.title}</span>
                    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded", SIGNAL_TYPE_COLORS[s.signal_type] || "bg-muted text-muted-foreground")}>
                      {s.signal_type}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                      {s.opportunity_type}
                    </span>
                    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded",
                      s.relevance === "Hot" ? "bg-destructive/10 text-destructive" :
                      s.relevance === "Warm" ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {s.relevance}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mb-2">{s.description}</p>}

                  {/* Prospect row */}
                  {prospect && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      <LogoImg website={prospect.website} size={20} />
                      <button
                        onClick={() => navigate(`/prospect/${prospect.id}`)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {prospect.name}
                      </button>
                      {prospect.website && (
                        <a href={normalizeUrl(prospect.website)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {prospect.industry && <span className="text-[10px] text-muted-foreground">{prospect.industry}</span>}
                      <span className="ml-auto text-[10px] text-muted-foreground">{relativeTime(s.created_at)}</span>
                      {s.source && <span className="text-[10px] text-muted-foreground">via {s.source}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
