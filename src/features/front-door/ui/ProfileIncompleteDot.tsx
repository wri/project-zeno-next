"use client";

import { Box } from "@chakra-ui/react";

/** The small "profile not complete" marker on the account button and menu. */
export function ProfileIncompleteDot() {
  return (
    <Box
      as="span"
      role="img"
      aria-label="Profile not complete"
      w="2"
      h="2"
      rounded="full"
      bg="primary.500"
      flexShrink={0}
    />
  );
}
