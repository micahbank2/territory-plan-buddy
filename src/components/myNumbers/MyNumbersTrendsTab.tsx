import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { NumbersEntry } from "@/data/myNumbers/storage";

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface MyNumbersTrendsTabProps {
  entries: NumbersEntry[];
  pipelineByMonth: { incr: Map<string, number>; renew: Map<string, number> };
  incrementalCalcs: Array<{ ytdBookings: number; ytdQuota: number }>;
}

export function MyNumbersTrendsTab({
  entries,
  pipelineByMonth,
  incrementalCalcs,
}: MyNumbersTrendsTabProps) {
  const attainmentData = useMemo(
    () =>
      entries.map((e, i) => {
        const calc = incrementalCalcs[i];
        const ytdQuota = calc?.ytdQuota ?? 0;
        const ytdBookings = calc?.ytdBookings ?? 0;
        return {
          month: formatMonth(e.month),
          Attainment: ytdQuota > 0 ? Math.round((ytdBookings / ytdQuota) * 100) : 0,
        };
      }),
    [entries, incrementalCalcs],
  );

  const activityData = useMemo(
    () =>
      entries.map((e) => ({
        month: formatMonth(e.month),
        Meetings: e.meetings,
        Touches: e.outreachTouches,
      })),
    [entries],
  );

  const coverageData = useMemo(
    () =>
      entries.map((e) => {
        const pipeline = pipelineByMonth.incr.get(e.month) ?? 0;
        const ratio = e.incrementalQuota > 0 ? pipeline / e.incrementalQuota : 0;
        return { month: formatMonth(e.month), Coverage: Number(ratio.toFixed(2)) };
      }),
    [entries, pipelineByMonth],
  );

  return (
    <div className="space-y-6" data-testid="trends-tab">
      {/* Attainment % */}
      <div
        className="rounded-lg border border-border p-5 bg-card"
        data-testid="trends-attainment"
      >
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Quota Attainment % (cumulative YTD)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={attainmentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `${v}%`}
            />
            <RechartsTooltip formatter={(value: number) => `${value}%`} />
            <ReferenceLine
              y={100}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 3"
              label={{
                value: "100%",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="Attainment"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Rate */}
      <div
        className="rounded-lg border border-border p-5 bg-card"
        data-testid="trends-activity"
      >
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Activity Rate (per month)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <RechartsTooltip />
            <Line
              type="monotone"
              dataKey="Meetings"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Touches"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline Coverage */}
      <div
        className="rounded-lg border border-border p-5 bg-card"
        data-testid="trends-coverage"
      >
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Pipeline Coverage (monthly pipeline ÷ monthly quota)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={coverageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `${v.toFixed(1)}x`}
            />
            <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)}x`} />
            <ReferenceLine
              y={3}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 3"
              label={{
                value: "3x target",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="Coverage"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
