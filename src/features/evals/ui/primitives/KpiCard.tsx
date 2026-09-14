"use client";

import { Flex, Text } from "@chakra-ui/react";

interface KpiCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  /** Category colour for the value (the design tints KPI numbers). */
  readonly valueColor?: string;
}

/** Headline KPI tile: mono eyebrow + tabular value (adapted from
 * trace-analytics without the delta/sparkline machinery). */
export function KpiCard({ label, value, hint, valueColor }: KpiCardProps) {
  return (
    <Flex
      direction="column"
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      px={4}
      py={3}
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
      <Text
        fontSize="2xl"
        fontWeight="semibold"
        lineHeight="short"
        color={valueColor}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="fg.subtle" mt={1} lineClamp={2} title={hint}>
          {hint}
        </Text>
      ) : null}
    </Flex>
  );
}
