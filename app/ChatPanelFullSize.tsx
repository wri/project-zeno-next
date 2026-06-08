"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";

const PANEL_WIDTH = 428;

interface ChatPanelFullSizeProps {
  onToggleSize: () => void;
}

function ChatPanelFullSize({ onToggleSize }: ChatPanelFullSizeProps) {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const promptsExhausted = usedPrompts >= totalPrompts;

  return (
    <Flex
      flexDir="column"
      flex="1 1 auto"
      minH={0}
      h="100%"
      w={{ base: "full", md: `${PANEL_WIDTH}px` }}
      bg="bg"
      borderWidth={{ base: 0, md: "1px" }}
      borderColor="border.emphasized"
      borderRadius={{ base: 0, md: "sm" }}
      overflow="hidden"
      pointerEvents="auto"
    >
      <ChatPanelHeader
        isFullSize={true}
        hasConversation={true}
        onToggleSize={onToggleSize}
      />

      {/* Scrollable message area */}
      <Box flex="1" overflowY="auto" px={3} pt={3} pb={0} minH={0}>
        <ChatMessages />
      </Box>

      {/* Input area — rounded bordered box. pb matches ChatPanelCompact so the
          input box bottom lines up across compact/full-size. */}
      <Flex flexDir="column" flexShrink={0} px={3} pb={1}>
        {promptsExhausted && (
          <Box pb={2}>
            <ChatStatusInfo type="error">
              <Text>
                <strong>
                  You&apos;ve reached today&apos;s limit of {totalPrompts}{" "}
                  prompts.
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
        )}
        <ChatInput isChatDisabled={promptsExhausted} bordered />
      </Flex>

      {/* Disclaimer — compact single-line at bottom */}
      <Box
        px={2}
        py={0}
        mt={1}
        fontSize="10px"
        lineHeight="20px"
        color="#131619"
        opacity={0.5}
        flexShrink={0}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        AI makes mistakes. Verify outputs and do not share sensitive or
        personal information.
      </Box>
    </Flex>
  );
}

export default ChatPanelFullSize;
