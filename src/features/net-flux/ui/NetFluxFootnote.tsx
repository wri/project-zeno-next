"use client";
import { Box, Text } from "@chakra-ui/react";

/**
 * The caveat card the design places below the chart card: agriculture is a
 * single 2020 figure repeated across every year, so only the land-use portion
 * of the series actually moves.
 */
export function NetFluxFootnote() {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="#DDE2F5"
      rounded="4px"
      p="12px"
    >
      <Text fontFamily="body" fontSize="13px" lineHeight="1.5" color="#656E7B">
        <Text as="span" fontWeight="semibold">
          Agriculture
        </Text>{" "}
        is a{" "}
        <Text as="span" fontWeight="semibold">
          fixed 2020 value
        </Text>{" "}
        repeated each year; only{" "}
        <Text as="span" fontWeight="semibold">
          Land Use
        </Text>{" "}
        varies year to year.
      </Text>
    </Box>
  );
}
