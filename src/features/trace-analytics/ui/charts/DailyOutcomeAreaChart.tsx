"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyMetrics } from "../../lib/analytics/daily";
import { CHART_CHROME, OUTCOME_COLORS, OUTCOME_STACK_ORDER } from "./palette";
import { formatDateTick } from "./axis";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";
import { formatCount, formatReportDate } from "../../lib/format";

interface DailyOutcomeAreaChartProps {
  readonly data: readonly DailyMetrics[];
  readonly height?: number;
}

const SERIES: readonly { key: keyof DailyMetrics; label: string }[] = [
  { key: "errorRate", label: "Error" },
  { key: "emptyRate", label: "Error (Empty)" },
  { key: "deferRate", label: "Defer" },
  { key: "softErrorRate", label: "Soft error" },
  { key: "successRate", label: "Success" },
];

/** Normalized stacked area of daily outcome rates (success stacks on top). */
export function DailyOutcomeAreaChart({
  data,
  height = 260,
}: DailyOutcomeAreaChartProps) {
  const ordered = OUTCOME_STACK_ORDER.map(
    (label) => SERIES.find((s) => s.label === label) as (typeof SERIES)[number]
  );
  // With ≤2 days an area has no width to paint — show dots at each value.
  const sparse = data.length <= 2;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={[...data]}
        stackOffset="expand"
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_CHROME.grid}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tickFormatter={formatDateTick}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={48}
        />
        <Tooltip
          content={
            <ChartTooltip
              reverse
              colorMap={OUTCOME_COLORS}
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              formatLabel={(label, payload) => {
                const date = formatReportDate(String(label ?? ""));
                const day = payload?.[0]?.payload as
                  | { traces?: number }
                  | undefined;
                // Day volume contextualises the shares — 100% of 3 traces
                // is noise, 100% of 300 is a signal.
                return typeof day?.traces === "number"
                  ? `${date} · ${formatCount(day.traces)} traces`
                  : date;
              }}
            />
          }
        />
        <Legend
          verticalAlign="top"
          itemSorter={keepPayloadOrder}
          content={<ChartLegend reverse colorMap={OUTCOME_COLORS} />}
        />
        {ordered.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="outcomes"
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            fill={OUTCOME_COLORS[s.label]}
            fillOpacity={0.9}
            dot={
              sparse
                ? { r: 3, fill: OUTCOME_COLORS[s.label], strokeWidth: 0 }
                : false
            }
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
