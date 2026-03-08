import { useState } from "react";
import { INDUSTRIES, STAGES, COMPETITORS, TIERS } from "@/data/prospects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onApply: (changes: Record<string, string | number | null>) => void;
}

export function BulkEditDialog({ open, onOpenChange, selectedCount, onApply }: BulkEditDialogProps) {
  const [industry, setIndustry] = useState("");
  const [outreach, setOutreach] = useState("");
  const [priority, setPriority] = useState("");
  const [tier, setTier] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [status, setStatus] = useState("");
  const [locationCount, setLocationCount] = useState("");

  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";
  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";

  const handleApply = () => {
    const changes: Record<string, string | number | null> = {};
    if (industry) changes.industry = industry;
    if (outreach) changes.outreach = outreach;
    if (priority) changes.priority = priority === "__none__" ? "" : priority;
    if (tier) changes.tier = tier === "__none__" ? "" : tier;
    if (competitor) changes.competitor = competitor === "__none__" ? "" : competitor;
    if (status) changes.status = status;
    if (locationCount) changes.locationCount = parseInt(locationCount);
    onApply(changes);
    resetForm();
  };

  const resetForm = () => {
    setIndustry(""); setOutreach(""); setPriority(""); setTier(""); setCompetitor(""); setStatus(""); setLocationCount("");
  };

  const changeCount = [industry, outreach, priority, tier, competitor, status, locationCount].filter(Boolean).length;

  const changeSummary = [
    industry && `Industry: ${industry}`,
    outreach && `Outreach: ${outreach}`,
    priority && `Priority: ${priority === "__none__" ? "None" : priority}`,
    tier && `Tier: ${tier === "__none__" ? "None" : tier}`,
    competitor && `Competitor: ${competitor === "__none__" ? "None" : competitor}`,
    status && `Status: ${status}`,
    locationCount && `Locations: ${locationCount}`,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Prospects</DialogTitle>
          <DialogDescription>Only fields you fill in will be updated. Leave blank to keep unchanged.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Outreach Stage</label>
              <select value={outreach} onChange={(e) => setOutreach(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                <option value="__none__">None</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
                <option value="Dead">Dead</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                <option value="__none__">None</option>
                {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Competitor</label>
              <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                <option value="__none__">None</option>
                {COMPETITORS.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                <option value="">— Keep —</option>
                <option value="Prospect">Prospect</option>
                <option value="Churned">Churned</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Location Count</label>
            <input type="number" value={locationCount} onChange={(e) => setLocationCount(e.target.value)} placeholder="Leave blank to keep" className={inputClass} />
          </div>
        </div>

        {changeSummary.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <p className="font-semibold text-foreground mb-1">Apply to {selectedCount} prospects:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {changeSummary.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleApply} disabled={changeCount === 0} className="glow-blue">
            Apply to {selectedCount} Prospects
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
