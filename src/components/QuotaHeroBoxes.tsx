import { useMemo } from "react";
import { DollarSign, TrendingUp, Target } from "lucide-react";
import {
  FY27_MONTHS,
  loadEntries,
} from "@/data/myNumbers/storage";

// ICR tiers for payout estimation
const ANNUAL_QUOTA = 615_000;
const ANNUAL_TI = 95_000;
const INCR_TI = ANNUAL_TI * 0.65;

function getCurrentFYMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

function getFYQuarterMonths(): string[] {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed
  // FY quarters: Q1=Feb-Apr(1-3), Q2=May-Jul(4-6), Q3=Aug-Oct(7-9), Q4=Nov-Jan(10-0)
  const fyMonth = m >= 1 ? m - 1 : 11; // months into FY (Feb=0, Jan=11)
  const qStart = Math.floor(fyMonth / 3) * 3; // quarter start in FY months
  const result: string[] = [];
  for (let i = 0; i < 3; i++) {
    const fyM = qStart + i; // FY month index (0=Feb)
    if (fyM < FY27_MONTHS.length) result.push(FY27_MONTHS[fyM]);
  }
  return result;
}

function calcPayout(bookings: number, quota: number): number {
  if (bookings <= 0 || quota <= 0) return 0;
  // Simplified: use blended ICR based on annual tier structure
  const tier1Cap = ANNUAL_QUOTA * 0.5;
  const tier2Cap = ANNUAL_QUOTA * 0.75;
  const icr1 = (INCR_TI * 0.4) / tier1Cap;
  const icr2 = (INCR_TI * 0.25) / (tier2Cap - tier1Cap);
  const icr3 = (INCR_TI * 0.35) / (ANNUAL_QUOTA - tier2Cap);

  let payout = 0;
  let remaining = bookings;
  const t1 = Math.min(remaining, tier1Cap);
  payout += t1 * icr1;
  remaining -= t1;
  if (remaining > 0) {
    const t2 = Math.min(remaining, tier2Cap - tier1Cap);
    payout += t2 * icr2;
    remaining -= t2;
  }
  if (remaining > 0) {
    payout += remaining * icr3;
  }
  return Math.round(payout);
}

function HeroBox({
  label,
  closed,
  quota,
  payout,
  icon: Icon,
  accentColor,
}: {
  label: string;
  closed: number;
  quota: number;
  payout: number;
  icon: typeof DollarSign;
  accentColor: string;
}) {
  const pct = quota > 0 ? (closed / quota) * 100 : 0;
  const pctColor =
    pct >= 100 ? "text-emerald-600 dark:text-emerald-400" :
    pct >= 70 ? "text-amber-600 dark:text-amber-400" :
    pct >= 40 ? "text-orange-600 dark:text-orange-400" :
    "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${accentColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Closed / Quota</div>
          <div className="text-lg font-black font-mono text-foreground">
            ${closed.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">/ ${quota.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">% to Goal</div>
            <div className={`text-lg font-black font-mono ${pctColor}`}>
              {pct.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-0.5">Est. Payout</div>
            <div className="text-lg font-black font-mono text-primary">
              ${payout.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function QuotaHeroBoxes() {
  const stats = useMemo(() => {
    const entries = loadEntries();
    const currentMonth = getCurrentFYMonth();
    const quarterMonths = getFYQuarterMonths();

    // Current month
    const monthEntry = entries.find(e => e.month === currentMonth);
    const monthClosed = monthEntry?.incrementalBookings ?? 0;
    const monthQuota = monthEntry?.incrementalQuota ?? 0;

    // Current quarter
    const quarterEntries = entries.filter(e => quarterMonths.includes(e.month));
    const quarterClosed = quarterEntries.reduce((s, e) => s + e.incrementalBookings, 0);
    const quarterQuota = quarterEntries.reduce((s, e) => s + e.incrementalQuota, 0);

    // Full year
    const yearClosed = entries.reduce((s, e) => s + e.incrementalBookings, 0);
    const yearQuota = entries.reduce((s, e) => s + e.incrementalQuota, 0);

    return {
      month: { closed: monthClosed, quota: monthQuota, payout: calcPayout(monthClosed, monthQuota) },
      quarter: { closed: quarterClosed, quota: quarterQuota, payout: calcPayout(quarterClosed, quarterQuota) },
      year: { closed: yearClosed, quota: yearQuota, payout: calcPayout(yearClosed, yearQuota) },
    };
  }, []);

  return (
    <div className="flex gap-4 flex-wrap">
      <HeroBox
        label="This Month"
        closed={stats.month.closed}
        quota={stats.month.quota}
        payout={stats.month.payout}
        icon={DollarSign}
        accentColor="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      />
      <HeroBox
        label="This Quarter"
        closed={stats.quarter.closed}
        quota={stats.quarter.quota}
        payout={stats.quarter.payout}
        icon={TrendingUp}
        accentColor="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      />
      <HeroBox
        label="FY27"
        closed={stats.year.closed}
        quota={stats.year.quota}
        payout={stats.year.payout}
        icon={Target}
        accentColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      />
    </div>
  );
}
