"use client";

import { Box, BoxProps, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatStatusInfo from "./components/ChatStatusInfo";
import { usePromptQuota } from "./hooks/usePromptQuota";

/**
 * The "you've hit today's prompt limit" banner shown above the chat input.
 * Self-guarding: renders nothing until the quota is exhausted. Wrapper padding
 * differs between panels, so any BoxProps passed are spread onto the wrapper.
 */
function PromptQuotaNotice(props: BoxProps) {
  const { promptsExhausted, totalPrompts } = usePromptQuota();
  if (!promptsExhausted) return null;

  return (
    <Box {...props}>
      <ChatStatusInfo type="error">
        <Text>
          <strong>
            You&apos;ve reached today&apos;s limit of {totalPrompts} prompts.
          </strong>
          <br />
          Wait until tomorrow for new prompts, or{" "}
          <ChLink as={Link} href="/app/classic">
            continue without AI
          </ChLink>
          .
        </Text>
      </ChatStatusInfo>
    </Box>
  );
}

export default PromptQuotaNotice;
