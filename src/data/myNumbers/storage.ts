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

// ─── Storage Readers (stubs for RED phase) ───────────────────────────

export function loadEntries(): NumbersEntry[] {
  throw new Error("not implemented");
}

export function loadSettings(): CompSettings {
  throw new Error("not implemented");
}

export function loadAddOns(): AddOns {
  throw new Error("not implemented");
}
