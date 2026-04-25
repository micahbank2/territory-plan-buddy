import type { NumbersEntry } from "@/data/myNumbers/storage";
import type { RenewalForMonthResult } from "@/data/myNumbers/comp";

interface RenewalTabProps {
  entries: NumbersEntry[];
  renewalCalcs: RenewalForMonthResult[];
  pipelineByMonth: { incr: Map<string, number>; renew: Map<string, number> };
  ytdTotals: {
    totalRenewed: number;
    totalRenewalPayout: number;
  };
  renewalRetention: number;
  largeRenewalAddon: number;
  expandedQuarter: string | null;
  onToggleQuarter: (label: string | null) => void;
  onUpdateEntry: (month: string, field: keyof NumbersEntry, value: number) => void;
}

export function RenewalTab(_props: RenewalTabProps) {
  return <div data-testid="renewal-tab-stub">TODO RenewalTab</div>;
}
