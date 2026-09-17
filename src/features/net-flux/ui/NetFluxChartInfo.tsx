"use client";
import { Box, Text } from "@chakra-ui/react";

import { InfoTitle, InfoTooltip } from "@/src/shared/ui/InfoTooltip";

export function NetFluxChartInfo() {
  return (
    <InfoTooltip>
      <Box>
        <InfoTitle>About this chart</InfoTitle>
        <Text>
          This graph reports annual emissions, removals, and net flux from land
          use and agriculture between 2016 and 2024 for the specified area. Net
          flux is the difference between gross emissions and gross removals.
          Negative values are removals (sinks) and positive values are emissions
          (sources).
        </Text>
      </Box>
    </InfoTooltip>
  );
}
