import { Box, Text } from "@chakra-ui/react";

/** Grey "VIEW ONLY" chip for contextual-only datasets (no analytics endpoint). */
export function ViewOnlyBadge() {
  return (
    <Box bg="#F4F5F6" borderRadius="4px" px="5px" py="2px" flexShrink={0}>
      <Text
        fontFamily="mono"
        fontSize="9px"
        lineHeight="12px"
        color="#3A4048"
        whiteSpace="nowrap"
      >
        VIEW ONLY
      </Text>
    </Box>
  );
}
