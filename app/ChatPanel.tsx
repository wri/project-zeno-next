"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";
import useChatStore from "./store/chatStore";
import useContextStore from "./store/contextStore";

const PANEL_WIDTH = 400;

function ChatPanel() {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const { messages } = useChatStore();
  const { context } = useContextStore();

  const promptsExhausted = usedPrompts >= totalPrompts;
  // Treat the seed system message as "no conversation yet" — the panel should
  // shrink to fit content (welcome / sample prompts) rather than expand to
  // full height. Once the user has sent a message, expand to full height.
  const hasUserConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  // State 2: user has selected context but not started a conversation —
  // collapse the welcome card so only the input is visible.
  const showWelcomeContent = !hasUserConversation && context.length === 0;

  const cardStyle = {
    w: { base: "full", md: `${PANEL_WIDTH}px` } as const,
    bg: "bg",
    borderRadius: { base: 0, md: "sm" } as const,
    borderWidth: { base: 0, md: "1px" } as const,
    borderColor: "border.emphasized",
    overflow: "hidden",
  };

  return (
    <Flex
      flexDir="column"
      gap="0.5"
      w={{ base: "full", md: `${PANEL_WIDTH}px` }}
    >
      {/* Top card: header + messages/welcome */}
      <Flex
        flexDir="column"
        h={hasUserConversation ? "full" : "auto"}
        maxH={hasUserConversation ? "60vh" : "none"}
        {...cardStyle}
      >
        <ChatPanelHeader />
        <Flex
          px={{ base: 2, md: 3 }}
          py={0}
          position="relative"
          flex={hasUserConversation ? "1" : "0 1 auto"}
          flexDir="column"
          minH={0}
          overflow="hidden"
        >
          {hasUserConversation && (
            <Box
              flex="1"
              overflowY="auto"
              mx={{ base: -2, md: -3 }}
              px={{ base: 4, md: 4 }}
              pt={4}
              pb={{ base: 4, md: 4 }}
              minH={0}
            >
              <ChatMessages />
            </Box>
          )}
          {showWelcomeContent && (
            <Box
              overflowY="auto"
              mx={{ base: -2, md: -3 }}
              px={{ base: 4, md: 4 }}
              pt={4}
              pb={4}
              maxH="60vh"
            >
              <ChatMessages />
            </Box>
          )}
        </Flex>
      </Flex>

      {/* Bottom card: input */}
      <Flex flexDir="column" {...cardStyle} boxShadow="none" overflow="hidden">
        {promptsExhausted && (
          <Box px={3} pt={3}>
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
        <ChatInput isChatDisabled={promptsExhausted} />
      </Flex>
    </Flex>
  );
}

export default ChatPanel;
