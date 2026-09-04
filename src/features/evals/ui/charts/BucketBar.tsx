"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { fmtPct } from "../../lib/format";
import { BUCKET_BAR_COLOR, BUCKET_BAR_MUTED } from "./palette";

export interface BucketBarItem {
  readonly label: string;
  /** 0..1, or null when nothing was evaluated. */
  readonly value: number | null;
  /** Small print after the percentage (e.g. "407/438 checks"). */
  readonly detail?: string;
}

/** Horizontal rate bars, one per bucket. Null values render as unmeasured
 * (never as 0% — an unmeasured bucket must look unmeasured). */
export function BucketBar({ items }: { readonly items: BucketBarItem[] }) {
  return (
    <Flex direction="column" gap={2}>
      {items.map((item) => (
        <Flex key={item.label} align="center" gap={3}>
          <Text
            fontSize="xs"
            fontFamily="mono"
            color="fg.subtle"
            w="6.5rem"
            flexShrink={0}
          >
            {item.label}
          </Text>
          <Box
            flex="1"
            h="10px"
            bg="bg.muted"
            borderRadius="full"
            overflow="hidden"
          >
            {item.value !== null ? (
              <Box
                h="full"
                w={`${Math.round(item.value * 100)}%`}
                bg={BUCKET_BAR_COLOR}
                borderRadius="full"
              />
            ) : (
              <Box h="full" w="full" bg={BUCKET_BAR_MUTED} opacity={0.3} />
            )}
          </Box>
          <Text
            fontSize="xs"
            w="3.5rem"
            textAlign="right"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {item.value !== null ? fmtPct(item.value, 0) : "n/a"}
          </Text>
          {item.detail ? (
            <Text fontSize="xs" color="fg.subtle" w="8rem" flexShrink={0}>
              {item.detail}
            </Text>
          ) : null}
        </Flex>
      ))}
    </Flex>
  );
}
