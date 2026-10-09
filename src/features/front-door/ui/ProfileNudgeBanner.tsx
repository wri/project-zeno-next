"use client";

import { Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";

export interface ProfileNudgeBannerProps {
  onOpen: () => void;
  onDismiss: () => void;
}

/** The lighter, later ask: one line above the chat input. */
export function ProfileNudgeBanner({
  onOpen,
  onDismiss,
}: ProfileNudgeBannerProps) {
  return (
    <Flex
      role="status"
      align="center"
      gap={3}
      bg="primary.25"
      borderWidth="1px"
      borderColor="primary.100"
      rounded="md"
      pl={3}
      pr={1}
      py={1.5}
    >
      <Text fontSize="sm" flex="1" minW={0}>
        Add a few details so Global Nature Watch can tailor answers to your
        work.
      </Text>
      <Button
        size="xs"
        colorPalette="primary"
        variant="outline"
        onClick={onOpen}
      >
        Add details
      </Button>
      <IconButton
        size="xs"
        variant="ghost"
        aria-label="Not now"
        onClick={onDismiss}
      >
        <XIcon />
      </IconButton>
    </Flex>
  );
}
