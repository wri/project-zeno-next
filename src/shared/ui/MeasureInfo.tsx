"use client";
import { Box } from "@chakra-ui/react";

import { InfoDefinition, InfoTitle } from "./InfoTooltip";

export function MeasureInfo() {
  return (
    <Box>
      <InfoTitle>Measure</InfoTitle>
      <InfoDefinition term="Gross">
        Gross emissions and removals with net flux depicted as a line.
      </InfoDefinition>
      <InfoDefinition term="Net">
        Only net fluxes. For categories with only emissions, gross and net
        values are the same.
      </InfoDefinition>
    </Box>
  );
}
