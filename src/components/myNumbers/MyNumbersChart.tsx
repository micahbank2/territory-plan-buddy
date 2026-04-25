import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

interface MyNumbersChartProps {
  chartData: Array<{ month: string; Bookings: number; Quota: number; Payout: number }>;
}

export function MyNumbersChart({ chartData }: MyNumbersChartProps) {
  return (
    <div className="rounded-lg border border-border p-5 bg-card">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
        Incremental Bookings vs Quota
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
          <Line
            type="monotone"
            dataKey="Bookings"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Quota"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
