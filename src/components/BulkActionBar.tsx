import { useEffect, useMemo, useState } from "react";
import {
  STAGES,
  INDUSTRIES,
  COMPETITORS,
  TIERS,
  type Prospect,
  type InteractionLog,
} from "@/data/prospects";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { BulkOutreachQueue } from "@/components/BulkOutreachQueue";
import { SlidersHorizontal, Sparkles, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface BulkActionBarProps {
  selected: Set<string>;
  prospects: Prospect[];
  filteredCount?: number;
  onClearSelection: () => void;
  onSelectAllFiltered?: () => void;
  bulkUpdate: (ids: string[], changes: Partial<Prospect>) => Promise<void> | void;
  bulkRemove: (ids: string[]) => Promise<void> | void;
  addInteractionDirect: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<boolean | void>;
  /** Optional: when user updates outreach for "Not Started" prospects, bump to "Actively Prospecting". */
  update?: (id: string, changes: Partial<Prospect>) => Promise<void> | void;
}

export function BulkActionBar({
  selected,
  prospects,
  filteredCount,
  onClearSelection,
  onSelectAllFiltered,
  bulkUpdate,
  bulkRemove,
  addInteractionDirect,
  update,
}: BulkActionBarProps) {
  const [bulkStage, setBulkStage] = useState("");
  const [bulkTier, setBulkTier] = useState("");
  const [bulkIndustry, setBulkIndustry] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkCompetitor, setBulkCompetitor] = useState("");
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkOutreach, setShowBulkOutreach] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkContactedConfirm, setShowBulkContactedConfirm] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<
    { label: string; action: () => void } | null
  >(null);

  // Reset inline contacted confirmation when selection changes
  useEffect(() => {
    setShowBulkContactedConfirm(false);
  }, [selected.size]);

  const selectedProspects = useMemo(
    () => prospects.filter((p) => selected.has(p.id as string)),
    [prospects, selected]
  );

  if (selected.size === 0) return null;

  const confirmAndApplyBulk = (label: string, action: () => void) => {
    setBulkConfirm({
      label: `Apply [${label}] to ${selected.size} selected prospects?`,
      action,
    });
  };

  const handleBulkStage = () => {
    if (!bulkStage || selected.size === 0) return;
    confirmAndApplyBulk(`Outreach: ${bulkStage}`, async () => {
      await bulkUpdate(Array.from(selected), { outreach: bulkStage });
      toast.success(`Updated ${selected.size} prospects`, {
        description: `Outreach → ${bulkStage}`,
      });
      onClearSelection();
      setBulkStage("");
    });
  };

  const handleBulkTier = () => {
    if (!bulkTier || selected.size === 0) return;
    confirmAndApplyBulk(`Tier: ${bulkTier}`, async () => {
      await bulkUpdate(Array.from(selected), { tier: bulkTier });
      toast.success(`Updated ${selected.size} prospects`, {
        description: `Tier → ${bulkTier}`,
      });
      onClearSelection();
      setBulkTier("");
    });
  };

  const handleBulkIndustry = () => {
    if (!bulkIndustry || selected.size === 0) return;
    confirmAndApplyBulk(`Industry: ${bulkIndustry}`, async () => {
      await bulkUpdate(Array.from(selected), { industry: bulkIndustry } as any);
      toast.success(`Updated ${selected.size} prospects`, {
        description: `Industry → ${bulkIndustry}`,
      });
      onClearSelection();
      setBulkIndustry("");
    });
  };

  const handleBulkPriority = () => {
    if (!bulkPriority || selected.size === 0) return;
    const val = bulkPriority === "__none__" ? "" : bulkPriority;
    confirmAndApplyBulk(`Priority: ${val || "None"}`, async () => {
      await bulkUpdate(Array.from(selected), { priority: val });
      toast.success(`Updated ${selected.size} prospects`, {
        description: `Priority → ${val || "None"}`,
      });
      onClearSelection();
      setBulkPriority("");
    });
  };

  const handleBulkCompetitor = () => {
    if (!bulkCompetitor || selected.size === 0) return;
    const val = bulkCompetitor === "__none__" ? "" : bulkCompetitor;
    confirmAndApplyBulk(`Competitor: ${val || "None"}`, async () => {
      await bulkUpdate(Array.from(selected), { competitor: val } as any);
      toast.success(`Updated ${selected.size} prospects`, {
        description: `Competitor → ${val || "None"}`,
      });
      onClearSelection();
      setBulkCompetitor("");
    });
  };

  const handleBulkEditApply = (changes: Record<string, string | number | null>) => {
    const labels = Object.entries(changes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    confirmAndApplyBulk(labels, async () => {
      await bulkUpdate(Array.from(selected), changes as any);
      toast.success(`Updated ${selected.size} prospects`);
      onClearSelection();
      setShowBulkEdit(false);
    });
  };

  const handleBulkDelete = async () => {
    const count = selected.size;
    await bulkRemove(Array.from(selected));
    toast("🗑️ Cleaned up!", { description: `${count} prospects removed` });
    onClearSelection();
    setShowBulkDelete(false);
  };

  const handleBulkMarkContacted = async () => {
    const today = new Date().toISOString().split("T")[0];
    const ids = Array.from(selected);

    try {
      await Promise.all(
        ids.map(async (id) => {
          const p = prospects.find((x) => x.id === id);
          await addInteractionDirect(id, {
            type: "Email",
            date: today,
            notes: `Bulk outreach to ${p?.name || "account"} via Mark Contacted`,
          });
          if (update && p?.outreach === "Not Started") {
            await update(id, { outreach: "Actively Prospecting" });
          } else if (update && p) {
            // Touch the row so last_touched updates even when stage doesn't change
            await update(id, { outreach: p.outreach });
          }
        })
      );
      toast.success(`Logged outreach for ${ids.length} accounts.`);
      onClearSelection();
    } catch {
      toast.error("Failed to log outreach for some accounts. Reload to verify.");
    }
    setShowBulkContactedConfirm(false);
  };

  return (
    <>
      <div className="mx-4 sm:mx-8 mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3 flex-wrap animate-fade-in-up backdrop-blur-sm">
        <span className="text-sm font-semibold text-primary">
          {selected.size} selected
        </span>
        {onSelectAllFiltered && filteredCount != null && selected.size < filteredCount && (
          <button
            onClick={onSelectAllFiltered}
            className="text-xs text-primary hover:underline font-medium"
          >
            Select all {filteredCount} filtered
          </button>
        )}
        <div className="w-px h-6 bg-border" />
        <select
          value={bulkStage}
          onChange={(e) => setBulkStage(e.target.value)}
          className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
        >
          <option value="">Stage...</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {bulkStage && (
          <Button size="sm" variant="outline" onClick={handleBulkStage} className="text-xs h-7">
            Apply
          </Button>
        )}
        <select
          value={bulkTier}
          onChange={(e) => setBulkTier(e.target.value)}
          className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
        >
          <option value="">Tier...</option>
          {TIERS.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {bulkTier && (
          <Button size="sm" variant="outline" onClick={handleBulkTier} className="text-xs h-7">
            Apply
          </Button>
        )}
        <select
          value={bulkIndustry}
          onChange={(e) => setBulkIndustry(e.target.value)}
          className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
        >
          <option value="">Industry...</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {bulkIndustry && (
          <Button size="sm" variant="outline" onClick={handleBulkIndustry} className="text-xs h-7">
            Apply
          </Button>
        )}
        <select
          value={bulkPriority}
          onChange={(e) => setBulkPriority(e.target.value)}
          className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
        >
          <option value="">Priority...</option>
          <option value="__none__">None</option>
          <option value="Hot">Hot</option>
          <option value="Warm">Warm</option>
          <option value="Cold">Cold</option>
          <option value="Dead">Dead</option>
        </select>
        {bulkPriority && (
          <Button size="sm" variant="outline" onClick={handleBulkPriority} className="text-xs h-7">
            Apply
          </Button>
        )}
        <select
          value={bulkCompetitor}
          onChange={(e) => setBulkCompetitor(e.target.value)}
          className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground"
        >
          <option value="">Competitor...</option>
          <option value="__none__">None</option>
          {COMPETITORS.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {bulkCompetitor && (
          <Button size="sm" variant="outline" onClick={handleBulkCompetitor} className="text-xs h-7">
            Apply
          </Button>
        )}
        <div className="w-px h-6 bg-border" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowBulkEdit(true)}
          className="text-xs h-7 gap-1"
        >
          <SlidersHorizontal className="w-3 h-3" /> Bulk Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowBulkOutreach(true)}
          className="text-xs h-7 gap-1"
        >
          <Sparkles className="w-3 h-3" /> Generate Outreach ({selected.size})
        </Button>
        {!showBulkContactedConfirm ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkContactedConfirm(true)}
            className="text-xs h-7 gap-1"
          >
            <Mail className="w-3 h-3" /> Mark Contacted
          </Button>
        ) : (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Log Email + bump stage for {selected.size} accounts?
            </span>
            <Button size="sm" variant="default" onClick={handleBulkMarkContacted} className="text-xs h-7">
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowBulkContactedConfirm(false)}
              className="text-xs h-7"
            >
              Cancel
            </Button>
          </span>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowBulkDelete(true)}
          className="text-xs h-7 gap-1 ml-auto delete-glow"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </Button>
        <button
          onClick={onClearSelection}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Deselect
        </button>
      </div>

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        selectedCount={selected.size}
        onApply={handleBulkEditApply}
      />

      {/* Bulk Outreach Queue */}
      <BulkOutreachQueue
        open={showBulkOutreach}
        onOpenChange={setShowBulkOutreach}
        prospects={selectedProspects}
      />

      {/* Bulk Delete Confirm */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} prospects?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {selected.size} prospects and all their contacts,
              interactions, notes, and tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Confirm */}
      <AlertDialog
        open={!!bulkConfirm}
        onOpenChange={(v) => {
          if (!v) setBulkConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>{bulkConfirm?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkConfirm?.action();
                setBulkConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
