"use client";
import { Box, Text } from "@chakra-ui/react";

import { ChartInfoTooltip } from "@/src/shared/ui/ChartInfoTooltip";

export function GhgFluxTreeChartInfo() {
  return (
    <ChartInfoTooltip>
      <Box>
        <Text fontWeight="bold" mb="4px">
          About this chart
        </Text>
        <Text mb="8px">
          This graph reports average annual emissions, removals, and net flux
          from land use and agriculture between 2016 and 2024 for the specified
          area. Net flux is the difference between gross emissions and gross
          removals. Negative values are removals (sinks) and positive values are
          emissions (sources).
        </Text>
        <Text mb="8px">
          The graph is organized hierarchically, with land use and agriculture
          as the primary components.
        </Text>
        <Text color="#8A8F98" fontSize="11px">
          More information about each component can be found next to it.
        </Text>
      </Box>
    </ChartInfoTooltip>
  );
}
