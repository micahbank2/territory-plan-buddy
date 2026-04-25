import type { AddOnPayoutsResult } from "@/data/myNumbers/comp";

interface EarningsSummaryProps {
  ytdTotals: {
    totalBaseComm: number;
    totalYtdAccel: number;
    totalIncrPayout: number;
    totalRenewalPayout: number;
    totalEarnings: number;
  };
  annualAccel: number;
  largeRenewalAddon: number;
  addonPayouts: AddOnPayoutsResult;
}

export function EarningsSummary(_props: EarningsSummaryProps) {
  return <div data-testid="earnings-summary-stub">TODO EarningsSummary</div>;
}
