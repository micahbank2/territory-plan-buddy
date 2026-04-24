import { useEffect, useMemo } from "react";
import {
  STAGES,
  scoreProspect,
  type EnrichedProspect,
  type Prospect,
} from "@/data/prospects";
import { STAGE_COLORS } from "@/components/territory/agingHelpers";
import type { FilterState } from "@/components/ProspectFilterBar";

export interface UseFilteredProspectsResult {
  enriched: EnrichedProspect[];
  filtered: (EnrichedProspect & Record<string, any>)[];
  maxLocs: number;
  pipelineCounts: { stage: string; count: number; color: string }[];
  pipelineTotal: number;
  stats: {
    t: number;
    o50: number;
    o100: number;
    o500: number;
    hot: number;
    warm: number;
    cold: number;
    ch: number;
    prospects: number;
  };
}

export function useFilteredProspects(
  data: Prospect[],
  filterState: FilterState,
  sK: string,
  sD: "asc" | "desc",
  setFLocRange: (val: [number, number]) => void
): UseFilteredProspectsResult {
  const { q, fIndustry, fStatus, fCompetitor, fTier, fLocRange, fOutreach, fPriority, fDataFilter } =
    filterState;

  const enriched = useMemo<EnrichedProspect[]>(
    () => data.map((p) => ({ ...p, ps: scoreProspect(p) })),
    [data]
  );

  const maxLocs = useMemo(() => {
    return Math.max(0, ...data.map((p) => p.locationCount || 0));
  }, [data]);

  useEffect(() => {
    if (maxLocs > 0 && fLocRange[0] === 0 && fLocRange[1] === 0) {
      setFLocRange([0, maxLocs]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLocs]);

  const locFilterActive = fLocRange[0] > 0 || (fLocRange[1] > 0 && fLocRange[1] < maxLocs);

  const filtered = useMemo(() => {
    let r = [...enriched] as (EnrichedProspect & Record<string, any>)[];
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.industry || "").toLowerCase().includes(s) ||
          (p.notes || "").toLowerCase().includes(s) ||
          (p.contacts || []).some((c: any) => (c.name || "").toLowerCase().includes(s))
      );
    }
    if (fIndustry.length) r = r.filter((p) => fIndustry.includes(p.industry));
    if (fOutreach.length) r = r.filter((p) => fOutreach.includes(p.outreach));
    if (fStatus.length) r = r.filter((p) => fStatus.includes(p.status));
    if (fCompetitor.length) r = r.filter((p) => fCompetitor.includes(p.competitor));
    if (fTier.length) r = r.filter((p) => fTier.includes(p.tier));
    if (fPriority.length) r = r.filter((p) => fPriority.includes(p.priority));
    if (fDataFilter.length) {
      r = r.filter((p) => {
        return fDataFilter.every((f) => {
          switch (f) {
            case "Has Contacts":
              return (p.contacts?.length || 0) > 0;
            case "No Contacts":
              return !p.contacts?.length;
            case "Has Notes":
              return (p.noteLog?.length || 0) > 0 || !!p.notes;
            case "No Notes":
              return !p.noteLog?.length && !p.notes;
            case "Has Interactions":
              return (p.interactions?.length || 0) > 0;
            case "No Interactions":
              return !p.interactions?.length;
            case "Has Tasks":
              return (p.tasks?.length || 0) > 0;
            case "No Tasks":
              return !p.tasks?.length;
            case "Has AI Readiness":
              return p.aiReadinessScore != null;
            case "No AI Readiness":
              return p.aiReadinessScore == null;
            case "Has Website":
              return !!p.website;
            case "No Website":
              return !p.website;
            default:
              return true;
          }
        });
      });
    }
    if (locFilterActive)
      r = r.filter((p) => {
        const lc = p.locationCount || 0;
        return lc >= fLocRange[0] && lc <= fLocRange[1];
      });
    r.sort((a, b) => {
      let av = a[sK],
        bv = b[sK];
      if (av == null) av = sD === "desc" ? -Infinity : Infinity;
      if (bv == null) bv = sD === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") {
        av = av.toLowerCase();
        bv = (bv || "").toLowerCase();
      }
      return sD === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : av > bv ? -1 : av < bv ? 1 : 0;
    });
    return r;
  }, [enriched, q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fPriority, fDataFilter, fLocRange, locFilterActive, sK, sD]);

  const pipelineCounts = useMemo(() => {
    return STAGES.map((stage) => ({
      stage,
      count: data.filter((p) => p.outreach === stage).length,
      color: STAGE_COLORS[stage] || "hsl(220, 14%, 70%)",
    })).filter((s) => s.count > 0);
  }, [data]);
  const pipelineTotal = data.length;

  const stats = useMemo(() => {
    const wl = data.filter((p) => p.locationCount && p.locationCount > 0);
    return {
      t: data.length,
      o50: wl.filter((p) => p.locationCount! >= 50).length,
      o100: wl.filter((p) => p.locationCount! >= 100).length,
      o500: wl.filter((p) => p.locationCount! >= 500).length,
      hot: data.filter((p) => p.priority === "Hot").length,
      warm: data.filter((p) => p.priority === "Warm").length,
      cold: data.filter((p) => p.priority === "Cold").length,
      ch: data.filter((p) => p.status === "Churned").length,
      prospects: data.filter((p) => p.status === "Prospect").length,
    };
  }, [data]);

  return { enriched, filtered, maxLocs, pipelineCounts, pipelineTotal, stats };
}

// ─── Quota Summary (reads from localStorage, same keys as MyNumbersPage) ───
export function useQuotaSummary(opportunities: any[]) {
  return useMemo(() => {
    const FY27_MONTHS = [
      "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
      "2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01",
    ];
    const DEFAULT_QUOTAS: Record<string, number> = {
      "2026-02": 30000, "2026-03": 30000, "2026-04": 60000, "2026-05": 38000,
      "2026-06": 38000, "2026-07": 77000, "2026-08": 40000, "2026-09": 40000,
      "2026-10": 80000, "2026-11": 48000, "2026-12": 48000, "2027-01": 96000,
    };
    const DEFAULT_SETTINGS = {
      annualIncrementalQuota: 615000,
      u4r: 2924263,
      retentionTarget: 0.86,
      annualTI: 95000,
      incrementalSplit: 0.65,
      renewalSplit: 0.35,
    };

    let entries: any[];
    try {
      const stored = localStorage.getItem("my_numbers_v2");
      entries = stored
        ? JSON.parse(stored)
        : FY27_MONTHS.map((m) => ({
            month: m,
            incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
            incrementalBookings: 0,
            renewedAcv: 0,
          }));
    } catch {
      entries = FY27_MONTHS.map((m) => ({
        month: m,
        incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
        incrementalBookings: 0,
        renewedAcv: 0,
      }));
    }

    let settings: any;
    try {
      const stored = localStorage.getItem("my_numbers_settings");
      settings = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      settings = DEFAULT_SETTINGS;
    }

    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const qStarts = ["2026-02", "2026-05", "2026-08", "2026-11"];
    let curQIdx = -1;
    for (let i = qStarts.length - 1; i >= 0; i--) {
      if (curMonth >= qStarts[i]) {
        curQIdx = i;
        break;
      }
    }
    const qStart = qStarts[Math.max(0, curQIdx)];
    const qEnd = qStarts[curQIdx + 1] || "2027-02";

    const monthEntry = entries.find((e: any) => e.month === curMonth);
    const monthBooked = monthEntry?.incrementalBookings ?? 0;
    const monthQuota = monthEntry?.incrementalQuota ?? 0;

    const qEntries = entries.filter((e: any) => e.month >= qStart && e.month < qEnd);
    const qBooked = qEntries.reduce((s: number, e: any) => s + (e.incrementalBookings ?? 0), 0);
    const qQuota = qEntries.reduce((s: number, e: any) => s + (e.incrementalQuota ?? 0), 0);

    const ytdBooked = entries.reduce((s: number, e: any) => s + (e.incrementalBookings ?? 0), 0);
    const ytdQuota = entries.reduce((s: number, e: any) => s + (e.incrementalQuota ?? 0), 0);
    const ytdRenewed = entries.reduce((s: number, e: any) => s + (e.renewedAcv ?? 0), 0);

    const CLOSED_STAGES = new Set(["Won", "Closed Won", "Closed Lost", "Dead"]);
    const totalPipeline = opportunities
      .filter((o) => !CLOSED_STAGES.has(o.stage) && o.close_date)
      .reduce(
        (s, o) =>
          s +
          (o.type === "Renewal"
            ? o.potential_value || 0
            : o.incremental_acv ?? o.potential_value ?? 0),
        0
      );

    const fmtK = (n: number) => "$" + Math.round(n).toLocaleString();

    return {
      monthBooked,
      monthQuota,
      qBooked,
      qQuota,
      ytdBooked,
      ytdQuota,
      ytdRenewed,
      totalPipeline,
      fmtK,
      settings,
    };
  }, [opportunities]);
}
