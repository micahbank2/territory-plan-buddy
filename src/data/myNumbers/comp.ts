import type { NumbersEntry, CompSettings, AddOns } from "./storage";

// ─── Commission Math Engine (stubs for RED phase) ────────────────────
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
  _entries: NumbersEntry[],
  _monthIndex: number,
  _settings: CompSettings,
): IncrementalForMonthResult {
  throw new Error("not implemented");
}

export function calcAnnualAccel(
  _entries: NumbersEntry[],
  _settings: CompSettings,
): number {
  throw new Error("not implemented");
}

export function calcRenewalForMonth(
  _entries: NumbersEntry[],
  _monthIndex: number,
  _settings: CompSettings,
): RenewalForMonthResult {
  throw new Error("not implemented");
}

export function renewalPayoutPct(_attainment: number): number {
  throw new Error("not implemented");
}

export function calcLargeRenewalAddon(
  _entries: NumbersEntry[],
  _settings: CompSettings,
): number {
  throw new Error("not implemented");
}

export function calcAddOnPayouts(
  _addons: AddOns,
  _settings: CompSettings,
): AddOnPayoutsResult {
  throw new Error("not implemented");
}
