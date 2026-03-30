const BATCH_KEY = "tp-pending-outreach";

export interface PendingBatchEntry {
  contactId: string;
  contactName: string;
  contactTitle: string;
  prospectId: string;
  prospectName: string;
}

export interface PendingBatch {
  entries: PendingBatchEntry[];
  savedAt: string; // ISO timestamp
}

export function savePendingBatch(batch: PendingBatch): void {
  localStorage.setItem(BATCH_KEY, JSON.stringify(batch));
}

export function loadPendingBatch(): PendingBatch | null {
  const raw = localStorage.getItem(BATCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingBatch(): void {
  localStorage.removeItem(BATCH_KEY);
}
