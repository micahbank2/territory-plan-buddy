import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, TrendingUp, Hash } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface NumbersEntry {
  id: string;
  month: string; // YYYY-MM
  quota: number;
  closedAcv: number;
  pipelineAcv: number;
  meetings: number;
  outreachTouches: number;
}

const MONTH_OPTIONS = (() => {
  const months: string[] = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
})();

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function loadEntries(): NumbersEntry[] {
  try {
    return JSON.parse(localStorage.getItem("my_numbers") || "[]");
  } catch { return []; }
}

function saveEntries(entries: NumbersEntry[]) {
  localStorage.setItem("my_numbers", JSON.stringify(entries));
}

const emptyForm = {
  month: new Date().toISOString().slice(0, 7),
  quota: 0,
  closedAcv: 0,
  pipelineAcv: 0,
  meetings: 0,
  outreachTouches: 0,
};

export default function MyNumbersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<NumbersEntry[]>(loadEntries);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.month.localeCompare(b.month)),
    [entries]
  );

  const chartData = useMemo(
    () => sorted.map(e => ({
      month: formatMonth(e.month),
      "Closed ACV": e.closedAcv,
      "Quota": e.quota,
    })),
    [sorted]
  );

  const handleAdd = useCallback(() => {
    const entry: NumbersEntry = {
      id: Date.now().toString(),
      month: form.month,
      quota: form.quota,
      closedAcv: form.closedAcv,
      pipelineAcv: form.pipelineAcv,
      meetings: form.meetings,
      outreachTouches: form.outreachTouches,
    };
    const next = [...entries, entry];
    setEntries(next);
    saveEntries(next);
    setForm(emptyForm);
    setShowAdd(false);
  }, [entries, form]);

  const handleRemove = useCallback((id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
  }, [entries]);

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
            <h1 className="text-xl font-bold text-foreground">My Numbers</h1>
            <Badge variant="secondary" className="font-mono text-xs">{entries.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Log Month
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Trend Chart */}
        {chartData.length >= 2 && (
          <div className="rounded-lg border border-border p-5 bg-card">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Closed ACV vs Quota</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="Closed ACV" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Quota" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No entries yet</p>
            <p className="text-sm mt-1">Click "Log Month" to record your first month's numbers.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold text-foreground">Month</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Quota</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Closed ACV</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Attainment</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Pipeline</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Meetings</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Touches</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(e => {
                  const attainment = e.quota > 0 ? Math.round((e.closedAcv / e.quota) * 100) : 0;
                  return (
                    <TableRow key={e.id} className="group">
                      <TableCell className="font-medium">{formatMonth(e.month)}</TableCell>
                      <TableCell className="text-right font-mono">${e.quota.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">${e.closedAcv.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold font-mono",
                          attainment >= 100 ? "text-emerald-600" : attainment >= 70 ? "text-amber-600" : "text-red-600"
                        )}>{attainment}%</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">${e.pipelineAcv.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{e.meetings}</TableCell>
                      <TableCell className="text-right font-mono">{e.outreachTouches}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemove(e.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Monthly Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Month</label>
              <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map(m => (
                    <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quota ($)</label>
                <Input type="number" value={form.quota || ""} onChange={e => setForm(f => ({ ...f, quota: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Closed ACV ($)</label>
                <Input type="number" value={form.closedAcv || ""} onChange={e => setForm(f => ({ ...f, closedAcv: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pipeline ACV ($)</label>
              <Input type="number" value={form.pipelineAcv || ""} onChange={e => setForm(f => ({ ...f, pipelineAcv: parseInt(e.target.value) || 0 }))} placeholder="0" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Meetings</label>
                <Input type="number" value={form.meetings || ""} onChange={e => setForm(f => ({ ...f, meetings: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Outreach Touches</label>
                <Input type="number" value={form.outreachTouches || ""} onChange={e => setForm(f => ({ ...f, outreachTouches: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
