"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

export interface DefinitionRow {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  readonly description: string;
  /** Optional mono stat rendered beside the name (e.g. "7.3%"). */
  readonly stat?: string;
}

/**
 * The design artefact's definitions panel: mono eyebrow, then one row per
 * category — swatch, bold name, coloured mono stat, plain-English meaning.
 */
export function DefinitionsList({
  title = "Definitions",
  rows,
}: {
  readonly title?: string;
  readonly rows: readonly DefinitionRow[];
}) {
  return (
    <Flex direction="column" gap={3}>
      <Text
        fontSize="2xs"
        fontFamily="mono"
        textTransform="uppercase"
        letterSpacing="0.12em"
        color="fg.subtle"
      >
        {title}
      </Text>
      {rows.map((row) => (
        <Flex key={row.key} gap={2} align="flex-start">
          <Box
            w="10px"
            h="10px"
            mt="4px"
            borderRadius="2px"
            bg={row.color}
            flexShrink={0}
          />
          <Box>
            <Text fontSize="sm" as="span" fontWeight="semibold">
              {row.label}
            </Text>
            {row.stat ? (
              <Text
                as="span"
                fontSize="sm"
                fontFamily="mono"
                color={row.color}
                ml={2}
              >
                {row.stat}
              </Text>
            ) : null}
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              {row.description}
            </Text>
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}
