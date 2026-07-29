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
import type { DailyOutcomeMix } from "../../lib/analytics/daily";
import { CHART_CHROME, OUTCOME_COLORS, OUTCOME_STACK_ORDER } from "./palette";
import { formatDateTick } from "./axis";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";
import { formatCount, formatReportDate } from "../../lib/format";

interface DailyOutcomeAreaChartProps {
  readonly data: readonly DailyOutcomeMix[];
  /** Outcome labels bottom → top; also the color-map keys. */
  readonly order?: readonly string[];
  readonly colors?: Readonly<Record<string, string>>;
  readonly height?: number;
  /** When set, clicking the chart reports the clicked day (YYYY-MM-DD). */
  readonly onDayClick?: (date: string) => void;
}

/** Normalized stacked area of daily outcome shares (best on top). */
export function DailyOutcomeAreaChart({
  data,
  order = OUTCOME_STACK_ORDER,
  colors = OUTCOME_COLORS,
  height = 260,
  onDayClick,
}: DailyOutcomeAreaChartProps) {
  // Pre-compute each label's share per day so the tooltip reads a share (not a
  // raw count); stackOffset="expand" then keeps the stack normalized to 100%.
  const rows = data.map((d) => {
    const total = Math.max(1, d.total);
    const shares = Object.fromEntries(
      order.map((label) => [label, (d.counts[label] ?? 0) / total])
    );
    return { date: d.date, traces: d.total, ...shares };
  });
  // With ≤2 days an area has no width to paint — show dots at each value.
  const sparse = data.length <= 2;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={rows}
        stackOffset="expand"
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        style={onDayClick ? { cursor: "pointer" } : undefined}
        onClick={
          onDayClick
            ? (state: unknown) => {
                // Chart-level clicks carry the hovered category as activeLabel.
                const label = (state as { activeLabel?: unknown })?.activeLabel;
                if (typeof label === "string" && label) onDayClick(label);
              }
            : undefined
        }
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
              colorMap={colors}
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
          content={<ChartLegend reverse colorMap={colors} />}
        />
        {order.map((label) => (
          <Area
            key={label}
            type="monotone"
            dataKey={label}
            name={label}
            stackId="outcomes"
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            fill={colors[label]}
            fillOpacity={0.9}
            dot={sparse ? { r: 3, fill: colors[label], strokeWidth: 0 } : false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
