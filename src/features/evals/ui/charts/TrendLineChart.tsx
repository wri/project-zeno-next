"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendSeries } from "../../lib/trends";
import { fmtPct, fmtRunDate } from "../../lib/format";
import { CHART_CHROME, seriesColor } from "./palette";

interface TrendLineChartProps {
  readonly series: readonly TrendSeries[];
  /** Which point metric to plot. */
  readonly metric: "passRate" | "availability";
  readonly height?: number;
}

/**
 * One line per comparability group (env · ff · trials). Rows are merged on
 * run date so groups with disjoint run sets still share the x-axis.
 */
export function TrendLineChart({
  series,
  metric,
  height = 260,
}: TrendLineChartProps) {
  const rows = new Map<string, Record<string, unknown>>();
  for (const [index, group] of series.entries()) {
    for (const point of group.points) {
      const date = fmtRunDate(point.started);
      const row = rows.get(date) ?? { date };
      row[`s${index}`] = point[metric];
      row[`s${index}-run`] = point.runId;
      rows.set(date, row);
    }
  }
  const data = [...rows.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_CHROME.grid}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(value: number) => fmtPct(value, 0)}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={48}
        />
        <Tooltip
          formatter={(value) =>
            fmtPct(typeof value === "number" ? value : null)
          }
          labelFormatter={(label) => String(label)}
        />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
        {series.map((group, index) => (
          <Line
            key={group.key}
            type="monotone"
            dataKey={`s${index}`}
            name={group.label}
            stroke={seriesColor(index)}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: seriesColor(index), strokeWidth: 0 }}
            activeDot={{ r: 4, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
