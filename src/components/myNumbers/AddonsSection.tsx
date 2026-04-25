import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AddOns } from "@/data/myNumbers/storage";
import type { AddOnPayoutsResult } from "@/data/myNumbers/comp";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

interface AddonsSectionProps {
  addons: AddOns;
  addonPayouts: AddOnPayoutsResult;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (next: AddOns) => void;
}

export function AddonsSection({
  addons,
  addonPayouts,
  isOpen,
  onToggle,
  onSave,
}: AddonsSectionProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Add-ons & SPIFFs
        {addonPayouts.total > 0 && (
          <span className="font-mono text-emerald-600 text-xs">{fmt(addonPayouts.total)}</span>
        )}
      </button>

      {isOpen && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Multi-year */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Multi-Year Deal</h3>
            <label className="text-xs text-muted-foreground block">Duration (months)</label>
            <Input
              type="number"
              value={addons.multiYearDuration || ""}
              onChange={(e) =>
                onSave({ ...addons, multiYearDuration: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
            />
            <label className="text-xs text-muted-foreground block">Renewed ACV</label>
            <Input
              type="number"
              value={addons.multiYearRenewedAcv || ""}
              onChange={(e) =>
                onSave({ ...addons, multiYearRenewedAcv: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
            />
            <label className="text-xs text-muted-foreground block">Incremental ACV</label>
            <Input
              type="number"
              value={addons.multiYearIncrementalAcv || ""}
              onChange={(e) =>
                onSave({
                  ...addons,
                  multiYearIncrementalAcv: parseInt(e.target.value) || 0,
                })
              }
              placeholder="0"
            />
            <div className="pt-2 border-t border-border text-sm">
              <div className="flex justify-between">
                <span>Renewal (0.5%)</span>
                <span className="font-mono">{fmt(addonPayouts.multiYearRenewal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Incremental (5%)</span>
                <span className="font-mono">{fmt(addonPayouts.multiYearIncremental)}</span>
              </div>
            </div>
          </div>

          {/* 1x Services */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">1x Services</h3>
            <label className="text-xs text-muted-foreground block">Services Amount</label>
            <Input
              type="number"
              value={addons.servicesAmount || ""}
              onChange={(e) =>
                onSave({ ...addons, servicesAmount: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
            />
            <div className="pt-2 border-t border-border text-sm">
              <div className="flex justify-between">
                <span>Payout (5%)</span>
                <span className="font-mono">{fmt(addonPayouts.services)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              No payout when 1x services replace MS hours w/ retention exception
            </p>
          </div>

          {/* Kong Buy-out */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Kong Buy-out SPIFF</h3>
            <label className="text-xs text-muted-foreground block">Exit ACV</label>
            <Input
              type="number"
              value={addons.kongExitAcv || ""}
              onChange={(e) =>
                onSave({ ...addons, kongExitAcv: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
            />
            <label className="text-xs text-muted-foreground block">Blended ACV</label>
            <Input
              type="number"
              value={addons.kongBlendedAcv || ""}
              onChange={(e) =>
                onSave({ ...addons, kongBlendedAcv: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
            />
            <div className="pt-2 border-t border-border text-sm">
              <div className="flex justify-between">
                <span>Delta × ICR</span>
                <span className="font-mono">{fmt(addonPayouts.kong)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
