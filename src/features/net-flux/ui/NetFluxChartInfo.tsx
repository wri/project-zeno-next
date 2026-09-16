"use client";
import { Box, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "@/app/components/ui/tooltip";

function AboutThisChart() {
  return (
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
  );
}

export function NetFluxChartInfo() {
  return (
    <Tooltip
      content={<AboutThisChart />}
      variant="dark"
      showArrow
      openDelay={200}
      positioning={{ placement: "bottom" }}
    >
      <Box as="span" display="inline-flex" cursor="pointer" flexShrink={0}>
        <InfoIcon size={16} color="#656E7B" />
      </Box>
    </Tooltip>
  );
}
