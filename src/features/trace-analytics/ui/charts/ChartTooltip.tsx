"use client";

/**
 * Shared Recharts tooltip: GNW panel styling with monospace tabular values.
 * Pass as <Tooltip content={<ChartTooltip formatValue={…} />} />.
 */

import { Box, Flex, Text } from "@chakra-ui/react";

interface TooltipEntry {
  readonly name?: string | number;
  readonly value?: unknown;
  readonly color?: string;
  readonly payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  readonly active?: boolean;
  readonly label?: string | number;
  readonly payload?: readonly TooltipEntry[];
  /** Formats a numeric value for display (per-series name available). */
  readonly formatValue?: (value: number, name: string) => string;
  /** Overrides the header line (defaults to the axis label). */
  readonly formatLabel?: (
    label: string | number | undefined,
    payload: readonly TooltipEntry[]
  ) => string;
  /** Render series in reverse payload order (stacks read top-down). */
  readonly reverse?: boolean;
  /**
   * Series name → swatch color override, for charts where recharts reports a
   * non-identity color (e.g. areas with white seam strokes).
   */
  readonly colorMap?: Readonly<Record<string, string>>;
}

export function ChartTooltip({
  active,
  label,
  payload,
  formatValue,
  formatLabel,
  reverse = false,
  colorMap,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const header = formatLabel
    ? formatLabel(label, payload)
    : label != null
      ? String(label)
      : "";
  const entries = reverse ? [...payload].reverse() : payload;

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      px={3}
      py={2}
      minW="160px"
      filter="drop-shadow(0px 4px 16px rgba(0, 0, 0, 0.12))"
    >
      {header ? (
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg.muted"
          mb={1.5}
          lineClamp={1}
        >
          {header}
        </Text>
      ) : null}
      <Flex direction="column" gap={1}>
        {entries.map((entry, i) => {
          const name = String(entry.name ?? "");
          const numeric = Number(entry.value);
          const display = Number.isFinite(numeric)
            ? formatValue
              ? formatValue(numeric, name)
              : numeric.toLocaleString()
            : String(entry.value ?? "");
          return (
            <Flex key={`${name}-${i}`} align="center" gap={2}>
              <Box
                w="8px"
                h="8px"
                borderRadius="2px"
                flexShrink={0}
                bg={colorMap?.[name] ?? entry.color ?? "fg.subtle"}
              />
              <Text fontSize="xs" color="fg.muted" flex="1" lineClamp={1}>
                {name}
              </Text>
              <Text
                fontSize="xs"
                fontFamily="mono"
                fontWeight="medium"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {display}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
