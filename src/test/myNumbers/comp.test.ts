import { describe, it, expect } from "vitest";
import {
  calcIncrementalForMonth,
  calcAnnualAccel,
  calcRenewalForMonth,
  renewalPayoutPct,
  calcLargeRenewalAddon,
  calcAddOnPayouts,
} from "@/data/myNumbers/comp";
import {
  DEFAULT_SETTINGS,
  FY27_MONTHS,
  type NumbersEntry,
  type AddOns,
  type CompSettings,
} from "@/data/myNumbers/storage";

// Helper: build 12 zeroed entries from FY27_MONTHS, with optional per-month overrides.
function makeEntries(
  overrides: Partial<Record<string, Partial<NumbersEntry>>> = {},
): NumbersEntry[] {
  return FY27_MONTHS.map((m) => ({
    month: m,
    incrementalQuota: 0,
    incrementalBookings: 0,
    renewedAcv: 0,
    pipelineAcv: 0,
    meetings: 0,
    outreachTouches: 0,
    ...(overrides[m] ?? {}),
  }));
}

describe("calcIncrementalForMonth", () => {
  it("returns zero baseCommission and zero ytdAccel when there are no bookings", () => {
    const entries = makeEntries();
    const result = calcIncrementalForMonth(entries, 0, DEFAULT_SETTINGS);
    expect(result.baseCommission).toBe(0);
    expect(result.ytdAccel).toBe(0);
    expect(result.monthT1).toBe(0);
    expect(result.monthT2).toBe(0);
    expect(result.monthT3).toBe(0);
    expect(result.ytdBookings).toBe(0);
  });

  it("tier1 boundary: $307,500 in month 0 lands entirely in tier1", () => {
    // tier1Cap = 615_000 * 0.5 = 307_500
    const entries = makeEntries({ "2026-02": { incrementalBookings: 307_500 } });
    const result = calcIncrementalForMonth(entries, 0, DEFAULT_SETTINGS);
    expect(result.monthT1).toBe(307_500);
    expect(result.monthT2).toBe(0);
    expect(result.monthT3).toBe(0);
    // icr1 = (95_000 * 0.65 * 0.4) / 307_500 = 24_700 / 307_500
    // baseCommission = 307_500 * icr1 = 24_700
    expect(result.baseCommission).toBeCloseTo(24_700, 0);
  });

  it("tier2 boundary: $461,250 cumulative crosses tier1Cap into tier2", () => {
    // First month fills tier1 completely; second month overflows into tier2.
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 307_500 },
      "2026-03": { incrementalBookings: 153_750 },
    });
    const result = calcIncrementalForMonth(entries, 1, DEFAULT_SETTINGS);
    // month 1's allocation: tier1 already full, so all 153_750 goes to tier2
    expect(result.monthT1).toBe(0);
    expect(result.monthT2).toBe(153_750);
    expect(result.monthT3).toBe(0);
    // icr2 = (95_000 * 0.65 * 0.25) / (461_250 - 307_500) = 15_437.5 / 153_750
    // baseCommission = 153_750 * icr2 = 15_437.5
    expect(result.baseCommission).toBeCloseTo(15_437.5, 0);
    expect(result.ytdBookings).toBe(461_250);
  });

  it("tier3 boundary: $700,000 cumulative crosses tier2Cap into tier3", () => {
    // First month fills tier1+tier2 fully (461_250); next month puts 238_750 into tier3.
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 461_250 },
      "2026-03": { incrementalBookings: 238_750 },
    });
    const result = calcIncrementalForMonth(entries, 1, DEFAULT_SETTINGS);
    expect(result.monthT1).toBe(0);
    expect(result.monthT2).toBe(0);
    expect(result.monthT3).toBe(238_750);
    expect(result.ytdBookings).toBe(700_000);
  });

  it("YTD accelerator OFF when ytdBookings <= ytdQuota", () => {
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 10_000, incrementalQuota: 30_000 },
    });
    const result = calcIncrementalForMonth(entries, 0, DEFAULT_SETTINGS);
    expect(result.ytdAccel).toBe(0);
    expect(result.ytdBookings).toBeLessThanOrEqual(result.ytdQuota);
  });

  it("YTD accelerator ON: pays 3% of this month's bookings when YTD ahead", () => {
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 100_000, incrementalQuota: 30_000 },
    });
    const result = calcIncrementalForMonth(entries, 0, DEFAULT_SETTINGS);
    // ytdBookings (100k) > ytdQuota (30k) → 3% of 100k = 3_000
    expect(result.ytdAccel).toBeCloseTo(3_000, 0);
  });
});

describe("calcAnnualAccel", () => {
  it("returns 0 when total attainment is at or below 100%", () => {
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 615_000 }, // exactly 100%
    });
    expect(calcAnnualAccel(entries, DEFAULT_SETTINGS)).toBe(0);
  });

  it("pays 8% above quota when attainment is in (100%, 125%]", () => {
    // 120% attainment → above = 615_000 * 0.20 = 123_000
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 738_000 },
    });
    const aboveQuota = 738_000 - 615_000;
    expect(calcAnnualAccel(entries, DEFAULT_SETTINGS)).toBeCloseTo(aboveQuota * 0.08, 0);
  });

  it("pays 10% above quota when attainment is in (125%, 150%]", () => {
    // 140% attainment → above = 615_000 * 0.40 = 246_000
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 861_000 },
    });
    const aboveQuota = 861_000 - 615_000;
    expect(calcAnnualAccel(entries, DEFAULT_SETTINGS)).toBeCloseTo(aboveQuota * 0.10, 0);
  });

  it("pays 12% above quota when attainment is above 150%", () => {
    // 160% attainment → above = 615_000 * 0.60 = 369_000
    const entries = makeEntries({
      "2026-02": { incrementalBookings: 984_000 },
    });
    const aboveQuota = 984_000 - 615_000;
    expect(calcAnnualAccel(entries, DEFAULT_SETTINGS)).toBeCloseTo(aboveQuota * 0.12, 0);
  });
});

describe("renewalPayoutPct", () => {
  it("returns 0 at zero attainment", () => {
    expect(renewalPayoutPct(0)).toBe(0);
  });

  it("returns 25% at 50% attainment", () => {
    // att=50 → (50 * 0.5) / 100 = 0.25
    expect(renewalPayoutPct(0.5)).toBeCloseTo(0.25, 5);
  });

  it("returns 50% at 75% attainment", () => {
    // att=75 → (25 + 25*1.0) / 100 = 0.50
    expect(renewalPayoutPct(0.75)).toBeCloseTo(0.5, 5);
  });

  it("returns 100% at 100% attainment", () => {
    // att=100 → (50 + 25*2.0) / 100 = 1.00
    expect(renewalPayoutPct(1.0)).toBeCloseTo(1.0, 5);
  });

  it("clamps at 200% even when attainment is well above 100%", () => {
    // att=150 → (100 + 50*8.0)/100 = 5.0 → clamped to 2.0
    expect(renewalPayoutPct(1.5)).toBeCloseTo(2.0, 5);
  });
});

describe("calcLargeRenewalAddon", () => {
  it("returns 0 when U4R is below $1.5M", () => {
    const lowU4R: CompSettings = { ...DEFAULT_SETTINGS, u4r: 1_000_000 };
    const entries = makeEntries({
      "2026-02": { renewedAcv: 900_000 }, // 90% retention
    });
    expect(calcLargeRenewalAddon(entries, lowU4R)).toBe(0);
  });

  it("returns 0 when retention rate is below the target", () => {
    // u4r = 2_924_263, target = 0.86 → goal = ~2_514_866
    // total renewed = 1_000_000 → retention ≈ 0.342 < 0.86
    const entries = makeEntries({
      "2026-02": { renewedAcv: 1_000_000 },
    });
    expect(calcLargeRenewalAddon(entries, DEFAULT_SETTINGS)).toBe(0);
  });

  it("pays 0.5% of total renewed when both U4R floor and retention floor are met", () => {
    // u4r = 2_924_263, target = 0.86 → need >= 2_514_866 renewed
    // 2_600_000 renewed → retention ~88.9% ≥ 86%
    const entries = makeEntries({
      "2026-02": { renewedAcv: 2_600_000 },
    });
    expect(calcLargeRenewalAddon(entries, DEFAULT_SETTINGS)).toBeCloseTo(2_600_000 * 0.005, 2);
  });
});

describe("calcAddOnPayouts", () => {
  const baseAddOns: AddOns = {
    multiYearDuration: 0,
    multiYearRenewedAcv: 0,
    multiYearIncrementalAcv: 0,
    servicesAmount: 0,
    kongExitAcv: 0,
    kongBlendedAcv: 0,
  };

  it("multi-year duration <=12 months: renewal and incremental components are 0", () => {
    const addons: AddOns = {
      ...baseAddOns,
      multiYearDuration: 12,
      multiYearRenewedAcv: 100_000,
      multiYearIncrementalAcv: 50_000,
    };
    const result = calcAddOnPayouts(addons, DEFAULT_SETTINGS);
    expect(result.multiYearRenewal).toBe(0);
    expect(result.multiYearIncremental).toBe(0);
  });

  it("multi-year duration >12 months: pays 0.5% of renewed and 5% of incremental", () => {
    const addons: AddOns = {
      ...baseAddOns,
      multiYearDuration: 24,
      multiYearRenewedAcv: 100_000,
      multiYearIncrementalAcv: 50_000,
    };
    const result = calcAddOnPayouts(addons, DEFAULT_SETTINGS);
    expect(result.multiYearRenewal).toBeCloseTo(500, 2); // 100_000 * 0.005
    expect(result.multiYearIncremental).toBeCloseTo(2_500, 2); // 50_000 * 0.05
  });

  it("services payout = 5% of servicesAmount", () => {
    const addons: AddOns = { ...baseAddOns, servicesAmount: 20_000 };
    const result = calcAddOnPayouts(addons, DEFAULT_SETTINGS);
    expect(result.services).toBeCloseTo(1_000, 2);
  });

  it("Kong delta clamps to 0 when blendedAcv >= exitAcv", () => {
    const addons: AddOns = {
      ...baseAddOns,
      kongExitAcv: 50_000,
      kongBlendedAcv: 60_000, // blended > exit → delta should clamp to 0
    };
    const result = calcAddOnPayouts(addons, DEFAULT_SETTINGS);
    expect(result.kong).toBe(0);
  });

  it("Kong delta * baseICR pays correctly when exitAcv > blendedAcv", () => {
    // baseICR = (95_000 * 0.65) / 615_000 = 61_750 / 615_000
    // delta = 100_000 - 60_000 = 40_000 → kong = 40_000 * (61_750/615_000)
    const addons: AddOns = {
      ...baseAddOns,
      kongExitAcv: 100_000,
      kongBlendedAcv: 60_000,
    };
    const result = calcAddOnPayouts(addons, DEFAULT_SETTINGS);
    const expected = 40_000 * (61_750 / 615_000);
    expect(result.kong).toBeCloseTo(expected, 2);
  });
});

describe("calcRenewalForMonth", () => {
  it("returns zero monthlyPayout when no ACV has been renewed", () => {
    const entries = makeEntries();
    const result = calcRenewalForMonth(entries, 0, DEFAULT_SETTINGS);
    expect(result.monthlyPayout).toBe(0);
    expect(result.cumRenewed).toBe(0);
    expect(result.attainment).toBe(0);
  });
});
