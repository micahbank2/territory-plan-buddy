import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  STAGES,
  INDUSTRIES,
  COMPETITORS,
  TIERS,
  scoreProspect,
  type Prospect,
  type EnrichedProspect,
} from "@/data/prospects";
import { useProspects } from "@/hooks/useProspects";
import { MultiSelect } from "@/components/MultiSelect";
import { cn } from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Flame,
  Thermometer,
  AlertTriangle,
  Building2,
  ExternalLink,
} from "lucide-react";

export default function TerritoryPlanner() {
  const { data, ok, reset } = useProspects();
  const navigate = useNavigate();
  const [view, setView] = useState<"dashboard" | "table">("dashboard");
  const [q, setQ] = useState("");
  const [sf, setSF] = useState(true);
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fCompetitor, setFCompetitor] = useState<string[]>([]);
  const [fTier, setFTier] = useState<string[]>([]);
  const [fMinLocs, setFMinLocs] = useState("");
  const [fOutreach, setFOutreach] = useState<string[]>([]);
  const [sK, setSK] = useState<string>("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");

  const enriched = useMemo<EnrichedProspect[]>(
    () => data.map((p) => ({ ...p, ps: scoreProspect(p) })),
    [data]
  );

  const filtered = useMemo(() => {
    let r = [...enriched] as (EnrichedProspect & Record<string, any>)[];
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.industry || "").toLowerCase().includes(s) ||
          (p.notes || "").toLowerCase().includes(s)
      );
    }
    if (fIndustry.length) r = r.filter((p) => fIndustry.includes(p.industry));
    if (fOutreach.length) r = r.filter((p) => fOutreach.includes(p.outreach));
    if (fStatus.length) r = r.filter((p) => fStatus.includes(p.status));
    if (fCompetitor.length) r = r.filter((p) => fCompetitor.includes(p.competitor));
    if (fTier.length) r = r.filter((p) => fTier.includes(p.tier));
    if (fMinLocs) r = r.filter((p) => p.locationCount && p.locationCount >= parseInt(fMinLocs));
    r.sort((a, b) => {
      let av = a[sK], bv = b[sK];
      if (av == null) av = sD === "desc" ? -Infinity : Infinity;
      if (bv == null) bv = sD === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      return sD === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return r;
  }, [enriched, q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fMinLocs, sK, sD]);

  const stats = useMemo(() => {
    const wl = data.filter((p) => p.locationCount && p.locationCount > 0);
    const bo: Record<string, number> = {};
    STAGES.forEach((s) => { bo[s] = data.filter((p) => p.outreach === s).length; });
    const bi: Record<string, number> = {};
    data.forEach((p) => { if (p.industry) bi[p.industry] = (bi[p.industry] || 0) + 1; });
    return {
      t: data.length,
      o50: wl.filter((p) => p.locationCount! >= 50).length,
      o100: wl.filter((p) => p.locationCount! >= 100).length,
      o500: wl.filter((p) => p.locationCount! >= 500).length,
      hot: data.filter((p) => p.priority === "Hot").length,
      warm: data.filter((p) => p.priority === "Warm").length,
      ch: data.filter((p) => p.status === "Churned").length,
      prospects: data.filter((p) => p.status === "Prospect").length,
      tl: wl.reduce((s, p) => s + p.locationCount!, 0),
      bo, bi,
    };
  }, [data]);

  const doSort = (f: string) => {
    if (sK === f) setSD((d) => (d === "asc" ? "desc" : "asc"));
    else { setSK(f); setSD("desc"); }
  };

  const clr = () => {
    setQ(""); setFIndustry([]); setFOutreach([]); setFStatus([]); setFCompetitor([]); setFTier([]); setFMinLocs("");
  };

  const hasFilters = fIndustry.length || fOutreach.length || fStatus.length || fCompetitor.length || fTier.length || fMinLocs;

  const handleStatClick = (filterFn: () => void) => {
    filterFn();
    setView("table");
    setSF(true);
  };

  const SortIcon = ({ f }: { f: string }) =>
    sK !== f ? (
      <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />
    ) : sD === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );

  if (!ok)
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        Loading...
      </div>
    );

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground tracking-tight">Territory Planner</h1>
            <p className="text-[10px] text-muted-foreground">Micah Bank · FY2026</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(["dashboard", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {v === "dashboard" ? "Dashboard" : "All Prospects"}
            </button>
          ))}
          <button
            onClick={() => { if (confirm("Reset ALL data?")) reset(); }}
            className="ml-2 p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            title="Reset data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Dashboard */}
      {view === "dashboard" && (
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {([
              ["Total", stats.t, "text-primary", () => { clr(); }],
              ["50+ Locs", stats.o50, "text-emerald-600", () => { clr(); setFMinLocs("50"); }],
              ["100+ Locs", stats.o100, "text-violet-600", () => { clr(); setFMinLocs("100"); }],
              ["500+ Locs", stats.o500, "text-amber-600", () => { clr(); setFMinLocs("500"); }],
              ["Hot", stats.hot, "text-red-600", () => { clr(); }],
              ["Warm", stats.warm, "text-amber-500", () => { clr(); }],
              ["Prospects", stats.prospects, "text-primary", () => { clr(); setFStatus(["Prospect"]); }],
              ["Churned", stats.ch, "text-muted-foreground", () => { clr(); setFStatus(["Churned"]); }],
            ] as [string, number, string, () => void][]).map(([label, value, color, fn], i) => (
              <button
                key={i}
                onClick={() => handleStatClick(fn)}
                className="bg-card rounded-xl p-3 border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left group cursor-pointer"
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
                <div className={cn("text-xl font-bold", color)}>{value}</div>
              </button>
            ))}
          </div>

          {/* Pipeline */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline Stages</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {STAGES.map((s) => {
                const n = stats.bo[s] || 0;
                return (
                  <button
                    key={s}
                    onClick={() => { clr(); setFOutreach([s]); setView("table"); setSF(true); }}
                    className="rounded-lg border border-border p-2 text-center hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <div className="text-lg font-bold text-foreground">{n}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{s}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Industries */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Industry Distribution</h3>
            <div className="space-y-1.5">
              {Object.entries(stats.bi)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([ind, n]) => (
                  <div key={ind} className="flex items-center gap-3">
                    <div className="w-28 text-[11px] text-muted-foreground text-right truncate shrink-0">{ind}</div>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/20 rounded"
                        style={{ width: `${(n / Math.max(...Object.values(stats.bi))) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground w-6 text-right">{n}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="flex flex-col h-[calc(100vh-53px)]">
          {/* Filters bar */}
          <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search accounts..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
              />
            </div>

            <MultiSelect options={INDUSTRIES} selected={fIndustry} onChange={setFIndustry} placeholder="Industry" />
            <MultiSelect options={STAGES} selected={fOutreach} onChange={setFOutreach} placeholder="Outreach" />
            <MultiSelect options={["Prospect", "Churned"]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
            <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
            <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />

            <div className="relative">
              <MapPin className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={fMinLocs}
                onChange={(e) => setFMinLocs(e.target.value)}
                placeholder="Min locs"
                type="number"
                className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-20"
              />
            </div>

            {hasFilters && (
              <button onClick={clr} className="px-2 py-1 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                Clear All
              </button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {data.length}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr>
                  {([
                    ["ps", "Score", "w-14"],
                    ["name", "Account", ""],
                    ["locationCount", "Locations", "w-20"],
                    ["industry", "Industry", "w-32"],
                    ["tier", "Tier", "w-16"],
                    ["outreach", "Stage", "w-28"],
                    ["priority", "Priority", "w-20"],
                    ["status", "Status", "w-20"],
                    ["competitor", "Competitor", "w-24"],
                  ] as [string, string, string][]).map(([k, l, w]) => (
                    <th
                      key={k}
                      onClick={() => doSort(k)}
                      className={cn(
                        "px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors",
                        w
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {l}
                        <SortIcon f={k} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/prospect/${p.id}`)}
                    className="hover:bg-accent/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-xs font-bold",
                        p.ps >= 40 ? "text-emerald-600" : p.ps >= 20 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {p.ps}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        {p.status === "Churned" && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700 uppercase">Churned</span>
                        )}
                        {p.competitor && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800">
                            w/ {p.competitor}
                          </span>
                        )}
                        {p.tier && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[9px] font-semibold rounded",
                            p.tier === "Tier 1" ? "bg-primary/10 text-primary" :
                            p.tier === "Tier 2" ? "bg-violet-100 text-violet-700" :
                            p.tier === "Tier 3" ? "bg-muted text-muted-foreground" :
                            "bg-muted text-muted-foreground/60"
                          )}>
                            {p.tier}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">{p.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        "font-semibold",
                        (p.locationCount ?? 0) >= 100 ? "text-emerald-600" :
                        (p.locationCount ?? 0) >= 50 ? "text-primary" :
                        (p.locationCount ?? 0) > 0 ? "text-foreground" : "text-muted-foreground/40"
                      )}>
                        {p.locationCount || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.industry || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[10px]">{p.tier || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground">
                        {p.outreach}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.priority && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          p.priority === "Hot" ? "bg-red-100 text-red-700" :
                          p.priority === "Warm" ? "bg-amber-100 text-amber-700" :
                          p.priority === "Cold" ? "bg-blue-100 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {p.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-[10px] font-medium",
                        p.status === "Churned" ? "text-red-600" : "text-emerald-600"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[10px]">{p.competitor || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
