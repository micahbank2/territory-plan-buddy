import type { AddOnPayoutsResult } from "@/data/myNumbers/comp";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

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

export function EarningsSummary({
  ytdTotals,
  annualAccel,
  largeRenewalAddon,
  addonPayouts,
}: EarningsSummaryProps) {
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
        FY27 Total Variable Compensation
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Incremental Base</span>
          <p className="font-mono font-semibold">{fmt(ytdTotals.totalBaseComm)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">YTD Accelerators</span>
          <p className="font-mono font-semibold">{fmt(ytdTotals.totalYtdAccel)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Annual Accelerators</span>
          <p className="font-mono font-semibold">{fmt(annualAccel)}</p>
        </div>
        <div>
          <span className="text-muted-foreground font-semibold">Total Incremental</span>
          <p className="font-mono font-bold text-base">
            {fmt(ytdTotals.totalIncrPayout + annualAccel)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Renewal Payouts</span>
          <p className="font-mono font-semibold">{fmt(ytdTotals.totalRenewalPayout)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Large Renewal Add-on</span>
          <p className="font-mono font-semibold">{fmt(largeRenewalAddon)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Other Add-ons</span>
          <p className="font-mono font-semibold">{fmt(addonPayouts.total)}</p>
        </div>
        <div>
          <span className="text-primary font-bold">TOTAL FY27 VARIABLE</span>
          <p className="font-mono font-bold text-xl text-primary">
            {fmt(ytdTotals.totalEarnings)}
          </p>
        </div>
      </div>
    </div>
  );
}
