import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities, type Opportunity } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, TrendingUp, DollarSign, Target, ShieldCheck, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import {
  FY27_MONTHS,
  DEFAULT_QUOTAS,
  DEFAULT_SETTINGS,
  DEFAULT_ADDONS,
  ENTRIES_KEY,
  SETTINGS_KEY,
  ADDONS_KEY,
  loadEntries,
  loadSettings,
  loadAddOns,
  type NumbersEntry,
  type CompSettings,
  type AddOns,
} from "@/data/myNumbers/storage";
import {
  calcIncrementalForMonth,
  calcAnnualAccel,
  calcRenewalForMonth,
  calcLargeRenewalAddon,
  calcAddOnPayouts,
} from "@/data/myNumbers/comp";
import { MyNumbersTrendsTab } from "@/components/myNumbers/MyNumbersTrendsTab";

// ─── Helpers ─────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ─── Inline Edit Cell ────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  isCurrency = true,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  isCurrency?: boolean;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        aria-label={ariaLabel}
        className="w-full bg-transparent text-right font-mono text-sm border-b border-primary outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(parseInt(draft) || 0); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(parseInt(draft) || 0); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => { setDraft(String(value || "")); setEditing(true); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDraft(String(value || "")); setEditing(true); } }}
      className="cursor-pointer hover:text-primary hover:bg-primary/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors font-mono text-sm border border-transparent hover:border-primary/20"
      title="Click to edit"
    >
      {isCurrency ? fmt(value) : value.toLocaleString()}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────

const OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"];

export default function MyNumbersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeTerritory } = useTerritories();
  const { opportunities } = useOpportunities(activeTerritory);
  const [entries, setEntries] = useState<NumbersEntry[]>(loadEntries);
  const [settings, setSettings] = useState<CompSettings>(loadSettings);
  const [addons, setAddons] = useState<AddOns>(loadAddOns);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddOns, setShowAddOns] = useState(false);
  const [activeTab, setActiveTab] = useState("incremental");
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);

  // Gate: non-owners get redirected away (useEffect to avoid render-time navigate)
  useEffect(() => {
    if (user && !OWNER_EMAILS.includes(user.email ?? "")) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Auto-compute pipeline from deals by close date and type
  const pipelineByMonth = useMemo(() => {
    const incr = new Map<string, number>();
    const renew = new Map<string, number>();
    const CLOSED_STAGES = new Set(["Won", "Closed Won", "Closed Lost", "Dead"]);

    for (const opp of opportunities) {
      if (!opp.close_date || CLOSED_STAGES.has(opp.stage)) continue;
      const month = opp.close_date.substring(0, 7); // "YYYY-MM"
      if (opp.type === "Renewal") {
        renew.set(month, (renew.get(month) ?? 0) + (opp.potential_value || 0));
      } else {
        // Net New + Order Form → incremental pipeline
        incr.set(month, (incr.get(month) ?? 0) + (opp.incremental_acv ?? opp.potential_value ?? 0));
      }
    }
    return { incr, renew };
  }, [opportunities]);

  const save = useCallback((next: NumbersEntry[]) => {
    setEntries(next);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(next));
  }, []);

  const saveSettings = useCallback((next: CompSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const saveAddOns = useCallback((next: AddOns) => {
    setAddons(next);
    localStorage.setItem(ADDONS_KEY, JSON.stringify(next));
  }, []);

  const updateEntry = useCallback((month: string, field: keyof NumbersEntry, value: number) => {
    const next = entries.map(e => e.month === month ? { ...e, [field]: value } : e);
    save(next);
  }, [entries, save]);

  // ─── Calculations ──────────────────────────────────────────────

  const incrementalCalcs = useMemo(() =>
    entries.map((_, i) => calcIncrementalForMonth(entries, i, settings)),
    [entries, settings]
  );

  const renewalCalcs = useMemo(() =>
    entries.map((_, i) => calcRenewalForMonth(entries, i, settings)),
    [entries, settings]
  );

  const annualAccel = useMemo(() => calcAnnualAccel(entries, settings), [entries, settings]);
  const largeRenewalAddon = useMemo(() => calcLargeRenewalAddon(entries, settings), [entries, settings]);
  const addonPayouts = useMemo(() => calcAddOnPayouts(addons, settings), [addons, settings]);

  const ytdTotals = useMemo(() => {
    const totalIncrBookings = entries.reduce((s, e) => s + e.incrementalBookings, 0);
    const totalIncrQuota = entries.reduce((s, e) => s + e.incrementalQuota, 0);
    const totalRenewed = entries.reduce((s, e) => s + e.renewedAcv, 0);
    const totalBaseComm = incrementalCalcs.reduce((s, c) => s + c.baseCommission, 0);
    const totalYtdAccel = incrementalCalcs.reduce((s, c) => s + c.ytdAccel, 0);
    const totalRenewalPayout = renewalCalcs.reduce((s, c) => s + c.monthlyPayout, 0);
    const totalIncrPayout = totalBaseComm + totalYtdAccel;
    const totalEarnings = totalIncrPayout + annualAccel + totalRenewalPayout + largeRenewalAddon + addonPayouts.total;

    return {
      totalIncrBookings, totalIncrQuota, totalRenewed,
      totalBaseComm, totalYtdAccel, totalIncrPayout,
      totalRenewalPayout, totalEarnings, annualAccel,
    };
  }, [entries, incrementalCalcs, renewalCalcs, annualAccel, largeRenewalAddon, addonPayouts]);

  const chartData = useMemo(() =>
    entries.map((e, i) => ({
      month: formatMonth(e.month),
      Bookings: e.incrementalBookings,
      Quota: e.incrementalQuota,
      Payout: Math.round(incrementalCalcs[i].baseCommission + incrementalCalcs[i].ytdAccel),
    })),
    [entries, incrementalCalcs]
  );

  if (!user) return null;
  if (!OWNER_EMAILS.includes(user.email ?? "")) return null;

  const incrAttainment = ytdTotals.totalIncrQuota > 0 ? ytdTotals.totalIncrBookings / ytdTotals.totalIncrQuota : 0;
  const renewalRetention = settings.u4r > 0 ? ytdTotals.totalRenewed / settings.u4r : 0;

  // Count months with bookings for pace calc
  const activeMonths = entries.filter(e => e.incrementalBookings > 0).length;
  const monthlyPace = activeMonths > 0 ? ytdTotals.totalIncrBookings / activeMonths : 0;
  const projectedAnnual = monthlyPace * 12;
  const projectedAttainment = settings.annualIncrementalQuota > 0 ? projectedAnnual / settings.annualIncrementalQuota : 0;

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
            <span className="text-xs text-muted-foreground font-mono">FY27</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Settings
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ─── Summary Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="YTD Incremental"
            value={fmt(ytdTotals.totalIncrBookings)}
            sub={`of ${fmt(ytdTotals.totalIncrQuota)} quota`}
            pct={incrAttainment}
            icon={<Target className="w-5 h-5" />}
            accent="from-blue-500/10 to-blue-500/5 dark:from-blue-500/15 dark:to-blue-500/5"
          />
          <SummaryCard
            label="YTD Renewal"
            value={fmt(ytdTotals.totalRenewed)}
            sub={`${pct(renewalRetention)} retention of ${fmt(settings.u4r)} U4R`}
            pct={renewalRetention / settings.retentionTarget}
            icon={<ShieldCheck className="w-5 h-5" />}
            accent="from-violet-500/10 to-violet-500/5 dark:from-violet-500/15 dark:to-violet-500/5"
          />
          <SummaryCard
            label="Est. YTD Earnings"
            value={fmt(ytdTotals.totalEarnings)}
            sub={`Incr: ${fmt(ytdTotals.totalIncrPayout)} | Ren: ${fmt(ytdTotals.totalRenewalPayout)}`}
            icon={<DollarSign className="w-5 h-5" />}
            accent="from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/15 dark:to-emerald-500/5"
          />
          <SummaryCard
            label="Annual Pace"
            value={pct(projectedAttainment)}
            sub={`${fmt(projectedAnnual)} projected (${fmt(monthlyPace)}/mo)`}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="from-amber-500/10 to-amber-500/5 dark:from-amber-500/15 dark:to-amber-500/5"
          />
        </div>

        {/* ─── Tabs: Incremental / Renewal / Trends ───────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="incremental">Incremental ACV</TabsTrigger>
            <TabsTrigger value="renewal">Renewal ACV</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="incremental">
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-foreground min-w-[100px]">Month</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Quota</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Bookings</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Attain%</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Base Comm.</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">YTD Accel</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Est. Payout</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Pipeline</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Mtgs</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Touches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e, i) => {
                    const c = incrementalCalcs[i];
                    const monthAttain = e.incrementalQuota > 0 ? e.incrementalBookings / e.incrementalQuota : 0;
                    const payout = c.baseCommission + c.ytdAccel;
                    return (
                      <TableRow key={e.month} className="group">
                        <TableCell className="font-medium text-sm">{formatMonth(e.month)}</TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.incrementalQuota} onChange={v => updateEntry(e.month, "incrementalQuota", v)} ariaLabel={`Quota for ${formatMonth(e.month)}`} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.incrementalBookings} onChange={v => updateEntry(e.month, "incrementalBookings", v)} ariaLabel={`Bookings for ${formatMonth(e.month)}`} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold font-mono text-sm",
                            monthAttain >= 1 ? "text-emerald-600" : monthAttain >= 0.7 ? "text-amber-600" : "text-red-600"
                          )}>{Math.round(monthAttain * 100)}%</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(c.baseCommission)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{c.ytdAccel > 0 ? fmt(c.ytdAccel) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{fmt(payout)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {fmt(pipelineByMonth.incr.get(e.month) ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.meetings} onChange={v => updateEntry(e.month, "meetings", v)} isCurrency={false} ariaLabel={`Meetings for ${formatMonth(e.month)}`} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.outreachTouches} onChange={v => updateEntry(e.month, "outreachTouches", v)} isCurrency={false} ariaLabel={`Outreach touches for ${formatMonth(e.month)}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
                    <TableCell className="text-sm">FY27 Total</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrQuota)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrBookings)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn("font-bold font-mono text-sm",
                        incrAttainment >= 1 ? "text-emerald-600" : incrAttainment >= 0.7 ? "text-amber-600" : "text-red-600"
                      )}>{Math.round(incrAttainment * 100)}%</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalBaseComm)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalYtdAccel)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrPayout)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(Array.from(pipelineByMonth.incr.values()).reduce((s, v) => s + v, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entries.reduce((s, e) => s + e.meetings, 0)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entries.reduce((s, e) => s + e.outreachTouches, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="renewal">
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold text-foreground min-w-[100px]">Quarter</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[110px]">ACV Renewed</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Cumul. Renewed</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Retention %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Attain %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[110px]">Cumul. Payout %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Qtr Payout</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // FY27 quarters: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan
                    const quarters = [
                      { label: "Q1 FY27", months: ["2026-02","2026-03","2026-04"] },
                      { label: "Q2 FY27", months: ["2026-05","2026-06","2026-07"] },
                      { label: "Q3 FY27", months: ["2026-08","2026-09","2026-10"] },
                      { label: "Q4 FY27", months: ["2026-11","2026-12","2027-01"] },
                    ];
                    return quarters.map((q, qi) => {
                      // Sum ACV renewed for this quarter
                      const qRenewed = q.months.reduce((s, m) => {
                        const e = entries.find(e => e.month === m);
                        return s + (e?.renewedAcv ?? 0);
                      }, 0);
                      // Cumulative through last month of quarter
                      const lastMonthIdx = FY27_MONTHS.indexOf(q.months[q.months.length - 1]);
                      const lastMonthCalc = lastMonthIdx >= 0 ? renewalCalcs[lastMonthIdx] : null;
                      // Prior quarter last month
                      const priorLastMonthIdx = qi > 0 ? FY27_MONTHS.indexOf(quarters[qi-1].months[2]) : -1;
                      const priorCalc = priorLastMonthIdx >= 0 ? renewalCalcs[priorLastMonthIdx] : null;
                      const qPayout = (lastMonthCalc?.monthlyPayout ?? 0) +
                        (q.months.slice(0,-1).reduce((s, m) => {
                          const idx = FY27_MONTHS.indexOf(m);
                          return s + (idx >= 0 ? renewalCalcs[idx]?.monthlyPayout ?? 0 : 0);
                        }, 0));
                      const qPipeline = q.months.reduce((s, m) => s + (pipelineByMonth.renew.get(m) ?? 0), 0);
                      const isExpanded = expandedQuarter === q.label;
                      return (
                        <React.Fragment key={q.label}>
                        <TableRow className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedQuarter(isExpanded ? null : q.label)}>
                          <TableCell className="font-semibold text-sm">
                            <span className="flex items-center gap-1.5">
                              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                              {q.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(qRenewed)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(lastMonthCalc?.cumRenewed ?? 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{pct(lastMonthCalc?.retentionPct ?? 0)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn("font-mono text-sm",
                              (lastMonthCalc?.attainment ?? 0) >= 1 ? "text-emerald-600 font-bold" : (lastMonthCalc?.attainment ?? 0) >= 0.7 ? "text-amber-600" : "text-muted-foreground"
                            )}>{pct(lastMonthCalc?.attainment ?? 0)}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{pct(lastMonthCalc?.cumPayoutPct ?? 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(qPayout)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmt(qPipeline)}</TableCell>
                        </TableRow>
                        {isExpanded && q.months.map(m => {
                          const e = entries.find(en => en.month === m);
                          if (!e) return null;
                          const label = new Date(m + "-15").toLocaleString("default", { month: "short", year: "2-digit" });
                          return (
                            <TableRow key={m} className="bg-muted/20">
                              <TableCell className="pl-8 text-xs text-muted-foreground font-medium">{label}</TableCell>
                              <TableCell className="text-right">
                                <EditableCell value={e.renewedAcv} onChange={v => updateEntry(m, "renewedAcv", v)} ariaLabel={`Renewed ACV for ${formatMonth(m)}`} />
                              </TableCell>
                              <TableCell colSpan={6} />
                            </TableRow>
                          );
                        })}
                        </React.Fragment>
                      );
                    });
                  })()}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
                    <TableCell className="text-sm">FY27 Total</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalRenewed)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalRenewed)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{pct(renewalRetention)}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalRenewalPayout)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {fmt(Array.from(pipelineByMonth.renew.values()).reduce((s, v) => s + v, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {largeRenewalAddon > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Large Renewal Add-on: </span>
                <span className="font-mono">{fmt(largeRenewalAddon)}</span>
                <span className="text-muted-foreground ml-1">(0.5% on {fmt(ytdTotals.totalRenewed)} renewed, U4R ≥ $1.5M & retention ≥ target)</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends">
            <MyNumbersTrendsTab
              entries={entries}
              pipelineByMonth={pipelineByMonth}
              incrementalCalcs={incrementalCalcs}
            />
          </TabsContent>
        </Tabs>

        {/* ─── Add-ons Section ────────────────────────────────────── */}
        <button
          onClick={() => setShowAddOns(!showAddOns)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {showAddOns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Add-ons & SPIFFs
          {addonPayouts.total > 0 && <span className="font-mono text-emerald-600 text-xs">{fmt(addonPayouts.total)}</span>}
        </button>

        {showAddOns && (
          <div className="grid md:grid-cols-3 gap-4">
            {/* Multi-year */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Multi-Year Deal</h3>
              <label className="text-xs text-muted-foreground block">Duration (months)</label>
              <Input type="number" value={addons.multiYearDuration || ""} onChange={e => saveAddOns({ ...addons, multiYearDuration: parseInt(e.target.value) || 0 })} placeholder="0" />
              <label className="text-xs text-muted-foreground block">Renewed ACV</label>
              <Input type="number" value={addons.multiYearRenewedAcv || ""} onChange={e => saveAddOns({ ...addons, multiYearRenewedAcv: parseInt(e.target.value) || 0 })} placeholder="0" />
              <label className="text-xs text-muted-foreground block">Incremental ACV</label>
              <Input type="number" value={addons.multiYearIncrementalAcv || ""} onChange={e => saveAddOns({ ...addons, multiYearIncrementalAcv: parseInt(e.target.value) || 0 })} placeholder="0" />
              <div className="pt-2 border-t border-border text-sm">
                <div className="flex justify-between"><span>Renewal (0.5%)</span><span className="font-mono">{fmt(addonPayouts.multiYearRenewal)}</span></div>
                <div className="flex justify-between"><span>Incremental (5%)</span><span className="font-mono">{fmt(addonPayouts.multiYearIncremental)}</span></div>
              </div>
            </div>

            {/* 1x Services */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold">1x Services</h3>
              <label className="text-xs text-muted-foreground block">Services Amount</label>
              <Input type="number" value={addons.servicesAmount || ""} onChange={e => saveAddOns({ ...addons, servicesAmount: parseInt(e.target.value) || 0 })} placeholder="0" />
              <div className="pt-2 border-t border-border text-sm">
                <div className="flex justify-between"><span>Payout (5%)</span><span className="font-mono">{fmt(addonPayouts.services)}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">No payout when 1x services replace MS hours w/ retention exception</p>
            </div>

            {/* Kong Buy-out */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Kong Buy-out SPIFF</h3>
              <label className="text-xs text-muted-foreground block">Exit ACV</label>
              <Input type="number" value={addons.kongExitAcv || ""} onChange={e => saveAddOns({ ...addons, kongExitAcv: parseInt(e.target.value) || 0 })} placeholder="0" />
              <label className="text-xs text-muted-foreground block">Blended ACV</label>
              <Input type="number" value={addons.kongBlendedAcv || ""} onChange={e => saveAddOns({ ...addons, kongBlendedAcv: parseInt(e.target.value) || 0 })} placeholder="0" />
              <div className="pt-2 border-t border-border text-sm">
                <div className="flex justify-between"><span>Delta × ICR</span><span className="font-mono">{fmt(addonPayouts.kong)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Total Comp Summary ─────────────────────────────────── */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">FY27 Total Variable Compensation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Incremental Base</span>
              <p className="font-mono font-semibold">{fmt(ytdTotals.totalBaseComm)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">YTD Accelerators</span>
              <p className="font-mono font-semibold">{fmt(ytdTotals.totalYtdAccel)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Annual Accelerators</span>
              <p className="font-mono font-semibold">{fmt(annualAccel)}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Total Incremental</span>
              <p className="font-mono font-bold text-base">{fmt(ytdTotals.totalIncrPayout + annualAccel)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Renewal Payouts</span>
              <p className="font-mono font-semibold">{fmt(ytdTotals.totalRenewalPayout)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Large Renewal Add-on</span>
              <p className="font-mono font-semibold">{fmt(largeRenewalAddon)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Other Add-ons</span>
              <p className="font-mono font-semibold">{fmt(addonPayouts.total)}</p>
            </div>
            <div>
              <span className="text-primary font-bold">TOTAL FY27 VARIABLE</span>
              <p className="font-mono font-bold text-xl text-primary">{fmt(ytdTotals.totalEarnings)}</p>
            </div>
          </div>
        </div>

        {/* ─── Chart ──────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border p-5 bg-card">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Incremental Bookings vs Quota</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="Bookings" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Quota" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Settings Dialog ──────────────────────────────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comp Plan Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <SettingsField label="Annual TI ($)" value={settings.annualTI} onChange={v => saveSettings({ ...settings, annualTI: v })} />
            <div className="grid grid-cols-2 gap-3">
              <SettingsField label="Incremental Split (%)" value={Math.round(settings.incrementalSplit * 100)} onChange={v => saveSettings({ ...settings, incrementalSplit: v / 100 })} />
              <SettingsField label="Renewal Split (%)" value={Math.round(settings.renewalSplit * 100)} onChange={v => saveSettings({ ...settings, renewalSplit: v / 100 })} />
            </div>
            <SettingsField label="Annual Incremental Quota ($)" value={settings.annualIncrementalQuota} onChange={v => saveSettings({ ...settings, annualIncrementalQuota: v })} />
            <SettingsField label="FY ACV U4R ($)" value={settings.u4r} onChange={v => saveSettings({ ...settings, u4r: v })} />
            <div className="grid grid-cols-2 gap-3">
              <SettingsField label="Retention Target (%)" value={Math.round(settings.retentionTarget * 100)} onChange={v => saveSettings({ ...settings, retentionTarget: v / 100 })} />
              <SettingsField label="Renewal >100% Rate (%)" value={settings.renewalAbove100Rate * 100} onChange={v => saveSettings({ ...settings, renewalAbove100Rate: v / 100 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { saveSettings(DEFAULT_SETTINGS); }}>Reset Defaults</Button>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SummaryCard({ label, value, sub, pct, icon, accent }: {
  label: string; value: string; sub: string; pct?: number; icon: React.ReactNode; accent?: string;
}) {
  const accentColor = accent || "from-primary/10 to-primary/5";
  const pctColor = pct !== undefined
    ? pct >= 1 ? "text-emerald-500" : pct >= 0.7 ? "text-amber-500" : "text-red-500"
    : "";
  return (
    <div className={cn("rounded-xl border border-border p-5 bg-gradient-to-br", accentColor, "relative overflow-hidden")}>
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-black font-mono text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className={cn("text-sm font-bold font-mono", pctColor)}>
              {Math.round(pct * 100)}% attainment
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-background/50 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700",
                pct >= 1 ? "bg-emerald-500" : pct >= 0.7 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsField({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Input
        type="number"
        value={value || ""}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="font-mono"
      />
    </div>
  );
}
