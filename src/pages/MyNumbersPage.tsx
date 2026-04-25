import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings } from "lucide-react";
import {
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
import { SummaryCardRow } from "@/components/myNumbers/SummaryCardRow";
import { IncrementalTab } from "@/components/myNumbers/IncrementalTab";
import { RenewalTab } from "@/components/myNumbers/RenewalTab";
import { MyNumbersTrendsTab } from "@/components/myNumbers/MyNumbersTrendsTab";
import { AddonsSection } from "@/components/myNumbers/AddonsSection";
import { EarningsSummary } from "@/components/myNumbers/EarningsSummary";
import { MyNumbersChart } from "@/components/myNumbers/MyNumbersChart";
import { SettingsDialog } from "@/components/myNumbers/SettingsDialog";

// ─── Helpers (chart data formatting) ─────────────────────────────────

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

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
        incr.set(
          month,
          (incr.get(month) ?? 0) + (opp.incremental_acv ?? opp.potential_value ?? 0),
        );
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

  const updateEntry = useCallback(
    (month: string, field: keyof NumbersEntry, value: number) => {
      const next = entries.map((e) => (e.month === month ? { ...e, [field]: value } : e));
      save(next);
    },
    [entries, save],
  );

  // ─── Calculations ──────────────────────────────────────────────

  const incrementalCalcs = useMemo(
    () => entries.map((_, i) => calcIncrementalForMonth(entries, i, settings)),
    [entries, settings],
  );

  const renewalCalcs = useMemo(
    () => entries.map((_, i) => calcRenewalForMonth(entries, i, settings)),
    [entries, settings],
  );

  const annualAccel = useMemo(
    () => calcAnnualAccel(entries, settings),
    [entries, settings],
  );
  const largeRenewalAddon = useMemo(
    () => calcLargeRenewalAddon(entries, settings),
    [entries, settings],
  );
  const addonPayouts = useMemo(
    () => calcAddOnPayouts(addons, settings),
    [addons, settings],
  );

  const ytdTotals = useMemo(() => {
    const totalIncrBookings = entries.reduce((s, e) => s + e.incrementalBookings, 0);
    const totalIncrQuota = entries.reduce((s, e) => s + e.incrementalQuota, 0);
    const totalRenewed = entries.reduce((s, e) => s + e.renewedAcv, 0);
    const totalBaseComm = incrementalCalcs.reduce((s, c) => s + c.baseCommission, 0);
    const totalYtdAccel = incrementalCalcs.reduce((s, c) => s + c.ytdAccel, 0);
    const totalRenewalPayout = renewalCalcs.reduce((s, c) => s + c.monthlyPayout, 0);
    const totalIncrPayout = totalBaseComm + totalYtdAccel;
    const totalEarnings =
      totalIncrPayout +
      annualAccel +
      totalRenewalPayout +
      largeRenewalAddon +
      addonPayouts.total;

    return {
      totalIncrBookings,
      totalIncrQuota,
      totalRenewed,
      totalBaseComm,
      totalYtdAccel,
      totalIncrPayout,
      totalRenewalPayout,
      totalEarnings,
      annualAccel,
    };
  }, [entries, incrementalCalcs, renewalCalcs, annualAccel, largeRenewalAddon, addonPayouts]);

  const chartData = useMemo(
    () =>
      entries.map((e, i) => ({
        month: formatMonth(e.month),
        Bookings: e.incrementalBookings,
        Quota: e.incrementalQuota,
        Payout: Math.round(incrementalCalcs[i].baseCommission + incrementalCalcs[i].ytdAccel),
      })),
    [entries, incrementalCalcs],
  );

  if (!user) return null;
  if (!OWNER_EMAILS.includes(user.email ?? "")) return null;

  const incrAttainment =
    ytdTotals.totalIncrQuota > 0 ? ytdTotals.totalIncrBookings / ytdTotals.totalIncrQuota : 0;
  const renewalRetention = settings.u4r > 0 ? ytdTotals.totalRenewed / settings.u4r : 0;

  // Count months with bookings for pace calc
  const activeMonths = entries.filter((e) => e.incrementalBookings > 0).length;
  const monthlyPace = activeMonths > 0 ? ytdTotals.totalIncrBookings / activeMonths : 0;
  const projectedAnnual = monthlyPace * 12;
  const projectedAttainment =
    settings.annualIncrementalQuota > 0
      ? projectedAnnual / settings.annualIncrementalQuota
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 md:px-8 py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">My Numbers</h1>
            <span className="text-xs text-muted-foreground font-mono">FY27</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
        <SummaryCardRow
          ytdTotals={ytdTotals}
          settings={settings}
          incrAttainment={incrAttainment}
          renewalRetention={renewalRetention}
          projectedAttainment={projectedAttainment}
          projectedAnnual={projectedAnnual}
          monthlyPace={monthlyPace}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="incremental">Incremental ACV</TabsTrigger>
            <TabsTrigger value="renewal">Renewal ACV</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="incremental">
            <IncrementalTab
              entries={entries}
              incrementalCalcs={incrementalCalcs}
              pipelineByMonth={pipelineByMonth}
              ytdTotals={ytdTotals}
              incrAttainment={incrAttainment}
              onUpdateEntry={updateEntry}
            />
          </TabsContent>

          <TabsContent value="renewal">
            <RenewalTab
              entries={entries}
              renewalCalcs={renewalCalcs}
              pipelineByMonth={pipelineByMonth}
              ytdTotals={ytdTotals}
              renewalRetention={renewalRetention}
              largeRenewalAddon={largeRenewalAddon}
              expandedQuarter={expandedQuarter}
              onToggleQuarter={setExpandedQuarter}
              onUpdateEntry={updateEntry}
            />
          </TabsContent>

          <TabsContent value="trends">
            <MyNumbersTrendsTab
              entries={entries}
              pipelineByMonth={pipelineByMonth}
              incrementalCalcs={incrementalCalcs}
            />
          </TabsContent>
        </Tabs>

        <AddonsSection
          addons={addons}
          addonPayouts={addonPayouts}
          isOpen={showAddOns}
          onToggle={() => setShowAddOns(!showAddOns)}
          onSave={saveAddOns}
        />

        <EarningsSummary
          ytdTotals={ytdTotals}
          annualAccel={annualAccel}
          largeRenewalAddon={largeRenewalAddon}
          addonPayouts={addonPayouts}
        />

        <MyNumbersChart chartData={chartData} />
      </div>

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSave={saveSettings}
      />
    </div>
  );
}
