"use client";

import { ReactNode, useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

interface ChartCardProps {
  readonly title: string;
  /** One-line always-visible caption under the title. */
  readonly help?: string;
  /**
   * Richer "how to read this" content behind the ⓘ toggle: what the encodings
   * mean, what patterns to look for, caveats.
   */
  readonly info?: ReactNode;
  readonly children: ReactNode;
}

/** Panel wrapper giving every chart a consistent GNW-styled frame. */
export function ChartCard({ title, help, info, children }: ChartCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      p={4}
      minW={0}
    >
      <Flex align="flex-start" justify="space-between" gap={2} mb={3}>
        <Box minW={0}>
          <Heading as="h4" size="sm">
            {title}
          </Heading>
          {help ? (
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              {help}
            </Text>
          ) : null}
        </Box>
        {info ? (
          <IconButton
            aria-label={
              infoOpen ? "Hide chart explanation" : "How to read this chart"
            }
            title="How to read this chart"
            size="xs"
            variant="ghost"
            color={infoOpen ? "primary.fg" : "fg.subtle"}
            onClick={() => setInfoOpen((prev) => !prev)}
          >
            <InfoIcon size={16} weight={infoOpen ? "fill" : "regular"} />
          </IconButton>
        ) : null}
      </Flex>
      {info && infoOpen ? (
        <Box
          bg="bg.info"
          borderWidth="1px"
          borderColor="border.info"
          borderRadius="sm"
          px={3}
          py={2}
          mb={3}
          fontSize="xs"
          color="fg.muted"
        >
          {info}
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
