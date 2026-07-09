"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryColor, CHART_CHROME } from "./palette";
import { formatCount } from "../../lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

export interface HorizontalBarDatum {
  readonly label: string;
  readonly count: number;
  /** Optional category used for bar coloring (e.g. AOI type). */
  readonly category?: string | null;
}

interface HorizontalBarChartProps {
  readonly data: readonly HorizontalBarDatum[];
  readonly color?: string;
  readonly barHeight?: number;
  /** When set, bars render clickable and report the clicked datum. */
  readonly onBarClick?: (datum: HorizontalBarDatum) => void;
}

/** Horizontal count bars with direct value labels at the bar ends. */
export function HorizontalBarChart({
  data,
  color = "#3361C0",
  barHeight = 24,
  onBarClick,
}: HorizontalBarChartProps) {
  const height = Math.max(200, Math.min(800, data.length * barHeight + 40));
  const categories = [
    ...new Set(data.map((d) => d.category).filter(Boolean)),
  ] as string[];

  return (
    <>
      {categories.length > 0 ? (
        <ChartLegend
          payload={categories.map((c, i) => ({
            value: c,
            color: categoryColor(i),
          }))}
        />
      ) : null}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
          barCategoryGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_CHROME.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
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
                formatValue={(v) => formatCount(v)}
                formatLabel={(_, payload) => {
                  const first = payload?.[0]?.payload as
                    | { label?: string; category?: string | null }
                    | undefined;
                  return first?.category
                    ? `${first.label} · ${first.category}`
                    : (first?.label ?? "");
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            name="Count"
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={
                  entry.category
                    ? categoryColor(categories.indexOf(entry.category))
                    : color
                }
                cursor={onBarClick ? "pointer" : undefined}
                onClick={onBarClick ? () => onBarClick(entry) : undefined}
              />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v: unknown) => formatCount(Number(v))}
              style={{
                fontSize: 10,
                fill: CHART_CHROME.axisTick,
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
