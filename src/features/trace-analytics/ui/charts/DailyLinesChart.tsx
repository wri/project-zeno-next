"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_CHROME } from "./palette";
import { formatDateTick } from "./axis";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";
import { formatReportDate } from "../../lib/format";

export interface LineSeries {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  /** Render dashed — for derived context series like moving averages. */
  readonly dashed?: boolean;
}

interface DailyLinesChartProps {
  readonly data: readonly Record<string, unknown>[];
  readonly series: readonly LineSeries[];
  readonly yLabel?: string;
  readonly height?: number;
  readonly valueFormatter?: (value: number) => string;
  /** Compact y-tick formatting for large values (e.g. 120000 → "120K"). */
  readonly yTickFormatter?: (value: number) => string;
  /** Optional horizontal reference line (e.g. the daily prompt limit). */
  readonly referenceY?: number;
  readonly referenceLabel?: string;
}

/** Multi-series daily line chart with hover crosshair. */
export function DailyLinesChart({
  data,
  series,
  yLabel,
  height = 260,
  valueFormatter,
  yTickFormatter,
  referenceY,
  referenceLabel,
}: DailyLinesChartProps) {
  const formatValue = (value: number) =>
    valueFormatter ? valueFormatter(value) : value.toLocaleString();
  // With ≤2 days a line is invisible (or a single stranded segment) — show dots.
  const sparse = data.length <= 2;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={[...data]}
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
          axisLine={false}
          tickLine={false}
          tickFormatter={yTickFormatter}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={yLabel ? 64 : 48}
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
          cursor={{ stroke: CHART_CHROME.axisTick, strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              formatValue={formatValue}
              formatLabel={(label) => formatReportDate(String(label ?? ""))}
            />
          }
        />
        <Legend
          verticalAlign="top"
          itemSorter={keepPayloadOrder}
          content={<ChartLegend />}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "6 3" : undefined}
            dot={sparse ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
            activeDot={{
              r: 4,
              stroke: CHART_CHROME.surface,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        ))}
        {referenceY !== undefined ? (
          <ReferenceLine
            y={referenceY}
            stroke={CHART_CHROME.reference}
            strokeDasharray="6 4"
            label={
              referenceLabel
                ? {
                    value: referenceLabel,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: CHART_CHROME.reference,
                  }
                : undefined
            }
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
