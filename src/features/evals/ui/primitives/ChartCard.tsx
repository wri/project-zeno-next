"use client";

import type { ReactNode } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { SERIF_STACK } from "../charts/palette";

interface ChartCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

/** Panel frame for a chart or table section: serif display title over a
 * plain-English explainer, per the accuracy-dashboard design artefact. */
export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      p={5}
      minW={0}
    >
      <Heading
        size="md"
        fontFamily={SERIF_STACK}
        fontWeight="600"
        mb={description ? 1 : 4}
      >
        {title}
      </Heading>
      {description ? (
        <Text fontSize="sm" color="fg.muted" mb={4} maxW="52rem">
          {description}
        </Text>
      ) : null}
      {children}
    </Box>
  );
}
