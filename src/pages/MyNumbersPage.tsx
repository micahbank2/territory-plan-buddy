import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities, type Opportunity } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, TrendingUp, DollarSign, Target, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface NumbersEntry {
  month: string; // YYYY-MM
  incrementalQuota: number;
  incrementalBookings: number;
  renewedAcv: number;
  pipelineAcv: number;
  meetings: number;
  outreachTouches: number;
}

interface AddOns {
  multiYearDuration: number;
  multiYearRenewedAcv: number;
  multiYearIncrementalAcv: number;
  servicesAmount: number;
  kongExitAcv: number;
  kongBlendedAcv: number;
}

interface CompSettings {
  annualTI: number;
  incrementalSplit: number;
  renewalSplit: number;
  annualIncrementalQuota: number;
  u4r: number;
  retentionTarget: number;
  renewalAbove100Rate: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const FY27_MONTHS = [
  "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
  "2026-12", "2027-01",
];

const DEFAULT_QUOTAS: Record<string, number> = {
  "2026-02": 30000, "2026-03": 30000, "2026-04": 60000,
  "2026-05": 38000, "2026-06": 38000, "2026-07": 77000,
  "2026-08": 40000, "2026-09": 40000, "2026-10": 80000,
  "2026-11": 48000, "2026-12": 48000, "2027-01": 96000,
};

const DEFAULT_SETTINGS: CompSettings = {
  annualTI: 95000,
  incrementalSplit: 0.65,
  renewalSplit: 0.35,
  annualIncrementalQuota: 615000,
  u4r: 2924263,
  retentionTarget: 0.86,
  renewalAbove100Rate: 0.08,
};

const DEFAULT_ADDONS: AddOns = {
  multiYearDuration: 0,
  multiYearRenewedAcv: 0,
  multiYearIncrementalAcv: 0,
  servicesAmount: 0,
  kongExitAcv: 0,
  kongBlendedAcv: 0,
};

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

// ─── Commission Calculations ─────────────────────────────────────────

function calcIncrementalForMonth(
  entries: NumbersEntry[],
  monthIndex: number,
  settings: CompSettings,
) {
  const tier1Cap = settings.annualIncrementalQuota * 0.5;
  const tier2Cap = settings.annualIncrementalQuota * 0.75;
  const incrementalTI = settings.annualTI * settings.incrementalSplit;
  const icr1 = (incrementalTI * 0.4) / tier1Cap;
  const icr2 = (incrementalTI * 0.25) / (tier2Cap - tier1Cap);
  const icr3 = (incrementalTI * 0.35) / (settings.annualIncrementalQuota - tier2Cap);

  // YTD bookings through this month
  let ytdBookings = 0;
  let ytdQuota = 0;
  for (let i = 0; i <= monthIndex; i++) {
    ytdBookings += entries[i].incrementalBookings;
    ytdQuota += entries[i].incrementalQuota;
  }

  // YTD bookings through prior month
  let priorYtdBookings = 0;
  for (let i = 0; i < monthIndex; i++) {
    priorYtdBookings += entries[i].incrementalBookings;
  }

  // Tier allocation for this month's bookings
  const thisMonthBookings = entries[monthIndex].incrementalBookings;

  // Calculate cumulative tier allocations
  const cumT1 = Math.min(ytdBookings, tier1Cap);
  const cumT2 = Math.max(0, Math.min(ytdBookings, tier2Cap) - tier1Cap);
  const cumT3 = Math.max(0, ytdBookings - tier2Cap);

  const priorT1 = Math.min(priorYtdBookings, tier1Cap);
  const priorT2 = Math.max(0, Math.min(priorYtdBookings, tier2Cap) - tier1Cap);
  const priorT3 = Math.max(0, priorYtdBookings - tier2Cap);

  const monthT1 = cumT1 - priorT1;
  const monthT2 = cumT2 - priorT2;
  const monthT3 = cumT3 - priorT3;

  const baseCommission = monthT1 * icr1 + monthT2 * icr2 + monthT3 * icr3;

  // YTD accelerator: +3% on this month's bookings if YTD ahead
  const ytdAccel = ytdBookings > ytdQuota ? thisMonthBookings * 0.03 : 0;

  return { baseCommission, ytdAccel, monthT1, monthT2, monthT3, ytdBookings, ytdQuota };
}

function calcAnnualAccel(entries: NumbersEntry[], settings: CompSettings) {
  const totalBookings = entries.reduce((s, e) => s + e.incrementalBookings, 0);
  const attainment = totalBookings / settings.annualIncrementalQuota;
  if (attainment <= 1.0) return 0;

  const aboveQuota = totalBookings - settings.annualIncrementalQuota;
  let rate = 0;
  if (attainment > 1.5) rate = 0.12;
  else if (attainment > 1.25) rate = 0.10;
  else rate = 0.08;

  return aboveQuota * rate;
}

function calcRenewalForMonth(
  entries: NumbersEntry[],
  monthIndex: number,
  settings: CompSettings,
) {
  const renewalTI = settings.annualTI * settings.renewalSplit;
  const goalRenewed = settings.u4r * settings.retentionTarget;

  // Cumulative renewed through this month and prior
  let cumRenewed = 0;
  for (let i = 0; i <= monthIndex; i++) cumRenewed += entries[i].renewedAcv;
  let priorCumRenewed = 0;
  for (let i = 0; i < monthIndex; i++) priorCumRenewed += entries[i].renewedAcv;

  const retentionPct = cumRenewed / settings.u4r;
  const attainment = goalRenewed > 0 ? cumRenewed / goalRenewed : 0;
  const priorAttainment = goalRenewed > 0 ? priorCumRenewed / goalRenewed : 0;

  const payoutPct = renewalPayoutPct(attainment);
  const priorPayoutPct = renewalPayoutPct(priorAttainment);

  const cumPayout = renewalTI * payoutPct;
  const priorCumPayout = renewalTI * priorPayoutPct;
  const monthlyPayout = cumPayout - priorCumPayout;

  return { monthlyPayout, cumRenewed, retentionPct, attainment, cumPayoutPct: payoutPct };
}

function renewalPayoutPct(attainment: number): number {
  // Attainment is fraction (1.0 = 100%)
  const att = attainment * 100; // work in percentage points
  if (att <= 0) return 0;
  if (att <= 50) return (att * 0.5) / 100;
  if (att <= 75) return (25 + (att - 50) * 1.0) / 100;
  if (att <= 100) return (50 + (att - 75) * 2.0) / 100;
  // Above 100%: 8% per 1% attainment, max 200% total payout
  const above = (100 + (att - 100) * 8.0) / 100;
  return Math.min(above, 2.0);
}

function calcLargeRenewalAddon(entries: NumbersEntry[], settings: CompSettings): number {
  if (settings.u4r < 1500000) return 0;
  const totalRenewed = entries.reduce((s, e) => s + e.renewedAcv, 0);
  const retentionRate = totalRenewed / settings.u4r;
  if (retentionRate < settings.retentionTarget) return 0;
  return totalRenewed * 0.005;
}

function calcAddOnPayouts(addons: AddOns, settings: CompSettings) {
  // Multi-year
  const multiYearRenewal = addons.multiYearDuration > 12 ? addons.multiYearRenewedAcv * 0.005 : 0;
  const multiYearIncremental = addons.multiYearDuration > 12 ? addons.multiYearIncrementalAcv * 0.05 : 0;

  // 1x Services
  const services = addons.servicesAmount * 0.05;

  // Kong buy-out
  const kongDelta = Math.max(0, addons.kongExitAcv - addons.kongBlendedAcv);
  const incrementalTI = settings.annualTI * settings.incrementalSplit;
  const baseICR = incrementalTI / settings.annualIncrementalQuota;
  const kong = kongDelta * baseICR;

  return { multiYearRenewal, multiYearIncremental, services, kong, total: multiYearRenewal + multiYearIncremental + services + kong };
}

// ─── Storage ─────────────────────────────────────────────────────────

const ENTRIES_KEY = "my_numbers_v2";
const SETTINGS_KEY = "my_numbers_settings";
const ADDONS_KEY = "my_numbers_addons";

function loadEntries(): NumbersEntry[] {
  try {
    const stored = localStorage.getItem(ENTRIES_KEY);
    if (stored) return JSON.parse(stored);

    // Migrate from old format
    const old = localStorage.getItem("my_numbers");
    if (old) {
      const oldEntries = JSON.parse(old) as any[];
      const migrated = FY27_MONTHS.map(m => {
        const match = oldEntries.find((e: any) => e.month === m);
        return {
          month: m,
          incrementalQuota: match?.quota ?? DEFAULT_QUOTAS[m] ?? 0,
          incrementalBookings: match?.closedAcv ?? 0,
          renewedAcv: 0,
          pipelineAcv: match?.pipelineAcv ?? 0,
          meetings: match?.meetings ?? 0,
          outreachTouches: match?.outreachTouches ?? 0,
        };
      });
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(migrated));
      return migrated;
    }

    // Fresh start
    return FY27_MONTHS.map(m => ({
      month: m,
      incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
      incrementalBookings: 0,
      renewedAcv: 0,
      pipelineAcv: 0,
      meetings: 0,
      outreachTouches: 0,
    }));
  } catch {
    return FY27_MONTHS.map(m => ({
      month: m, incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
      incrementalBookings: 0, renewedAcv: 0, pipelineAcv: 0, meetings: 0, outreachTouches: 0,
    }));
  }
}

function loadSettings(): CompSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function loadAddOns(): AddOns {
  try {
    const stored = localStorage.getItem(ADDONS_KEY);
    return stored ? { ...DEFAULT_ADDONS, ...JSON.parse(stored) } : DEFAULT_ADDONS;
  } catch { return DEFAULT_ADDONS; }
}

// ─── Inline Edit Cell ────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  isCurrency = true,
}: {
  value: number;
  onChange: (v: number) => void;
  isCurrency?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
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
      onClick={() => { setDraft(String(value || "")); setEditing(true); }}
      className="cursor-pointer hover:text-primary hover:bg-primary/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors font-mono text-sm border border-transparent hover:border-primary/20"
      title="Click to edit"
    >
      {isCurrency ? fmt(value) : value.toLocaleString()}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────

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

        {/* ─── Tabs: Incremental / Renewal ────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="incremental">Incremental ACV</TabsTrigger>
            <TabsTrigger value="renewal">Renewal ACV</TabsTrigger>
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
                          <EditableCell value={e.incrementalQuota} onChange={v => updateEntry(e.month, "incrementalQuota", v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.incrementalBookings} onChange={v => updateEntry(e.month, "incrementalBookings", v)} />
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
                          <EditableCell value={e.meetings} onChange={v => updateEntry(e.month, "meetings", v)} isCurrency={false} />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.outreachTouches} onChange={v => updateEntry(e.month, "outreachTouches", v)} isCurrency={false} />
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
                    <TableHead className="font-semibold text-foreground min-w-[100px]">Month</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[110px]">ACV Renewed</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Cumul. Renewed</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Retention %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Attain %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[110px]">Cumul. Payout %</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Monthly Payout</TableHead>
                    <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e, i) => {
                    const r = renewalCalcs[i];
                    return (
                      <TableRow key={e.month}>
                        <TableCell className="font-medium text-sm">{formatMonth(e.month)}</TableCell>
                        <TableCell className="text-right">
                          <EditableCell value={e.renewedAcv} onChange={v => updateEntry(e.month, "renewedAcv", v)} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(r.cumRenewed)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{pct(r.retentionPct)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-mono text-sm",
                            r.attainment >= 1 ? "text-emerald-600 font-bold" : r.attainment >= 0.7 ? "text-amber-600" : "text-muted-foreground"
                          )}>{pct(r.attainment)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{pct(r.cumPayoutPct)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{fmt(r.monthlyPayout)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmt(pipelineByMonth.renew.get(e.month) ?? 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
                    <TableCell className="text-sm">FY27 Total</TableCell>
                    <TableCell />
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
              <p className="text-[10px] text-muted-foreground">No payout when 1x services replace MS hours w/ retention exception</p>
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
