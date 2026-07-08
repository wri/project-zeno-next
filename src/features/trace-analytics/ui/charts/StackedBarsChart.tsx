"use client";

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
import { CHART_CHROME } from "./palette";
import { formatDateTick } from "./axis";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";
import { formatCount, formatReportDate } from "../../lib/format";

export interface BarSeries {
  readonly key: string;
  readonly label: string;
  readonly color: string;
}

interface StackedBarsChartProps {
  readonly data: readonly Record<string, unknown>[];
  readonly series: readonly BarSeries[];
  readonly height?: number;
  readonly yLabel?: string;
}

/** Stacked daily bars with white seams between segments. */
export function StackedBarsChart({
  data,
  series,
  height = 220,
  yLabel,
}: StackedBarsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={[...data]}
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        barCategoryGap={2}
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
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={yLabel ? 56 : 44}
          label={
            yLabel
              ? {
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  fill: CHART_CHROME.axisTick,
                }
              : undefined
          }
        />
        <Tooltip
          cursor={{ fill: "rgba(19, 23, 26, 0.05)" }}
          content={
            <ChartTooltip
              reverse
              formatValue={(v) => formatCount(v)}
              formatLabel={(label) => formatReportDate(String(label ?? ""))}
            />
          }
        />
        <Legend
          verticalAlign="top"
          itemSorter={keepPayloadOrder}
          content={<ChartLegend reverse />}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={s.color}
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
