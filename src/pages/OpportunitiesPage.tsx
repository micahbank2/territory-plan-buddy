import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities, OPP_TYPES, OPP_SOURCES, OPP_STAGES, type Opportunity } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Search, Trash2, MoreHorizontal, DollarSign } from "lucide-react";

const typeColors: Record<string, string> = {
  "One-time": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Recurring": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Trial": "bg-muted text-muted-foreground",
  "Exclusive": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const sourceColors: Record<string, string> = {
  "Outreach": "bg-muted text-foreground",
  "Referral": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Inbound": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Event": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Partner": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const emptyOpp = { name: "", type: "One-time", potential_value: 0, point_of_contact: "", source: "Outreach", stage: "Open", notes: "" };

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTerritory } = useTerritories();
  const { opportunities, loading, add, update, remove } = useOpportunities(activeTerritory);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyOpp);

  const filtered = useMemo(() => {
    if (!search) return opportunities;
    const q = search.toLowerCase();
    return opportunities.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.point_of_contact.toLowerCase().includes(q) ||
      o.source.toLowerCase().includes(q)
    );
  }, [opportunities, search]);

  const totalValue = useMemo(() => filtered.reduce((s, o) => s + (o.potential_value || 0), 0), [filtered]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await add(form);
    setForm(emptyOpp);
    setShowAdd(false);
  };

  const handleInlineChange = (id: string, field: keyof Opportunity, value: string | number) => {
    update(id, { [field]: value } as any);
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
                    <TableHead className="font-semibold text-foreground min-w-[200px]">Deal</TableHead>
                    <TableHead className="font-semibold text-foreground">Type</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Potential Value</TableHead>
                    <TableHead className="font-semibold text-foreground">Point of Contact</TableHead>
                    <TableHead className="font-semibold text-foreground">Source</TableHead>
                    <TableHead className="font-semibold text-foreground">Stage</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(opp => (
                    <TableRow key={opp.id} className="group">
                      <TableCell className="font-medium text-foreground">{opp.name}</TableCell>
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
                      <TableCell className="text-right font-mono text-foreground">
                        ${(opp.potential_value || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground">{opp.point_of_contact || "—"}</TableCell>
                      <TableCell>
                        <Select value={opp.source} onValueChange={v => handleInlineChange(opp.id, "source", v)}>
                          <SelectTrigger className="h-7 w-[100px] border-none bg-transparent p-0 shadow-none hover:bg-muted/50">
                            <Badge className={`${sourceColors[opp.source] || "bg-muted text-foreground"} border-0 font-medium text-xs`}>
                              {opp.source}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {OPP_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={opp.stage} onValueChange={v => handleInlineChange(opp.id, "stage", v)}>
                          <SelectTrigger className="h-7 w-[120px] border-none bg-transparent p-0 shadow-none hover:bg-muted/50">
                            <span className="text-sm text-foreground">{opp.stage}</span>
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
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Footer summary */}
            <div className="flex items-center justify-between mt-3 px-2 text-sm text-muted-foreground">
              <span>{filtered.length} deal{filtered.length !== 1 ? "s" : ""}</span>
              <span className="font-mono font-medium text-foreground">${totalValue.toLocaleString()} total pipeline</span>
            </div>
          </>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Deal name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPP_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Potential Value ($)</label>
                <Input type="number" value={form.potential_value || ""} onChange={e => setForm(f => ({ ...f, potential_value: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPP_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
