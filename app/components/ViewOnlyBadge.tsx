import { Box, Text } from "@chakra-ui/react";

export interface ViewOnlyBadgeProps {
  /** Tints the badge to match a selected (blue-tinted) catalogue card. */
  selected?: boolean;
}

/**
 * Grey "VIEW ONLY" chip for contextual-only datasets (no analytics endpoint).
 * Sits right-aligned in a catalogue card's header, so the card keeps its green
 * DATA type label like every other dataset.
 */
export function ViewOnlyBadge({ selected = false }: ViewOnlyBadgeProps) {
  return (
    <Box
      bg={selected ? "#C2CCF2" : "#F4F5F6"}
      borderRadius="4px"
      px="5px"
      py="2px"
      flexShrink={0}
    >
      <Text
        fontFamily="mono"
        fontSize="9px"
        lineHeight="12px"
        color={selected ? "#172B7A" : "#3A4048"}
        whiteSpace="nowrap"
      >
        VIEW ONLY
      </Text>
    </Box>
  );
}
