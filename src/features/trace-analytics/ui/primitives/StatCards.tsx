"use client";

import { Box, SimpleGrid, Text } from "@chakra-ui/react";

export interface StatItem {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

interface StatCardsProps {
  readonly items: readonly StatItem[];
  readonly columns?: number;
}

/** Compact metric tiles (Streamlit st.metric equivalent). */
export function StatCards({ items, columns }: StatCardsProps) {
  return (
    <SimpleGrid
      columns={{ base: 2, md: columns ?? Math.min(items.length, 5) }}
      gap={2}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          bg="bg.subtle"
          borderRadius="sm"
          px={3}
          py={2}
          minW={0}
        >
          <Text
            fontSize="2xs"
            fontFamily="mono"
            textTransform="uppercase"
            letterSpacing="0.05em"
            color="fg.subtle"
            lineClamp={1}
            title={item.label}
          >
            {item.label}
          </Text>
          <Text
            fontSize="md"
            fontWeight="semibold"
            lineClamp={1}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {item.value}
          </Text>
          {item.hint ? (
            <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
              {item.hint}
            </Text>
          ) : null}
        </Box>
      ))}
    </SimpleGrid>
  );
}
