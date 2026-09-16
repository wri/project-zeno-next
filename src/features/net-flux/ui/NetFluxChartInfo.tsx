"use client";
import { Box, Text } from "@chakra-ui/react";

import { ChartInfoTooltip } from "@/src/shared/ui/ChartInfoTooltip";

export function NetFluxChartInfo() {
  return (
    <ChartInfoTooltip>
      <Box>
        <Text fontWeight="bold" mb="4px">
          About this chart
        </Text>
        <Text>
          This graph reports annual emissions, removals, and net flux from land
          use and agriculture between 2016 and 2024 for the specified area. Net
          flux is the difference between gross emissions and gross removals.
          Negative values are removals (sinks) and positive values are emissions
          (sources).
        </Text>
      </Box>
    </ChartInfoTooltip>
  );
}
