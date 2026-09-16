"use client";
import { Box, Text } from "@chakra-ui/react";

export function MeasureInfo() {
  return (
    <Box>
      <Text fontWeight="bold" mb="4px">
        Measure
      </Text>
      <Text mb="8px">
        <Text as="span" fontWeight="bold">
          Gross:
        </Text>{" "}
        Gross emissions and removals with net flux depicted as a line.
      </Text>
      <Text>
        <Text as="span" fontWeight="bold">
          Net:
        </Text>{" "}
        Only net fluxes. For categories with only emissions, gross and net
        values are the same.
      </Text>
    </Box>
  );
}
