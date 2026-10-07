import { Box, Text } from "@chakra-ui/react";

import { InfoTitle, InfoTooltip } from "@/src/shared/ui/InfoTooltip";

export function GhgFluxTreeChartInfo() {
  return (
    <InfoTooltip>
      <Box>
        <InfoTitle>About this chart</InfoTitle>
        <Text mb="8px">
          This graph reports average annual emissions, removals, and net flux
          from land use and agriculture between 2016 and 2024 for the specified
          area. Net flux is the difference between gross emissions (positive)
          and gross removals (negative).
        </Text>
        <Text mb="8px">
          The graph is organized hierarchically, with land use and agriculture
          as the primary components.
        </Text>
        <Text color="#8A8F98" fontSize="11px">
          More information about each component can be found next to it.
        </Text>
      </Box>
    </InfoTooltip>
  );
}
