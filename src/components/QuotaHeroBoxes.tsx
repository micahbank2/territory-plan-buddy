import { useMemo } from "react";
import { type Opportunity } from "@/hooks/useOpportunities";
import { DollarSign, TrendingUp, Target, Award } from "lucide-react";

interface QuotaHeroBoxesProps {
  opportunities: Opportunity[];
}

// FY27: Feb 2026 – Jan 2027
const FY_START_MONTH = 1; // February (0-indexed)
const FY_START_YEAR = 2026;
const ANNUAL_INCREMENTAL_QUOTA = 615_000;
const ANNUAL_TI = 95_000;
const INCREMENTAL_TI_SHARE = 0.65; // 65% of TI
const RENEWAL_TI_SHARE = 0.35;

// ICR tiers (applied to closed ACV)
const ICR_TIERS = [
  { maxPct: 1.00, rate: 0.0803 },
  { maxPct: 1.25, rate: 0.1004 },
  { maxPct: Infinity, rate: 0.1406 },
];

function getFiscalQuarter(date: Date): { fy: number; quarter: number; qStart: Date; qEnd: Date } {
  const m = date.getMonth();
  const y = date.getFullYear();
  // FY quarters: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan
  let fyMonth: number; // 0-11 within FY
  let fy: number;
  if (m >= FY_START_MONTH) {
    fyMonth = m - FY_START_MONTH;
    fy = y + 1; // FY27 starts Feb 2026
  } else {
    fyMonth = m + 12 - FY_START_MONTH;
    fy = y;
  }
  const quarter = Math.floor(fyMonth / 3) + 1;
  // Quarter start/end dates
  const qStartMonth = FY_START_MONTH + (quarter - 1) * 3;
  const qStartYear = qStartMonth > 11 ? FY_START_YEAR + 1 : FY_START_YEAR;
  const normalizedQStart = qStartMonth % 12;
  const qEndMonth = normalizedQStart + 2;
  const qEndYear = qEndMonth > 11 ? qStartYear + 1 : qStartYear;
  const normalizedQEnd = qEndMonth % 12;

  return {
    fy,
    quarter,
    qStart: new Date(qStartYear, normalizedQStart, 1),
    qEnd: new Date(qEndYear, normalizedQEnd + 1, 0), // last day of end month
  };
}

function getFiscalYear(date: Date): { start: Date; end: Date } {
  return {
    start: new Date(FY_START_YEAR, FY_START_MONTH, 1),
    end: new Date(FY_START_YEAR + 1, FY_START_MONTH, 0), // Jan 31 2027
  };
}

function getCurrentFiscalMonth(date: Date): { start: Date; end: Date } {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}

function isClosedWon(opp: Opportunity): boolean {
  return opp.stage === "Won" || opp.stage === "Closed Won";
}

function isIncrementalDeal(opp: Opportunity): boolean {
  return opp.type === "Net New" || opp.type === "Order Form";
}

function isInDateRange(closeDate: string, start: Date, end: Date): boolean {
  if (!closeDate) return false;
  const d = new Date(closeDate + "T00:00:00");
  return d >= start && d <= end;
}

function calculatePayout(closedACV: number, quota: number): number {
  if (closedACV <= 0 || quota <= 0) return 0;
  let payout = 0;
  let remaining = closedACV;

  for (const tier of ICR_TIERS) {
    const tierCap = tier.maxPct * quota;
    const prevCap = tier === ICR_TIERS[0] ? 0 : ICR_TIERS[ICR_TIERS.indexOf(tier) - 1].maxPct * quota;
    const tierAmount = Math.min(remaining, tierCap - prevCap);
    if (tierAmount <= 0) break;
    payout += tierAmount * tier.rate;
    remaining -= tierAmount;
    if (remaining <= 0) break;
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
        {/* Progress bar */}
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

export function QuotaHeroBoxes({ opportunities }: QuotaHeroBoxesProps) {
  const now = new Date();

  const stats = useMemo(() => {
    const wonDeals = opportunities.filter(isClosedWon);
    const incrementalWon = wonDeals.filter(isIncrementalDeal);

    // Current fiscal periods
    const month = getCurrentFiscalMonth(now);
    const quarter = getFiscalQuarter(now);
    const year = getFiscalYear(now);

    // Monthly quotas (incremental only for now)
    const monthlyQuota = Math.round(ANNUAL_INCREMENTAL_QUOTA / 12);
    const quarterlyQuota = Math.round(ANNUAL_INCREMENTAL_QUOTA / 4);

    // Closed incremental ACV per period — use incremental_acv if available, else potential_value
    const getACV = (o: Opportunity) => o.incremental_acv ?? o.potential_value ?? 0;

    const monthClosed = incrementalWon
      .filter(o => isInDateRange(o.close_date, month.start, month.end))
      .reduce((s, o) => s + getACV(o), 0);

    const quarterClosed = incrementalWon
      .filter(o => isInDateRange(o.close_date, quarter.qStart, quarter.qEnd))
      .reduce((s, o) => s + getACV(o), 0);

    const yearClosed = incrementalWon
      .filter(o => isInDateRange(o.close_date, year.start, year.end))
      .reduce((s, o) => s + getACV(o), 0);

    return {
      month: {
        closed: monthClosed,
        quota: monthlyQuota,
        payout: calculatePayout(monthClosed, monthlyQuota),
      },
      quarter: {
        closed: quarterClosed,
        quota: quarterlyQuota,
        payout: calculatePayout(quarterClosed, quarterlyQuota),
      },
      year: {
        closed: yearClosed,
        quota: ANNUAL_INCREMENTAL_QUOTA,
        payout: calculatePayout(yearClosed, ANNUAL_INCREMENTAL_QUOTA),
      },
    };
  }, [opportunities]);

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
