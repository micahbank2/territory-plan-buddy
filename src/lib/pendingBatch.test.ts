import { describe, it, expect, beforeEach } from "vitest";
import { savePendingBatch, loadPendingBatch, clearPendingBatch } from "@/lib/pendingBatch";
import type { PendingBatch } from "@/lib/pendingBatch";

describe("pendingBatch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("savePendingBatch writes JSON to localStorage under tp-pending-outreach", () => {
    const batch: PendingBatch = {
      entries: [],
      savedAt: new Date().toISOString(),
    };
    savePendingBatch(batch);
    const raw = localStorage.getItem("tp-pending-outreach");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(batch);
  });

  it("loadPendingBatch returns parsed PendingBatch when key exists", () => {
    const batch: PendingBatch = {
      entries: [
        {
          contactId: "c1",
          contactName: "Alice",
          contactTitle: "VP Sales",
          prospectId: "p1",
          prospectName: "Acme Corp",
        },
      ],
      savedAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem("tp-pending-outreach", JSON.stringify(batch));
    const loaded = loadPendingBatch();
    expect(loaded).toEqual(batch);
  });

  it("loadPendingBatch returns null when key does not exist", () => {
    const loaded = loadPendingBatch();
    expect(loaded).toBeNull();
  });

  it("loadPendingBatch returns null when key contains invalid JSON", () => {
    localStorage.setItem("tp-pending-outreach", "not-valid-json{{{");
    const loaded = loadPendingBatch();
    expect(loaded).toBeNull();
  });

  it("clearPendingBatch removes the key from localStorage", () => {
    const batch: PendingBatch = { entries: [], savedAt: new Date().toISOString() };
    savePendingBatch(batch);
    clearPendingBatch();
    expect(localStorage.getItem("tp-pending-outreach")).toBeNull();
  });

  it("savePendingBatch stores entries with all required contact and prospect fields", () => {
    const batch: PendingBatch = {
      entries: [
        {
          contactId: "contact-uuid-123",
          contactName: "Bob Smith",
          contactTitle: "Director of IT",
          prospectId: "prospect-uuid-456",
          prospectName: "Shake Shack",
        },
      ],
      savedAt: "2026-03-30T00:00:00.000Z",
    };
    savePendingBatch(batch);
    const loaded = loadPendingBatch();
    expect(loaded?.entries[0]).toMatchObject({
      contactId: "contact-uuid-123",
      contactName: "Bob Smith",
      contactTitle: "Director of IT",
      prospectId: "prospect-uuid-456",
      prospectName: "Shake Shack",
    });
  });

  it("savePendingBatch stores savedAt as ISO timestamp string", () => {
    const isoTimestamp = "2026-03-30T12:34:56.789Z";
    const batch: PendingBatch = { entries: [], savedAt: isoTimestamp };
    savePendingBatch(batch);
    const loaded = loadPendingBatch();
    expect(loaded?.savedAt).toBe(isoTimestamp);
    // Verify it's a valid ISO string
    expect(new Date(loaded!.savedAt).toISOString()).toBe(isoTimestamp);
  });
});
