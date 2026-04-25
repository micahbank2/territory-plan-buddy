import type { NumbersEntry, CompSettings, AddOns } from "./storage";

// ─── Commission Math Engine ──────────────────────────────────────────
// All six functions are pure: no React, no localStorage, no clock reads.

export interface IncrementalForMonthResult {
  baseCommission: number;
  ytdAccel: number;
  monthT1: number;
  monthT2: number;
  monthT3: number;
  ytdBookings: number;
  ytdQuota: number;
}

export interface RenewalForMonthResult {
  monthlyPayout: number;
  cumRenewed: number;
  retentionPct: number;
  attainment: number;
  cumPayoutPct: number;
}

export interface AddOnPayoutsResult {
  multiYearRenewal: number;
  multiYearIncremental: number;
  services: number;
  kong: number;
  total: number;
}

export function calcIncrementalForMonth(
  entries: NumbersEntry[],
  monthIndex: number,
  settings: CompSettings,
): IncrementalForMonthResult {
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

export function calcAnnualAccel(
  entries: NumbersEntry[],
  settings: CompSettings,
): number {
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

export function calcRenewalForMonth(
  entries: NumbersEntry[],
  monthIndex: number,
  settings: CompSettings,
): RenewalForMonthResult {
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

export function renewalPayoutPct(attainment: number): number {
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

export function calcLargeRenewalAddon(
  entries: NumbersEntry[],
  settings: CompSettings,
): number {
  if (settings.u4r < 1500000) return 0;
  const totalRenewed = entries.reduce((s, e) => s + e.renewedAcv, 0);
  const retentionRate = totalRenewed / settings.u4r;
  if (retentionRate < settings.retentionTarget) return 0;
  return totalRenewed * 0.005;
}

export function calcAddOnPayouts(
  addons: AddOns,
  settings: CompSettings,
): AddOnPayoutsResult {
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

  return {
    multiYearRenewal,
    multiYearIncremental,
    services,
    kong,
    total: multiYearRenewal + multiYearIncremental + services + kong,
  };
}
