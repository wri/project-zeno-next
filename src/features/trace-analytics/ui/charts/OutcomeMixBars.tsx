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
  /** Outcome labels left → right (best → worst); also the color-map keys. */
  readonly order?: readonly string[];
  readonly colors?: Readonly<Record<string, string>>;
  readonly barHeight?: number;
  /**
   * When set, segments render clickable and report (row label, outcome label)
   * — i.e. one cohort × outcome cell of the mix.
   */
  readonly onSegmentClick?: (label: string, outcome: string) => void;
}

export function OutcomeMixBars({
  data,
  order = OUTCOME_SEVERITY_ORDER,
  colors = OUTCOME_COLORS,
  barHeight = 28,
  onSegmentClick,
}: OutcomeMixBarsProps) {
  const height = Math.max(160, Math.min(600, data.length * barHeight + 60));
  const rows = data.map((d) => {
    const total = Math.max(1, d.total);
    const shares = Object.fromEntries(
      order.map((label) => [label, (d.counts[label] ?? 0) / total])
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
        {order.map((label) => (
          <Bar
            key={label}
            dataKey={label}
            name={label}
            stackId="mix"
            fill={colors[label]}
            stroke={CHART_CHROME.surface}
            strokeWidth={1}
            isAnimationActive={false}
            cursor={onSegmentClick ? "pointer" : undefined}
            onClick={
              onSegmentClick
                ? (entry: unknown) => {
                    // Recharts hands the bar's datum either directly or under
                    // `payload` depending on version — read both defensively.
                    const raw = entry as {
                      payload?: { label?: unknown };
                      label?: unknown;
                    };
                    const rowLabel = raw?.payload?.label ?? raw?.label;
                    if (typeof rowLabel === "string" && rowLabel) {
                      onSegmentClick(rowLabel, label);
                    }
                  }
                : undefined
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
