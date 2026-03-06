"use client";

import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { PlusCircleIcon } from "@phosphor-icons/react";

import ChartCard from "./ChartCard";
import type { DetectedChartConfig } from "../types/stream";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GreyedChartCardProps {
  config: DetectedChartConfig;
  rawData: Record<string, unknown>[];
  onExpand: () => void;
}

// ---------------------------------------------------------------------------
// Component
//
// Renders a muted, non-interactive preview of the chart with an overlay
// CTA. The actual chart is rendered at small height so the user gets a
// real preview (not a placeholder). Clicking anywhere expands it.
// ---------------------------------------------------------------------------

export default function GreyedChartCard({
  config,
  rawData,
  onExpand,
}: GreyedChartCardProps) {
  return (
    <Box
      cursor="pointer"
      onClick={onExpand}
      rounded="md"
      border="1px solid"
      borderColor="border.muted"
      overflow="hidden"
      position="relative"
      _hover={{ borderColor: "primary.300" }}
      transition="all 0.15s"
    >
      {/* Muted chart preview */}
      <Box
        opacity={0.35}
        filter="grayscale(80%)"
        pointerEvents="none"
        maxH="120px"
        overflow="hidden"
        px={4}
        py={3}
      >
        <ChartCard config={config} rawData={rawData} bare />
      </Box>

      {/* Overlay CTA */}
      <Flex
        position="absolute"
        inset={0}
        align="center"
        justify="center"
        bg="bg/60"
        borderRadius="md"
      >
        <HStack
          gap={1.5}
          color="primary.fg"
          fontSize="sm"
          px={3}
          py={1.5}
          rounded="md"
          bg="bg.panel"
          border="1px solid"
          borderColor="border"
        >
          <PlusCircleIcon size={16} />
          <Text fontWeight="medium">Click to expand</Text>
        </HStack>
      </Flex>
    </Box>
  );
}
