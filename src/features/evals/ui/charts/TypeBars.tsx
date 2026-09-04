"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { PRIMARY_DIMENSIONS } from "../../lib/attribution";
import type { TypeBreakdownRow } from "../../lib/matrix";
import { fmtPct } from "../../lib/format";
import { DIMENSION_COLORS, PASS_COLOR } from "./palette";

/**
 * Stacked pass + primary-failure-mix bar per query type. Rows with no
 * measured cases render grey: the taxonomy doubles as the case-authoring
 * roadmap, so "no data yet" stays visible instead of disappearing.
 */
export function TypeBars({ rows }: { readonly rows: TypeBreakdownRow[] }) {
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={3} wrap="wrap" mb={1}>
        <LegendSwatch color={PASS_COLOR} label="pass" />
        {PRIMARY_DIMENSIONS.map((dimension) => (
          <LegendSwatch
            key={dimension}
            color={DIMENSION_COLORS[dimension]}
            label={dimension}
          />
        ))}
      </Flex>
      {rows.map((row) => (
        <Flex
          key={row.label}
          align="center"
          gap={3}
          title={row.runId ? `from run ${row.runId}` : undefined}
        >
          <Text
            fontSize="xs"
            w="7.5rem"
            flexShrink={0}
            textAlign="right"
            color={row.n === 0 ? "fg.subtle" : undefined}
          >
            {row.label}
          </Text>
          <Flex
            flex="1"
            h="14px"
            bg="bg.muted"
            borderRadius="sm"
            overflow="hidden"
          >
            {row.n === 0 ? (
              <Box h="full" w="full" bg="bg.muted" opacity={0.5} />
            ) : (
              <>
                <Box
                  h="full"
                  w={`${(100 * row.pass) / row.n}%`}
                  bg={PASS_COLOR}
                />
                {PRIMARY_DIMENSIONS.map((dimension) =>
                  row.byDimension[dimension] > 0 ? (
                    <Box
                      key={dimension}
                      h="full"
                      w={`${(100 * row.byDimension[dimension]) / row.n}%`}
                      bg={DIMENSION_COLORS[dimension]}
                      title={`${dimension}: ${row.byDimension[dimension]}`}
                    />
                  ) : null
                )}
              </>
            )}
          </Flex>
          <Text
            fontSize="xs"
            w="7rem"
            flexShrink={0}
            color={row.n === 0 ? "fg.subtle" : undefined}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {row.n > 0
              ? `${fmtPct(row.rate, 0)} n=${row.n}`
              : row.hasCases
                ? "not in this run"
                : "none · n=0"}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

function LegendSwatch({
  color,
  label,
}: {
  readonly color: string;
  readonly label: string;
}) {
  return (
    <Flex align="center" gap={1}>
      <Box w="10px" h="10px" borderRadius="2px" bg={color} />
      <Text fontSize="2xs" color="fg.subtle">
        {label}
      </Text>
    </Flex>
  );
}
