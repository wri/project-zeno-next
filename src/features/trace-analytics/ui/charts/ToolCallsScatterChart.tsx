"use client";

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categoryColor,
  CHART_CHROME,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  outcomeOrderIndex,
} from "./palette";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend, keepPayloadOrder } from "./ChartLegend";

interface ScatterPoint {
  readonly toolCallCount: number;
  readonly latencySeconds: number;
  readonly outcome: string;
}

interface ToolCallsScatterChartProps {
  readonly data: readonly ScatterPoint[];
  readonly height?: number;
}

/** Tool calls per trace vs latency, colored by outcome. */
export function ToolCallsScatterChart({
  data,
  height = 280,
}: ToolCallsScatterChartProps) {
  const byOutcome = new Map<string, ScatterPoint[]>();
  for (const point of data) {
    const label = OUTCOME_LABELS[point.outcome] ?? point.outcome;
    const bucket = byOutcome.get(label) ?? [];
    bucket.push(point);
    byOutcome.set(label, bucket);
  }
  // Fixed severity order so series/legend don't reshuffle with the data.
  const series = [...byOutcome.entries()].sort(
    ([a], [b]) => outcomeOrderIndex(a) - outcomeOrderIndex(b)
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.grid} />
        <XAxis
          type="number"
          dataKey="toolCallCount"
          name="Tool calls"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          label={{
            value: "Tool calls per trace",
            position: "insideBottom",
            offset: -4,
            fontSize: 11,
            fill: CHART_CHROME.axisTick,
          }}
        />
        <YAxis
          type="number"
          dataKey="latencySeconds"
          name="Latency (s)"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: CHART_CHROME.tickFontSize,
            fill: CHART_CHROME.axisTick,
          }}
          width={56}
          label={{
            value: "Latency (s)",
            angle: -90,
            position: "insideLeft",
            fontSize: 11,
            fill: CHART_CHROME.axisTick,
          }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: CHART_CHROME.axisTick }}
          content={
            <ChartTooltip
              formatValue={(v, name) =>
                name === "Latency (s)" ? `${v.toFixed(2)}s` : String(v)
              }
            />
          }
        />
        <Legend
          verticalAlign="top"
          itemSorter={keepPayloadOrder}
          content={<ChartLegend />}
        />
        {series.map(([label, points], i) => (
          <Scatter
            key={label}
            name={label}
            data={points.map((p) => ({ ...p }))}
            fill={OUTCOME_COLORS[label] ?? categoryColor(i)}
            fillOpacity={0.7}
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
