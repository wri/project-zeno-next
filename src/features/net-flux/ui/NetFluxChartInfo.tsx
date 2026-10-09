import { Box, Text } from "@chakra-ui/react";

import { InfoTitle, InfoTooltip } from "@/src/shared/ui/InfoTooltip";

export function NetFluxChartInfo() {
  return (
    <InfoTooltip>
      <Box>
        <InfoTitle>About this chart</InfoTitle>
        <Text mb="8px">
          This graph reports annual emissions, removals, and net flux from land
          use and agriculture between 2016 and 2024 for the specified area. Net
          flux is the difference between gross emissions (positive) and gross
          removals (negative). Emissions from vegetation are assigned to the
          year of loss or disturbance. Removals occur in any year with new
          vegetation and in years when trees are undisturbed.
        </Text>
        <Text mb="8px">
          The graph is displayed at different levels of detail, with land use
          and agriculture as the primary components.
        </Text>
        <Text color="#8A8F98" fontSize="11px">
          More information about each component can be found in the legend.
        </Text>
      </Box>
    </InfoTooltip>
  );
}
