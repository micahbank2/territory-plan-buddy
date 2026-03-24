import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities, OPP_TYPES, OPP_STAGES, type Opportunity } from "@/hooks/useOpportunities";
import { useProspects } from "@/hooks/useProspects";
import { getLogoUrl } from "@/data/prospects";
import { OpportunitySheet } from "@/components/OpportunitySheet";
import { AccountCombobox } from "@/components/AccountCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OpportunityKanban } from "@/components/OpportunityKanban";
import { ArrowLeft, Plus, Search, DollarSign, ArrowUp, ArrowDown, ArrowUpDown, Building2, Target, X, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_WEIGHTS: Record<string, number> = {
  "Develop": 0.10,
  "Discovery": 0.20,
  "Validate": 0.50,
  "Propose": 0.70,
  "Negotiate": 0.85,
  "Closed Won": 1.0,
  "Won": 1.0,
};

const typeColors: Record<string, string> = {
  "Net New": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Renewal": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Order Form": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const stageColors: Record<string, string> = {
  "Develop": "text-muted-foreground",
  "Discovery": "text-blue-600 dark:text-blue-400",
  "Business Alignment": "text-indigo-600 dark:text-indigo-400",
  "Validate": "text-violet-600 dark:text-violet-400",
  "Propose": "text-amber-600 dark:text-amber-400",
  "Negotiate": "text-orange-600 dark:text-orange-400",
  "Won": "text-emerald-600 dark:text-emerald-400 font-semibold",
  "Closed Won": "text-emerald-600 dark:text-emerald-400 font-semibold",
  "Closed Lost": "text-destructive",
  "Dead": "text-muted-foreground line-through",
};

const emptyOpp = {
  name: "",
  type: "Net New",
  potential_value: 0,
  point_of_contact: "",
  stage: "Develop",
  notes: "",
  products: "",
  close_date: "",
  prospect_id: null as string | null,
};

type SortField = "potential_value" | "close_date" | null;
type SortDir = "asc" | "desc";

function DealLogo({ website, customLogo, size = 20 }: { website?: string; customLogo?: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(website, size >= 32 ? 64 : 32);
  if (customLogo) return <img src={customLogo} alt="" className="rounded-md bg-muted object-contain shrink-0" style={{ width: size, height: size }} />;
  if (!website || err || !url) return <div className="rounded-md bg-primary/10 flex items-center justify-center shrink-0" style={{ width: size, height: size }}><DollarSign className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} /></div>;
  return <img src={url} alt="" className="rounded-md bg-muted object-contain shrink-0" style={{ width: size, height: size }} onError={() => setErr(true)} />;
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3.5 h-3.5" />
    : <ArrowDown className="w-3.5 h-3.5" />;
}

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTerritory } = useTerritories();
  const { opportunities, loading, add, update, remove } = useOpportunities(activeTerritory);
  const { data: prospects, add: addProspect } = useProspects();
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyOpp);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem("opp_quota");
    return saved ? parseInt(saved) : 0;
  });
  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaInput, setQuotaInput] = useState("");

  const prospectMap = useMemo(() => {
    const m = new Map<string, { name: string; website: string; customLogo?: string }>();
    prospects.forEach(p => m.set(p.id, { name: p.name, website: (p as any).website || "", customLogo: (p as any).customLogo }));
    return m;
  }, [prospects]);

  const accountOptions = useMemo(
    () => prospects.map(p => ({ id: p.id, name: p.name })),
    [prospects]
  );

  const handleCreateAccountForForm = async (name: string) => {
    const newId = await addProspect({ name });
    if (newId) setForm(f => ({ ...f, prospect_id: newId }));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const getLogoWebsite = (opp: Opportunity) => {
    if (opp.prospect_id) {
      const p = prospectMap.get(opp.prospect_id);
      if (p?.website) return p.website;
    }
    return "";
  };

  const getLogoCustom = (opp: Opportunity) => {
    if (opp.prospect_id) {
      const p = prospectMap.get(opp.prospect_id);
      return p?.customLogo;
    }
    return undefined;
  };

  const getAccountLabel = (opp: Opportunity) => {
    if (opp.prospect_id) {
      const p = prospectMap.get(opp.prospect_id);
      if (p) return p.name;
    }
    return "";
  };

  const filtered = useMemo(() => {
    let result = opportunities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const acctLabel = getAccountLabel(o).toLowerCase();
        return (
          o.name.toLowerCase().includes(q) ||
          o.type.toLowerCase().includes(q) ||
          o.products.toLowerCase().includes(q) ||
          o.stage.toLowerCase().includes(q) ||
          o.point_of_contact.toLowerCase().includes(q) ||
          o.notes.toLowerCase().includes(q) ||
          acctLabel.includes(q)
        );
      });
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        if (sortField === "potential_value") {
          const diff = (a.potential_value || 0) - (b.potential_value || 0);
          return sortDir === "asc" ? diff : -diff;
        }
        if (sortField === "close_date") {
          const da = a.close_date || "";
          const db = b.close_date || "";
          const cmp = da.localeCompare(db);
          return sortDir === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }
    return result;
  }, [opportunities, search, sortField, sortDir, prospectMap]);

  const totalACV = useMemo(() => filtered.reduce((s, o) => s + (o.potential_value || 0), 0), [filtered]);

  const weightedACV = useMemo(() => {
    return Math.round(opportunities.reduce((s, o) => {
      const weight = STAGE_WEIGHTS[o.stage] ?? 0;
      return s + (o.potential_value || 0) * weight;
    }, 0));
  }, [opportunities]);

  const pipelineCoverage = quota > 0 ? Math.round((weightedACV / quota) * 100) : 0;

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await add(form);
    setForm(emptyOpp);
    setShowAdd(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 md:px-8 py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Opportunities</h1>
            <Badge variant="secondary" className="font-mono text-xs">{filtered.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden md:inline-flex items-center rounded-md border border-border overflow-hidden">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button onClick={() => setViewMode("table")} className={cn("h-8 w-8 flex items-center justify-center transition-colors", viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-gray-100 dark:hover:bg-muted text-muted-foreground")}>
                    <List className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>Table view</p></TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button onClick={() => setViewMode("kanban")} className={cn("h-8 w-8 flex items-center justify-center transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-gray-100 dark:hover:bg-muted text-muted-foreground")}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>Kanban view</p></TooltipContent>
              </Tooltip>
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-8 w-56 h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Forecast Bar */}
      {!loading && opportunities.length > 0 && (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-5 pb-0">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw Pipeline</div>
                <div className="text-xl font-black font-mono text-foreground">${totalACV.toLocaleString()}</div>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weighted Forecast</div>
                <div className="text-xl font-black font-mono text-primary">${weightedACV.toLocaleString()}</div>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quota</div>
                  {editingQuota ? (
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black font-mono text-foreground">$</span>
                      <input
                        autoFocus
                        type="number"
                        value={quotaInput}
                        onChange={e => setQuotaInput(e.target.value)}
                        onBlur={() => {
                          const val = parseInt(quotaInput) || 0;
                          setQuota(val);
                          localStorage.setItem("opp_quota", String(val));
                          setEditingQuota(false);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-28 text-lg font-black font-mono bg-transparent border-b border-primary focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setQuotaInput(String(quota)); setEditingQuota(true); }}
                      className="text-xl font-black font-mono text-foreground hover:text-primary transition-colors"
                    >
                      {quota > 0 ? `$${quota.toLocaleString()}` : "Set quota"}
                    </button>
                  )}
                </div>
              </div>
              {quota > 0 && (
                <>
                  <div className="w-px h-10 bg-border hidden sm:block" />
                  <div className="flex-1 min-w-[120px]">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Pipeline Coverage
                      <span className={cn("ml-2 font-black", pipelineCoverage >= 100 ? "text-emerald-600" : pipelineCoverage >= 60 ? "text-amber-600" : "text-red-600")}>
                        {pipelineCoverage}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", pipelineCoverage >= 100 ? "bg-emerald-500" : pipelineCoverage >= 60 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${Math.min(pipelineCoverage, 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No opportunities yet</p>
            <p className="text-sm mt-1">Click "Add Deal" to create your first opportunity.</p>
          </div>
        ) : viewMode === "kanban" ? (
          <OpportunityKanban
            opportunities={filtered}
            prospectMap={prospectMap}
            onCardClick={(id) => setSelectedOppId(id)}
            onStageChange={(id, newStage) => update(id, { stage: newStage })}
          />
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-foreground min-w-[220px]">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Deal Type</TableHead>
                    <TableHead className="font-semibold text-foreground">Products</TableHead>
                    <TableHead
                      className="font-semibold text-foreground text-right cursor-pointer select-none hover:text-primary"
                      onClick={() => toggleSort("potential_value")}
                    >
                      <span className="inline-flex items-center gap-1">
                        ACV
                        <SortIcon field="potential_value" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Stage</TableHead>
                    <TableHead
                      className="font-semibold text-foreground cursor-pointer select-none hover:text-primary"
                      onClick={() => toggleSort("close_date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Close Date
                        <SortIcon field="close_date" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[180px]">Notes / Next Steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(opp => {
                    const acctLabel = getAccountLabel(opp);
                    return (
                      <TableRow
                        key={opp.id}
                        className="group cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedOppId(opp.id)}
                      >
                        {/* Name with logo + account sub-line */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <DealLogo
                              website={getLogoWebsite(opp)}
                              customLogo={getLogoCustom(opp)}
                              size={28}
                            />
                            <div className="min-w-0">
                              <span className="font-medium text-foreground truncate block">{opp.name}</span>
                              {acctLabel && (
                                <span className="text-xs text-muted-foreground truncate block">{acctLabel}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {/* Deal Type */}
                        <TableCell>
                          <Badge className={`${typeColors[opp.type] || "bg-muted text-foreground"} border-0 font-medium text-xs`}>
                            {opp.type}
                          </Badge>
                        </TableCell>
                        {/* Products */}
                        <TableCell className="text-foreground text-sm max-w-[160px] truncate">
                          {opp.products || "—"}
                        </TableCell>
                        {/* ACV */}
                        <TableCell className="text-right font-mono text-foreground">
                          ${(opp.potential_value || 0).toLocaleString()}
                        </TableCell>
                        {/* Stage */}
                        <TableCell>
                          <span className={`text-sm ${stageColors[opp.stage] || "text-foreground"}`}>{opp.stage}</span>
                        </TableCell>
                        {/* Close Date */}
                        <TableCell className={cn("text-sm", opp.close_date && opp.close_date < new Date().toISOString().split("T")[0] ? "text-red-600 dark:text-red-400 font-medium" : "text-foreground")}>
                          {opp.close_date || "—"}
                        </TableCell>
                        {/* Notes / Next Steps - truncated to 2 lines */}
                        <TableCell className="max-w-[250px]">
                          {opp.notes ? (
                            <p className="text-sm text-foreground/80 line-clamp-2">{opp.notes}</p>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Footer summary */}
            <div className="flex items-center justify-between mt-3 px-2 text-sm text-muted-foreground">
              <span>{filtered.length} deal{filtered.length !== 1 ? "s" : ""}</span>
              <span className="font-mono font-medium text-foreground">${totalACV.toLocaleString()} total ACV</span>
            </div>
          </>
        )}
      </div>

      {/* Opportunity Detail Sheet */}
      <OpportunitySheet
        opportunityId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
        opportunities={opportunities}
        update={update}
        remove={remove}
        prospectMap={prospectMap}
        accountOptions={accountOptions}
        onCreateAccount={addProspect}
      />

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Account (optional)</label>
              <AccountCombobox
                accounts={accountOptions}
                value={form.prospect_id}
                onChange={v => setForm(f => ({ ...f, prospect_id: v }))}
                onCreateNew={handleCreateAccountForForm}
                placeholder="Link to an account..."
                triggerClassName="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deal Type</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">ACV ($)</label>
                <Input type="number" value={form.potential_value || ""} onChange={e => setForm(f => ({ ...f, potential_value: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Products</label>
              <Input placeholder="e.g. Listings, Pages, Reviews" value={form.products} onChange={e => setForm(f => ({ ...f, products: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPP_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Close Date</label>
                <Input type="date" value={form.close_date} onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes / Next Steps</label>
              <Textarea
                className="resize-y"
                placeholder="Add notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
