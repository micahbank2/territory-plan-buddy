import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  loadPendingBatch,
  savePendingBatch,
  clearPendingBatch,
  type PendingBatch,
  type PendingBatchEntry,
} from "@/lib/pendingBatch";
import type { Prospect, InteractionLog } from "@/data/prospects";

export interface UsePendingOutreachOptions {
  data: Prospect[];
  addInteraction: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<void>;
  update: (id: string, changes: Partial<Prospect>) => Promise<void>;
  /** Used to refresh batch when ProspectSheet closes. */
  sheetProspectId: any;
}

export function usePendingOutreach({
  data,
  addInteraction,
  update,
  sheetProspectId,
}: UsePendingOutreachOptions) {
  const [pendingBatch, setPendingBatch] = useState<PendingBatch | null>(null);
  const [showPendingOutreach, setShowPendingOutreach] = useState(false);

  useEffect(() => {
    setPendingBatch(loadPendingBatch());
  }, []);

  useEffect(() => {
    if (!sheetProspectId) {
      const batch = loadPendingBatch();
      const prevCount = pendingBatch?.entries.length ?? 0;
      const newCount = batch?.entries.length ?? 0;
      setPendingBatch(batch);
      if (batch && newCount > prevCount) {
        setTimeout(() => setShowPendingOutreach(true), 200);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetProspectId]);

  const handleMarkSent = async (
    entries: PendingBatchEntry[],
    remaining: PendingBatchEntry[]
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const prospectIds = new Set(entries.map((e) => e.prospectId));
    try {
      await Promise.all(
        entries.map(async (entry) => {
          await addInteraction(entry.prospectId, {
            type: "Email",
            date: today,
            notes: `Cold outreach to ${entry.contactName}${
              entry.contactTitle ? ` (${entry.contactTitle})` : ""
            } via Draft Emails`,
          });
        })
      );
      await Promise.all(
        Array.from(prospectIds).map(async (pid) => {
          const prospect = data.find((p) => p.id === pid);
          if (!prospect) return;
          if (prospect.outreach === "Not Started") {
            await update(pid, { outreach: "Actively Prospecting" });
          } else {
            await update(pid, { outreach: prospect.outreach });
          }
        })
      );
      if (remaining.length > 0) {
        const updated = { entries: remaining, savedAt: new Date().toISOString() };
        savePendingBatch(updated);
        setPendingBatch(updated);
      } else {
        clearPendingBatch();
        setPendingBatch(null);
      }
      toast.success(
        `Logged ${entries.length} outreach interaction${entries.length !== 1 ? "s" : ""}.${
          remaining.length > 0 ? ` ${remaining.length} still pending.` : ""
        }`
      );
    } catch (err) {
      console.error("Failed to mark outreach sent:", err);
      toast.error("Failed to log some interactions. Check your connection and try again.");
      throw err;
    }
  };

  const handleSkipContacts = (
    skipped: PendingBatchEntry[],
    remaining: PendingBatchEntry[]
  ) => {
    if (remaining.length > 0) {
      const updated = { entries: remaining, savedAt: new Date().toISOString() };
      savePendingBatch(updated);
      setPendingBatch(updated);
    } else {
      clearPendingBatch();
      setPendingBatch(null);
    }
    toast.success(
      `Removed ${skipped.length} contact${skipped.length !== 1 ? "s" : ""} — no outreach logged.${
        remaining.length > 0 ? ` ${remaining.length} still pending.` : ""
      }`
    );
  };

  const handleDiscard = () => {
    clearPendingBatch();
    setPendingBatch(null);
    setShowPendingOutreach(false);
    toast.success("Batch cleared — no outreach logged.");
  };

  const refreshFromStorage = () => setPendingBatch(loadPendingBatch());

  return {
    pendingBatch,
    showPendingOutreach,
    setShowPendingOutreach,
    handleMarkSent,
    handleSkipContacts,
    handleDiscard,
    refreshFromStorage,
  };
}
