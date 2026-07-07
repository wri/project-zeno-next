"use client";

/**
 * 100% stacked horizontal bars: outcome composition per category (e.g. per
 * dataset). Segments read left → right from best (Success) to worst (Empty).
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_CHROME,
  OUTCOME_COLORS,
  OUTCOME_SEVERITY_ORDER,
} from "./palette";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";
import { formatCount } from "../../lib/format";

export interface OutcomeMixDatum {
  readonly label: string;
  readonly total: number;
  /** Outcome display label → trace count. */
  readonly counts: Readonly<Record<string, number>>;
}

interface OutcomeMixBarsProps {
  readonly data: readonly OutcomeMixDatum[];
  readonly barHeight?: number;
}

export function OutcomeMixBars({ data, barHeight = 28 }: OutcomeMixBarsProps) {
  const height = Math.max(160, Math.min(600, data.length * barHeight + 60));
  const rows = data.map((d) => {
    const total = Math.max(1, d.total);
    const shares = Object.fromEntries(
      OUTCOME_SEVERITY_ORDER.map((label) => [
        label,
        (d.counts[label] ?? 0) / total,
      ])
    );
    return { label: d.label, total: d.total, ...shares };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
        barCategoryGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_CHROME.grid}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={180}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: string) =>
            value.length > 26 ? `${value.slice(0, 25)}…` : value
          }
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "rgba(19, 23, 26, 0.05)" }}
          content={
            <ChartTooltip
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              formatLabel={(_, payload) => {
                const first = payload?.[0]?.payload as
                  | { label?: string; total?: number }
                  | undefined;
                return first
                  ? `${first.label} · ${formatCount(first.total ?? 0)} traces`
                  : "";
              }}
            />
          }
        />
        <Legend
          verticalAlign="top"
          itemSorter={keepPayloadOrder}
          content={<ChartLegend />}
        />
        {OUTCOME_SEVERITY_ORDER.map((label) => (
          <Bar
            key={label}
            dataKey={label}
            name={label}
            stackId="mix"
            fill={OUTCOME_COLORS[label]}
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
