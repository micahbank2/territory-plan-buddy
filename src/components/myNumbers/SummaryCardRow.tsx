import type { CompSettings } from "@/data/myNumbers/storage";

interface SummaryCardRowProps {
  ytdTotals: {
    totalIncrBookings: number;
    totalIncrQuota: number;
    totalRenewed: number;
    totalIncrPayout: number;
    totalRenewalPayout: number;
    totalEarnings: number;
  };
  settings: CompSettings;
  incrAttainment: number;
  renewalRetention: number;
  projectedAttainment: number;
  projectedAnnual: number;
  monthlyPace: number;
}

export function SummaryCardRow(_props: SummaryCardRowProps) {
  return <div data-testid="summary-card-row-stub">TODO SummaryCardRow</div>;
}
