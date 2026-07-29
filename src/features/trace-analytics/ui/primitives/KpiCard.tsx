"use client";

import { Badge, Box, Flex, Text } from "@chakra-ui/react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  MinusIcon,
} from "@phosphor-icons/react";
import type { KpiDelta } from "../../lib/analytics/compare";
import { Sparkline } from "./Sparkline";

interface KpiCardProps {
  readonly label: string;
  readonly value: string;
  /** Delta vs the previous period; null hides the badge. */
  readonly delta: KpiDelta | null;
  readonly hint?: string;
  /** Daily values for the trend sparkline (omit to hide). */
  readonly spark?: readonly number[];
}

/** Headline KPI tile: mono eyebrow, tabular value, delta chip, sparkline. */
export function KpiCard({ label, value, delta, hint, spark }: KpiCardProps) {
  return (
    <Flex
      direction="column"
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      px={4}
      pt={3}
      pb={spark?.length ? 0 : 3}
      minW={0}
      overflow="hidden"
    >
      <Text
        fontSize="2xs"
        fontFamily="mono"
        textTransform="uppercase"
        letterSpacing="0.05em"
        color="fg.subtle"
        mb={1}
        lineClamp={1}
        title={label}
      >
        {label}
      </Text>
      <Flex align="baseline" gap={2} wrap="wrap">
        <Text
          fontSize="2xl"
          fontWeight="semibold"
          lineHeight="short"
          color="neutral.900"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Text>
        {delta ? (
          <Badge
            colorPalette={
              delta.direction === "flat"
                ? "gray"
                : delta.positive
                  ? "green"
                  : "red"
            }
            variant="subtle"
            fontSize="2xs"
          >
            {delta.direction === "up" ? (
              <ArrowUpRightIcon />
            ) : delta.direction === "down" ? (
              <ArrowDownRightIcon />
            ) : (
              <MinusIcon />
            )}
            {delta.text}
          </Badge>
        ) : null}
      </Flex>
      {hint ? (
        <Text fontSize="xs" color="fg.subtle" mt={1} lineClamp={1} title={hint}>
          {hint}
        </Text>
      ) : null}
      {spark?.length ? (
        <Box mt={2} mx={-4}>
          <Sparkline values={spark} />
        </Box>
      ) : null}
    </Flex>
  );
}
