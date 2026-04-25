// ─── Types ───────────────────────────────────────────────────────────

export interface NumbersEntry {
  month: string; // YYYY-MM
  incrementalQuota: number;
  incrementalBookings: number;
  renewedAcv: number;
  pipelineAcv: number;
  meetings: number;
  outreachTouches: number;
}

export interface AddOns {
  multiYearDuration: number;
  multiYearRenewedAcv: number;
  multiYearIncrementalAcv: number;
  servicesAmount: number;
  kongExitAcv: number;
  kongBlendedAcv: number;
}

export interface CompSettings {
  annualTI: number;
  incrementalSplit: number;
  renewalSplit: number;
  annualIncrementalQuota: number;
  u4r: number;
  retentionTarget: number;
  renewalAbove100Rate: number;
}

// ─── Constants ───────────────────────────────────────────────────────

export const FY27_MONTHS: string[] = [
  "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
  "2026-12", "2027-01",
];

export const DEFAULT_QUOTAS: Record<string, number> = {
  "2026-02": 30000, "2026-03": 30000, "2026-04": 60000,
  "2026-05": 38000, "2026-06": 38000, "2026-07": 77000,
  "2026-08": 40000, "2026-09": 40000, "2026-10": 80000,
  "2026-11": 48000, "2026-12": 48000, "2027-01": 96000,
};

export const DEFAULT_SETTINGS: CompSettings = {
  annualTI: 95000,
  incrementalSplit: 0.65,
  renewalSplit: 0.35,
  annualIncrementalQuota: 615000,
  u4r: 2924263,
  retentionTarget: 0.86,
  renewalAbove100Rate: 0.08,
};

export const DEFAULT_ADDONS: AddOns = {
  multiYearDuration: 0,
  multiYearRenewedAcv: 0,
  multiYearIncrementalAcv: 0,
  servicesAmount: 0,
  kongExitAcv: 0,
  kongBlendedAcv: 0,
};

export const ENTRIES_KEY = "my_numbers_v2";
export const SETTINGS_KEY = "my_numbers_settings";
export const ADDONS_KEY = "my_numbers_addons";

// ─── Storage Readers ─────────────────────────────────────────────────

export function loadEntries(): NumbersEntry[] {
  try {
    const stored = localStorage.getItem(ENTRIES_KEY);
    if (stored) return JSON.parse(stored);

    // Migrate from old format
    const old = localStorage.getItem("my_numbers");
    if (old) {
      const oldEntries = JSON.parse(old) as any[];
      const migrated = FY27_MONTHS.map((m) => {
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
    return FY27_MONTHS.map((m) => ({
      month: m,
      incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
      incrementalBookings: 0,
      renewedAcv: 0,
      pipelineAcv: 0,
      meetings: 0,
      outreachTouches: 0,
    }));
  } catch {
    return FY27_MONTHS.map((m) => ({
      month: m,
      incrementalQuota: DEFAULT_QUOTAS[m] ?? 0,
      incrementalBookings: 0,
      renewedAcv: 0,
      pipelineAcv: 0,
      meetings: 0,
      outreachTouches: 0,
    }));
  }
}

export function loadSettings(): CompSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function loadAddOns(): AddOns {
  try {
    const stored = localStorage.getItem(ADDONS_KEY);
    return stored ? { ...DEFAULT_ADDONS, ...JSON.parse(stored) } : DEFAULT_ADDONS;
  } catch {
    return DEFAULT_ADDONS;
  }
}
