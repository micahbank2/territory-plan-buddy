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
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useState as useStateR } from "react";

function LogoImg({ website, size = 24 }: { website?: string; size?: number }) {
  const [err, setErr] = useStateR(false);
  if (!website || err) {
    return (
      <div className="rounded-md bg-muted flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }
  const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt=""
      className="rounded-md shrink-0 bg-muted object-contain"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

const PAGE_SIZE = 25;

export default function TerritoryPlanner() {
  const { data, ok, reset } = useProspects();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fCompetitor, setFCompetitor] = useState<string[]>([]);
  const [fTier, setFTier] = useState<string[]>([]);
  const [fMinLocs, setFMinLocs] = useState("");
  const [fOutreach, setFOutreach] = useState<string[]>([]);
  const [sK, setSK] = useState<string>("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

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

  // Reset page when filters change
  useMemo(() => setPage(1), [q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fMinLocs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const wl = data.filter((p) => p.locationCount && p.locationCount > 0);
    return {
      t: data.length,
      o50: wl.filter((p) => p.locationCount! >= 50).length,
      o100: wl.filter((p) => p.locationCount! >= 100).length,
      o500: wl.filter((p) => p.locationCount! >= 500).length,
      hot: data.filter((p) => p.priority === "Hot").length,
      warm: data.filter((p) => p.priority === "Warm").length,
      ch: data.filter((p) => p.status === "Churned").length,
      prospects: data.filter((p) => p.status === "Prospect").length,
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
  };

  const SortIcon = ({ f }: { f: string }) =>
    sK !== f ? (
      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
    ) : sD === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );

  if (!ok)
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        Loading...
      </div>
    );

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Top bar */}
      <div className="px-8 pt-8 pb-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">All Prospects</h1>
          <button
            onClick={() => { if (confirm("Reset ALL data?")) reset(); }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="Reset data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            ["Total", stats.t, () => { clr(); }],
            ["50+ Locs", stats.o50, () => { clr(); setFMinLocs("50"); }],
            ["100+ Locs", stats.o100, () => { clr(); setFMinLocs("100"); }],
            ["500+ Locs", stats.o500, () => { clr(); setFMinLocs("500"); }],
            ["Hot", stats.hot, () => { clr(); }],
            ["Warm", stats.warm, () => { clr(); }],
            ["Prospects", stats.prospects, () => { clr(); setFStatus(["Prospect"]); }],
            ["Churned", stats.ch, () => { clr(); setFStatus(["Churned"]); }],
          ] as [string, number, () => void][]).map(([label, value, fn], i) => (
            <button
              key={i}
              onClick={() => handleStatClick(fn)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-card group"
            >
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
              <span className="text-sm font-bold text-foreground">{value}</span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, industries..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/40 transition-all"
            />
          </div>

          <MultiSelect options={INDUSTRIES} selected={fIndustry} onChange={setFIndustry} placeholder="Industry" />
          <MultiSelect options={STAGES} selected={fOutreach} onChange={setFOutreach} placeholder="Outreach" />
          <MultiSelect options={["Prospect", "Churned"]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
          <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
          <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />

          {hasFilters && (
            <button onClick={clr} className="px-3 py-2 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* Results count + pagination */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <span className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} prospects
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 pb-8">
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {([
                  ["name", "Company", ""],
                  ["locationCount", "Locations", "w-28"],
                  ["industry", "Industry", "w-28"],
                  ["outreach", "Outreach", "w-32"],
                  ["ps", "Priority", "w-24"],
                  ["lastTouched", "Last Touched", "w-32"],
                ] as [string, string, string][]).map(([k, l, w]) => (
                  <th
                    key={k}
                    onClick={() => doSort(k)}
                    className={cn(
                      "px-5 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors",
                      w
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {l}
                      <SortIcon f={k} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/prospect/${p.id}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <LogoImg website={p.website} size={28} />
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      {p.website && (
                        <a
                          href={`https://${p.website}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md",
                        p.status === "Churned"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-[hsl(152,60%,42%)]/10 text-[hsl(152,60%,42%)]"
                      )}>
                        {p.status}
                      </span>
                      {p.competitor && (
                        <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md bg-warning/10 text-[hsl(38,92%,40%)]">
                          w/ {p.competitor}
                        </span>
                      )}
                      {p.tier && (
                        <span className={cn(
                          "inline-flex px-2 py-0.5 text-[11px] font-medium rounded-md",
                          p.tier === "Tier 1" ? "bg-primary/10 text-primary" :
                          p.tier === "Tier 2" ? "bg-secondary text-secondary-foreground" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {p.tier}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {p.locationCount || "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {p.industry || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                      {p.outreach}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {p.ps}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {p.lastTouched || "—"}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No prospects match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
