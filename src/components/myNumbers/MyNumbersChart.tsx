interface MyNumbersChartProps {
  chartData: Array<{ month: string; Bookings: number; Quota: number; Payout: number }>;
}

export function MyNumbersChart(_props: MyNumbersChartProps) {
  return <div data-testid="my-numbers-chart-stub">TODO MyNumbersChart</div>;
}
