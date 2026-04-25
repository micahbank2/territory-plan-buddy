import { describe, it, expect, beforeEach } from "vitest";
import {
  loadEntries,
  loadSettings,
  FY27_MONTHS,
  DEFAULT_QUOTAS,
  DEFAULT_SETTINGS,
  ENTRIES_KEY,
  SETTINGS_KEY,
} from "@/data/myNumbers/storage";

describe("loadEntries", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns 12 fresh DEFAULT_QUOTAS-shaped entries when localStorage is empty", () => {
    const entries = loadEntries();
    expect(entries).toHaveLength(FY27_MONTHS.length);
    expect(entries[0].month).toBe(FY27_MONTHS[0]);
    expect(entries[0].incrementalQuota).toBe(DEFAULT_QUOTAS[FY27_MONTHS[0]]);
    expect(entries[0].incrementalBookings).toBe(0);
    expect(entries[0].renewedAcv).toBe(0);
    expect(entries[0].pipelineAcv).toBe(0);
    expect(entries[0].meetings).toBe(0);
    expect(entries[0].outreachTouches).toBe(0);
  });

  it("hydrates verbatim when my_numbers_v2 already has data", () => {
    const stored = [
      {
        month: "2026-02",
        incrementalQuota: 99_999,
        incrementalBookings: 50_000,
        renewedAcv: 25_000,
        pipelineAcv: 0,
        meetings: 7,
        outreachTouches: 42,
      },
    ];
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(stored));
    const entries = loadEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].incrementalQuota).toBe(99_999);
    expect(entries[0].incrementalBookings).toBe(50_000);
    expect(entries[0].meetings).toBe(7);
  });

  it("migrates legacy `my_numbers` key (quota/closedAcv) into the new shape", () => {
    const legacy = [
      {
        month: "2026-02",
        quota: 30_000,
        closedAcv: 5_000,
        pipelineAcv: 7_000,
        meetings: 3,
        outreachTouches: 10,
      },
    ];
    localStorage.setItem("my_numbers", JSON.stringify(legacy));
    const entries = loadEntries();
    expect(entries).toHaveLength(FY27_MONTHS.length);
    const feb = entries.find((e) => e.month === "2026-02");
    expect(feb).toBeDefined();
    expect(feb!.incrementalQuota).toBe(30_000);
    expect(feb!.incrementalBookings).toBe(5_000);
    expect(feb!.pipelineAcv).toBe(7_000);
    expect(feb!.meetings).toBe(3);
    expect(feb!.outreachTouches).toBe(10);
    // Migration should write the new key.
    expect(localStorage.getItem(ENTRIES_KEY)).not.toBeNull();
  });
});

describe("loadSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns DEFAULT_SETTINGS when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("shallow-merges partial JSON with DEFAULT_SETTINGS", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ u4r: 1_000_000 }));
    const merged = loadSettings();
    expect(merged.u4r).toBe(1_000_000);
    // All other fields should come from DEFAULT_SETTINGS.
    expect(merged.annualTI).toBe(DEFAULT_SETTINGS.annualTI);
    expect(merged.incrementalSplit).toBe(DEFAULT_SETTINGS.incrementalSplit);
    expect(merged.renewalSplit).toBe(DEFAULT_SETTINGS.renewalSplit);
    expect(merged.annualIncrementalQuota).toBe(DEFAULT_SETTINGS.annualIncrementalQuota);
    expect(merged.retentionTarget).toBe(DEFAULT_SETTINGS.retentionTarget);
  });
});
