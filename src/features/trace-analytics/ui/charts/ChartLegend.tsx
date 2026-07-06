"use client";

/**
 * Shared Recharts legend: compact swatch chips, top-aligned so chart heights
 * stay predictable. Pass as <Legend content={<ChartLegend />} … />.
 */

import { Flex, Text } from "@chakra-ui/react";
import { Box } from "@chakra-ui/react";

interface LegendEntry {
  readonly value?: string | number;
  readonly color?: string;
}

/**
 * Legend itemSorter that keeps series in payload order (recharts sorts by
 * "value" by default, which breaks the fixed palette/severity ordering).
 * recharts 3.1 has no `itemSorter={null}`; a constant key with the stable
 * lodash sortBy is equivalent.
 */
export const keepPayloadOrder = () => 0;

interface ChartLegendProps {
  readonly payload?: readonly LegendEntry[];
  /** Show entries last-first (stacked charts read top-down). */
  readonly reverse?: boolean;
  /**
   * Label → swatch color override. Needed when recharts derives the series
   * color from a stroke that isn't the identity color (e.g. white area seams).
   */
  readonly colorMap?: Readonly<Record<string, string>>;
}

export function ChartLegend({
  payload,
  reverse = false,
  colorMap,
}: ChartLegendProps) {
  if (!payload?.length) return null;
  const entries = reverse ? [...payload].reverse() : [...payload];
  return (
    <Flex wrap="wrap" columnGap={4} rowGap={1} justify="flex-end" pb={2}>
      {entries.map((entry, i) => (
        <Flex key={`${entry.value}-${i}`} align="center" gap={1.5}>
          <Box
            w="8px"
            h="8px"
            borderRadius="2px"
            flexShrink={0}
            bg={colorMap?.[String(entry.value)] ?? entry.color ?? "fg.subtle"}
          />
          <Text fontSize="xs" color="fg.muted">
            {String(entry.value ?? "")}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
