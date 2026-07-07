"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistogramBin } from "../../lib/analytics/stats";
import { CHART_CHROME } from "./palette";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount } from "../../lib/format";

interface HistogramChartProps {
  readonly bins: readonly HistogramBin[];
  /** Formats bin edges for the axis/tooltip, e.g. $0.0100 or 1.5s. */
  readonly edgeFormatter?: (value: number) => string;
  readonly height?: number;
  readonly color?: string;
  readonly countLabel?: string;
}

function defaultEdgeFormatter(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Histogram over pre-computed bins with rounded bar tops. */
export function HistogramChart({
  bins,
  edgeFormatter = defaultEdgeFormatter,
  height = 220,
  color = "#3361C0",
  countLabel = "Traces",
}: HistogramChartProps) {
  // Unit-width integer bins hold exactly one value — label "3", not "3 – 4".
  const unitBins =
    bins.length > 0 &&
    bins.every(
      (b) => Number.isInteger(b.binStart) && b.binEnd - b.binStart === 1
    );
  const data = bins.map((bin) => ({
    ...bin,
    label: unitBins
      ? edgeFormatter(bin.binStart)
      : `${edgeFormatter(bin.binStart)} – ${edgeFormatter(bin.binEnd)}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        barCategoryGap={2}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_CHROME.grid}
          vertical={false}
        />
        <XAxis
          dataKey="binStart"
          tickFormatter={edgeFormatter}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: CHART_CHROME.axisTick }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "rgba(19, 23, 26, 0.05)" }}
          content={
            <ChartTooltip
              formatValue={(v) => formatCount(v)}
              formatLabel={(_, payload) => {
                const first = payload?.[0]?.payload as
                  | { label?: string }
                  | undefined;
                return first?.label ?? "";
              }}
            />
          }
        />
        <Bar
          dataKey="count"
          name={countLabel}
          fill={color}
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
