"use client";
import { Box, Text } from "@chakra-ui/react";
import { ChatMessage } from "@/app/types/chat";
import { PIN_TOP_OFFSET_PX } from "@/app/utils/pinnedPrompt";
import usePrefersReducedMotion from "@/app/hooks/usePrefersReducedMotion";

interface PinnedPromptProps {
  message: ChatMessage;
  onJump: () => void;
}

/**
 * Floating recap of the prompt whose answer is scrolled past the top of the
 * chat. Rendered inside a zero-height sticky wrapper so it overlays the
 * scroll area without taking part in the message flow — this keeps it
 * working in both chat panel variants, which each own their scroll
 * container. Clicking it scrolls the original bubble back into view.
 */
function PinnedPrompt({ message, onJump }: PinnedPromptProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Box position="sticky" top={`${PIN_TOP_OFFSET_PX}px`} zIndex={5} h={0}>
      <Box
        key={message.id}
        as="button"
        onClick={onJump}
        title="Scroll back to this message"
        display="block"
        w="100%"
        textAlign="left"
        cursor="pointer"
        bg="primary.50"
        color="fg"
        px={3}
        py={3}
        borderRadius="lg"
        boxShadow="lg"
        animationName={prefersReducedMotion ? undefined : "fadeSlideIn"}
        animationDuration="0.2s"
        animationTimingFunction="ease-out"
        transition="background 0.2s ease"
        _hover={{ bg: "primary.100" }}
      >
        <Text fontSize="xs" lineHeight="1.5" lineClamp={2}>
          {message.message}
        </Text>
      </Box>
    </Box>
  );
}

export default PinnedPrompt;
