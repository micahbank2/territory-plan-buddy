import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { NumbersEntry } from "@/data/myNumbers/storage";
import type { IncrementalForMonthResult } from "@/data/myNumbers/comp";
import { EditableCell } from "./EditableCell";

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

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

export function IncrementalTab({
  entries,
  incrementalCalcs,
  pipelineByMonth,
  ytdTotals,
  incrAttainment,
  onUpdateEntry,
}: IncrementalTabProps) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold text-foreground min-w-[100px]">Month</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Quota</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Bookings</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Attain%</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Base Comm.</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[90px]">YTD Accel</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[100px]">Est. Payout</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[90px]">Pipeline</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Mtgs</TableHead>
            <TableHead className="font-semibold text-foreground text-right min-w-[70px]">Touches</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e, i) => {
            const c = incrementalCalcs[i];
            const monthAttain =
              e.incrementalQuota > 0 ? e.incrementalBookings / e.incrementalQuota : 0;
            const payout = c.baseCommission + c.ytdAccel;
            return (
              <TableRow key={e.month} className="group">
                <TableCell className="font-medium text-sm">{formatMonth(e.month)}</TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    value={e.incrementalQuota}
                    onChange={(v) => onUpdateEntry(e.month, "incrementalQuota", v)}
                    ariaLabel={`Quota for ${formatMonth(e.month)}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    value={e.incrementalBookings}
                    onChange={(v) => onUpdateEntry(e.month, "incrementalBookings", v)}
                    ariaLabel={`Bookings for ${formatMonth(e.month)}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-bold font-mono text-sm",
                      monthAttain >= 1
                        ? "text-emerald-600"
                        : monthAttain >= 0.7
                          ? "text-amber-600"
                          : "text-red-600",
                    )}
                  >
                    {Math.round(monthAttain * 100)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(c.baseCommission)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {c.ytdAccel > 0 ? fmt(c.ytdAccel) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{fmt(payout)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {fmt(pipelineByMonth.incr.get(e.month) ?? 0)}
                </TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    value={e.meetings}
                    onChange={(v) => onUpdateEntry(e.month, "meetings", v)}
                    isCurrency={false}
                    ariaLabel={`Meetings for ${formatMonth(e.month)}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    value={e.outreachTouches}
                    onChange={(v) => onUpdateEntry(e.month, "outreachTouches", v)}
                    isCurrency={false}
                    ariaLabel={`Outreach touches for ${formatMonth(e.month)}`}
                  />
                </TableCell>
              </TableRow>
            );
          })}
          {/* Totals row */}
          <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
            <TableCell className="text-sm">FY27 Total</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrQuota)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrBookings)}</TableCell>
            <TableCell className="text-right">
              <span
                className={cn(
                  "font-bold font-mono text-sm",
                  incrAttainment >= 1
                    ? "text-emerald-600"
                    : incrAttainment >= 0.7
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {Math.round(incrAttainment * 100)}%
              </span>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalBaseComm)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalYtdAccel)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{fmt(ytdTotals.totalIncrPayout)}</TableCell>
            <TableCell className="text-right font-mono text-sm">
              {fmt(Array.from(pipelineByMonth.incr.values()).reduce((s, v) => s + v, 0))}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {entries.reduce((s, e) => s + e.meetings, 0)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {entries.reduce((s, e) => s + e.outreachTouches, 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
