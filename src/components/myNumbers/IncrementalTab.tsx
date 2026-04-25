import type { NumbersEntry } from "@/data/myNumbers/storage";
import type { IncrementalForMonthResult } from "@/data/myNumbers/comp";

interface IncrementalTabProps {
  entries: NumbersEntry[];
  incrementalCalcs: IncrementalForMonthResult[];
  pipelineByMonth: { incr: Map<string, number>; renew: Map<string, number> };
  ytdTotals: {
    totalIncrBookings: number;
    totalIncrQuota: number;
    totalBaseComm: number;
    totalYtdAccel: number;
    totalIncrPayout: number;
  };
  incrAttainment: number;
  onUpdateEntry: (month: string, field: keyof NumbersEntry, value: number) => void;
}

export function IncrementalTab(_props: IncrementalTabProps) {
  return <div data-testid="incremental-tab-stub">TODO IncrementalTab</div>;
}
