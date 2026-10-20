import { Box, Flex, Text } from "@chakra-ui/react";

import { ALERT_COLORS } from "./alertColors";

/**
 * "New alerts this week": the Figma Badge (sm, pill colour, dot, error) a
 * dashboard card carries when its area had integrated alerts in the latest
 * full alert week. One badge per dashboard whatever the alert sources; the
 * dashboard itself tells them apart.
 */
export default function NewAlertsBadge() {
  return (
    <Flex
      align="center"
      gap="4px"
      pl="6px"
      pr="8px"
      py="2px"
      bg={ALERT_COLORS.bg}
      borderWidth="1px"
      borderColor={ALERT_COLORS.border}
      rounded="4px"
    >
      <Box
        aria-hidden
        flexShrink={0}
        boxSize="6px"
        rounded="full"
        bg={ALERT_COLORS.dot}
      />
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="18px"
        color={ALERT_COLORS.text}
        whiteSpace="nowrap"
      >
        New alerts this week
      </Text>
    </Flex>
  );
}
