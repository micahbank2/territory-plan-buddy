import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { PendingBatch, PendingBatchEntry } from "@/lib/pendingBatch";

interface PendingOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PendingBatch | null;
  onMarkSent: (checkedEntries: PendingBatchEntry[]) => Promise<void>;
  onStartNewDraft: () => void;
  onDiscard: () => void;
}

export function PendingOutreachDialog({
  open,
  onOpenChange,
  batch,
  onMarkSent,
  onStartNewDraft,
  onDiscard,
}: PendingOutreachDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const entries = batch?.entries ?? [];

  // Group entries by prospectId
  const grouped = useMemo(() => {
    const map = new Map<string, { prospectName: string; entries: PendingBatchEntry[] }>();
    for (const entry of entries) {
      if (!map.has(entry.prospectId)) {
        map.set(entry.prospectId, { prospectName: entry.prospectName, entries: [] });
      }
      map.get(entry.prospectId)!.entries.push(entry);
    }
    return Array.from(map.values());
  }, [entries]);

  const allChecked = entries.length > 0 && checked.size === entries.length;

  const toggleAll = () => {
    if (allChecked) {
      setChecked(new Set());
    } else {
      setChecked(new Set(entries.map((e) => e.contactId)));
    }
  };

  const toggleEntry = (contactId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleMarkSent = async () => {
    setSaving(true);
    try {
      const toSend = entries.filter((e) => checked.has(e.contactId));
      await onMarkSent(toSend);
      setChecked(new Set());
      onOpenChange(false);
    } catch {
      // Error toast handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Pending Outreach</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review who you sent emails to and confirm.
          </p>
        </DialogHeader>

        {entries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-base font-semibold">No pending outreach</p>
            <p className="text-sm text-muted-foreground">
              Generate a prompt to start a batch. Your selected contacts will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={toggleAll}
              >
                {allChecked ? "Deselect All" : "Select All"}
              </span>
              <span className="text-border">|</span>
              <span
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setChecked(new Set(entries.map((e) => e.contactId)))}
              >
                Mark all as sent
              </span>
            </div>

            <ScrollArea className="max-h-[400px] pr-2">
              <div className="space-y-4">
                {grouped.map((group, gi) => (
                  <div key={group.prospectName}>
                    {gi > 0 && <Separator className="mb-3" />}
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {group.prospectName}
                    </p>
                    <div className="space-y-2">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.contactId}
                          className="flex items-center gap-3 py-1"
                        >
                          <Checkbox
                            id={entry.contactId}
                            checked={checked.has(entry.contactId)}
                            onCheckedChange={() => toggleEntry(entry.contactId)}
                          />
                          <label
                            htmlFor={entry.contactId}
                            className="flex flex-col cursor-pointer"
                          >
                            <span className="text-sm">{entry.contactName}</span>
                            <span className="text-xs text-muted-foreground">
                              {entry.contactTitle}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-1 flex items-center gap-3">
              <span
                className="text-xs text-muted-foreground underline cursor-pointer hover:text-foreground transition-colors"
                onClick={onStartNewDraft}
              >
                Start new draft
              </span>
              <span className="text-xs text-border">|</span>
              <span
                className="text-xs text-muted-foreground underline cursor-pointer hover:text-destructive transition-colors"
                onClick={onDiscard}
              >
                Didn't send these
              </span>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleMarkSent}
            disabled={checked.size === 0 || saving || entries.length === 0}
          >
            {saving ? "Saving..." : "Mark as Sent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
