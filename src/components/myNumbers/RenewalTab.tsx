import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FY27_MONTHS, type NumbersEntry } from "@/data/myNumbers/storage";
import type { RenewalForMonthResult } from "@/data/myNumbers/comp";
import { EditableCell } from "./EditableCell";

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

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

export function RenewalTab({
  entries,
  renewalCalcs,
  pipelineByMonth,
  ytdTotals,
  renewalRetention,
  largeRenewalAddon,
  expandedQuarter,
  onToggleQuarter,
  onUpdateEntry,
}: RenewalTabProps) {
  return (
    <>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-foreground min-w-[100px]">Quarter</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[110px]">ACV Renewed</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Cumul. Renewed</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Retention %</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Attain %</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[110px]">Cumul. Payout %</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[120px]">Qtr Payout</TableHead>
              <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Pipeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              // FY27 quarters: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan
              const quarters = [
                { label: "Q1 FY27", months: ["2026-02", "2026-03", "2026-04"] },
                { label: "Q2 FY27", months: ["2026-05", "2026-06", "2026-07"] },
                { label: "Q3 FY27", months: ["2026-08", "2026-09", "2026-10"] },
                { label: "Q4 FY27", months: ["2026-11", "2026-12", "2027-01"] },
              ];
              return quarters.map((q, qi) => {
                const qRenewed = q.months.reduce((s, m) => {
                  const e = entries.find((e) => e.month === m);
                  return s + (e?.renewedAcv ?? 0);
                }, 0);
                const lastMonthIdx = FY27_MONTHS.indexOf(q.months[q.months.length - 1]);
                const lastMonthCalc = lastMonthIdx >= 0 ? renewalCalcs[lastMonthIdx] : null;
                const priorLastMonthIdx =
                  qi > 0 ? FY27_MONTHS.indexOf(quarters[qi - 1].months[2]) : -1;
                // priorCalc reserved for future delta math; not used in this view
                void priorLastMonthIdx;
                const qPayout =
                  (lastMonthCalc?.monthlyPayout ?? 0) +
                  q.months.slice(0, -1).reduce((s, m) => {
                    const idx = FY27_MONTHS.indexOf(m);
                    return s + (idx >= 0 ? (renewalCalcs[idx]?.monthlyPayout ?? 0) : 0);
                  }, 0);
                const qPipeline = q.months.reduce(
                  (s, m) => s + (pipelineByMonth.renew.get(m) ?? 0),
                  0,
                );
                const isExpanded = expandedQuarter === q.label;
                return (
                  <React.Fragment key={q.label}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => onToggleQuarter(isExpanded ? null : q.label)}
                    >
                      <TableCell className="font-semibold text-sm">
                        <span className="flex items-center gap-1.5">
                          <ChevronRight
                            className={cn(
                              "w-3.5 h-3.5 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90",
                            )}
                          />
                          {q.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(qRenewed)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(lastMonthCalc?.cumRenewed ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {pct(lastMonthCalc?.retentionPct ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-mono text-sm",
                            (lastMonthCalc?.attainment ?? 0) >= 1
                              ? "text-emerald-600 font-bold"
                              : (lastMonthCalc?.attainment ?? 0) >= 0.7
                                ? "text-amber-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {pct(lastMonthCalc?.attainment ?? 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {pct(lastMonthCalc?.cumPayoutPct ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {fmt(qPayout)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {fmt(qPipeline)}
                      </TableCell>
                    </TableRow>
                    {isExpanded &&
                      q.months.map((m) => {
                        const e = entries.find((en) => en.month === m);
                        if (!e) return null;
                        const label = new Date(m + "-15").toLocaleString("default", {
                          month: "short",
                          year: "2-digit",
                        });
                        return (
                          <TableRow key={m} className="bg-muted/20">
                            <TableCell className="pl-8 text-xs text-muted-foreground font-medium">
                              {label}
                            </TableCell>
                            <TableCell className="text-right">
                              <EditableCell
                                value={e.renewedAcv}
                                onChange={(v) => onUpdateEntry(m, "renewedAcv", v)}
                                ariaLabel={`Renewed ACV for ${formatMonth(m)}`}
                              />
                            </TableCell>
                            <TableCell colSpan={6} />
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                );
              });
            })()}
            {/* Totals row */}
            <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
              <TableCell className="text-sm">FY27 Total</TableCell>
              <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalRenewed)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalRenewed)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{pct(renewalRetention)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-mono text-sm">
                {fmt(ytdTotals.totalRenewalPayout)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-muted-foreground">
                {fmt(Array.from(pipelineByMonth.renew.values()).reduce((s, v) => s + v, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {largeRenewalAddon > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Large Renewal Add-on:{" "}
          </span>
          <span className="font-mono">{fmt(largeRenewalAddon)}</span>
          <span className="text-muted-foreground ml-1">
            (0.5% on {fmt(ytdTotals.totalRenewed)} renewed, U4R ≥ $1.5M & retention ≥ target)
          </span>
        </div>
      )}
    </>
  );
}
