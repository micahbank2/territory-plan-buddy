import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities, OPP_TYPES, OPP_STAGES, type Opportunity } from "@/hooks/useOpportunities";
import { useProspects } from "@/hooks/useProspects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Search, Trash2, MoreHorizontal, DollarSign } from "lucide-react";

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

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTerritory } = useTerritories();
  const { opportunities, loading, add, update, remove } = useOpportunities(activeTerritory);
  const { data: prospects } = useProspects();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyOpp);

  const prospectMap = useMemo(() => {
    const m = new Map<string, { name: string; logo: string | null }>();
    prospects.forEach(p => m.set(p.id, { name: p.name, logo: (p as any).customLogo || null }));
    return m;
  }, [prospects]);

  const filtered = useMemo(() => {
    if (!search) return opportunities;
    const q = search.toLowerCase();
    return opportunities.filter(o => {
      const acct = o.prospect_id ? prospectMap.get(o.prospect_id)?.name || "" : "";
      return (
        o.name.toLowerCase().includes(q) ||
        acct.toLowerCase().includes(q) ||
        o.point_of_contact.toLowerCase().includes(q) ||
        o.products.toLowerCase().includes(q)
      );
    });
  }, [opportunities, search, prospectMap]);

  const totalACV = useMemo(() => filtered.reduce((s, o) => s + (o.potential_value || 0), 0), [filtered]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await add(form);
    setForm(emptyOpp);
    setShowAdd(false);
  };

  const handleInlineChange = (id: string, field: keyof Opportunity, value: string | number | null) => {
    update(id, { [field]: value } as any);
  };

  const getAccountDisplay = (prospectId: string | null) => {
    if (!prospectId) return null;
    const p = prospectMap.get(prospectId);
    if (!p) return null;
    return p;
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
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-56 h-9 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
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
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-foreground min-w-[180px]">Account</TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[180px]">Deal</TableHead>
                    <TableHead className="font-semibold text-foreground">Type</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">ACV</TableHead>
                    <TableHead className="font-semibold text-foreground">Products</TableHead>
                    <TableHead className="font-semibold text-foreground">Point of Contact</TableHead>
                    <TableHead className="font-semibold text-foreground">Close Date</TableHead>
                    <TableHead className="font-semibold text-foreground">Stage</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(opp => {
                    const account = getAccountDisplay(opp.prospect_id);
                    return (
                      <TableRow key={opp.id} className="group">
                        {/* Account */}
                        <TableCell>
                          {account ? (
                            <div className="flex items-center gap-2">
                              {account.logo ? (
                                <img src={account.logo} alt="" className="w-5 h-5 rounded object-contain" />
                              ) : (
                                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                  {account.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{account.name}</span>
                            </div>
                          ) : (
                            <Select
                              value={opp.prospect_id || ""}
                              onValueChange={v => handleInlineChange(opp.id, "prospect_id", v || null)}
                            >
                              <SelectTrigger className="h-7 w-[140px] border-dashed text-xs text-muted-foreground">
                                <span>Link account…</span>
                              </SelectTrigger>
                              <SelectContent>
                                {prospects.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        {/* Deal name */}
                        <TableCell className="font-medium text-foreground">{opp.name}</TableCell>
                        {/* Type */}
                        <TableCell>
                          <Select value={opp.type} onValueChange={v => handleInlineChange(opp.id, "type", v)}>
                            <SelectTrigger className="h-7 w-[110px] border-none bg-transparent p-0 shadow-none hover:bg-muted/50">
                              <Badge className={`${typeColors[opp.type] || "bg-muted text-foreground"} border-0 font-medium text-xs`}>
                                {opp.type}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {OPP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* ACV */}
                        <TableCell className="text-right font-mono text-foreground">
                          ${(opp.potential_value || 0).toLocaleString()}
                        </TableCell>
                        {/* Products */}
                        <TableCell className="text-foreground text-sm max-w-[160px] truncate">
                          {opp.products || "—"}
                        </TableCell>
                        {/* Point of Contact */}
                        <TableCell className="text-foreground">{opp.point_of_contact || "—"}</TableCell>
                        {/* Close Date */}
                        <TableCell className="text-foreground text-sm">
                          {opp.close_date || "—"}
                        </TableCell>
                        {/* Stage */}
                        <TableCell>
                          <Select value={opp.stage} onValueChange={v => handleInlineChange(opp.id, "stage", v)}>
                            <SelectTrigger className="h-7 w-[150px] border-none bg-transparent p-0 shadow-none hover:bg-muted/50">
                              <span className={`text-sm ${stageColors[opp.stage] || "text-foreground"}`}>{opp.stage}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {OPP_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => remove(opp.id)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Deal name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Account</label>
              <Select value={form.prospect_id || ""} onValueChange={v => setForm(f => ({ ...f, prospect_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Link to an account (optional)" /></SelectTrigger>
                <SelectContent>
                  {prospects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Products</label>
              <Input placeholder="e.g. Listings, Pages, Reviews" value={form.products} onChange={e => setForm(f => ({ ...f, products: e.target.value }))} />
            </div>
            <Input placeholder="Point of contact" value={form.point_of_contact} onChange={e => setForm(f => ({ ...f, point_of_contact: e.target.value }))} />
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
