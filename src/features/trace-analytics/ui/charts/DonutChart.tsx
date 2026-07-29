"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { LabelCount } from "../../lib/analytics/aggregations";
import { categoryColor, CHART_CHROME } from "./palette";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount } from "../../lib/format";

interface DonutChartProps {
  readonly data: readonly LabelCount[];
  /** Explicit label → color map; falls back to the categorical palette. */
  readonly colors?: Readonly<Record<string, string>>;
  readonly height?: number;
  /** Caption under the center total, e.g. "traces" or "users". */
  readonly centerLabel?: string;
  /** When set, slices and legend rows render clickable and report the label. */
  readonly onSliceClick?: (label: string) => void;
}

/**
 * Donut with GNW conventions: center total, white slice seams, and a
 * value-annotated legend so every slice is directly readable.
 */
export function DonutChart({
  data,
  colors,
  height = 240,
  centerLabel = "total",
  onSliceClick,
}: DonutChartProps) {
  const visible = data.filter((d) => d.count > 0);
  const total = visible.reduce((acc, d) => acc + d.count, 0);
  const safeTotal = Math.max(1, total);
  const colorFor = (label: string, index: number) =>
    colors?.[label] ?? categoryColor(index);

  return (
    <Flex align="center" gap={4} wrap="wrap">
      <Box position="relative" flex="1" minW="180px" h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible.map((d) => ({ ...d }))}
              dataKey="count"
              nameKey="label"
              startAngle={90}
              endAngle={-270}
              innerRadius="62%"
              outerRadius="92%"
              cornerRadius={3}
              paddingAngle={1.5}
              stroke={CHART_CHROME.surface}
              strokeWidth={1}
              isAnimationActive={false}
            >
              {visible.map((entry, i) => (
                <Cell
                  key={entry.label}
                  fill={colorFor(entry.label, i)}
                  cursor={onSliceClick ? "pointer" : undefined}
                  onClick={
                    onSliceClick ? () => onSliceClick(entry.label) : undefined
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(v) =>
                    `${formatCount(v)} · ${((v / safeTotal) * 100).toFixed(1)}%`
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <Flex
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          direction="column"
          pointerEvents="none"
        >
          <Text
            fontSize="xl"
            fontWeight="semibold"
            lineHeight="1"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatCount(total)}
          </Text>
          <Text fontSize="2xs" color="fg.subtle" mt={1}>
            {centerLabel}
          </Text>
        </Flex>
      </Box>

      <Flex direction="column" gap={1.5} minW="150px" maxW="55%" flex="1">
        {visible.map((entry, i) => (
          <Flex
            key={entry.label}
            align="center"
            gap={2}
            cursor={onSliceClick ? "pointer" : undefined}
            onClick={onSliceClick ? () => onSliceClick(entry.label) : undefined}
            _hover={onSliceClick ? { bg: "bg.subtle" } : undefined}
            borderRadius="sm"
          >
            <Box
              w="8px"
              h="8px"
              borderRadius="2px"
              flexShrink={0}
              bg={colorFor(entry.label, i)}
            />
            <Text
              fontSize="xs"
              color="fg.muted"
              flex="1"
              lineClamp={1}
              title={entry.label}
            >
              {entry.label}
            </Text>
            <Text
              fontSize="xs"
              fontFamily="mono"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCount(entry.count)}
            </Text>
            <Text
              fontSize="2xs"
              color="fg.subtle"
              w="42px"
              textAlign="right"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {((entry.count / safeTotal) * 100).toFixed(1)}%
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
