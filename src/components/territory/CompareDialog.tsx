import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { scoreProspect, type Prospect } from "@/data/prospects";
import { useMemo } from "react";

export interface CompareDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: Prospect[];
  selected: Set<any>;
}

export function CompareDialog({ open, onOpenChange, data, selected }: CompareDialogProps) {
  const comparisonProspects = useMemo(
    () => data.filter((p) => selected.has(p.id)).map((p) => ({ ...p, score: scoreProspect(p) })),
    [data, selected]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare Prospects</DialogTitle>
          <DialogDescription>Side-by-side comparison of selected prospects.</DialogDescription>
        </DialogHeader>
        {comparisonProspects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metric</th>
                  {comparisonProspects.map((p) => (
                    <th key={p.id} className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Score", (p: any) => p.score],
                    ["Locations", (p: any) => p.locationCount || "—"],
                    ["Industry", (p: any) => p.industry || "—"],
                    ["Tier", (p: any) => p.tier || "—"],
                    ["Outreach", (p: any) => p.outreach],
                    ["Priority", (p: any) => p.priority || "—"],
                    ["Competitor", (p: any) => p.competitor || "—"],
                    ["Status", (p: any) => p.status],
                    ["Est. Revenue", (p: any) =>
                      p.estimatedRevenue ? `$${p.estimatedRevenue.toLocaleString()}` : "—"],
                    ["Contacts", (p: any) => (p.contacts || []).length],
                    ["Interactions", (p: any) => (p.interactions || []).length],
                  ] as [string, (p: any) => any][]
                ).map(([label, fn]) => (
                  <tr key={label} className="border-b border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground font-medium">{label}</td>
                    {comparisonProspects.map((p) => (
                      <td key={p.id} className="px-4 py-2 text-xs text-foreground">
                        {fn(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
