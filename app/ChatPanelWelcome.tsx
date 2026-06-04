"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";

const PANEL_WIDTH = 400;

const cardStyle = {
  w: { base: "full", md: `${PANEL_WIDTH}px` } as const,
  bg: "bg",
  borderRadius: { base: 0, md: "sm" } as const,
  borderWidth: { base: 0, md: "1px" } as const,
  borderColor: "border.emphasized",
  overflow: "hidden",
};

interface ChatPanelWelcomeProps {
  showWelcomeContent: boolean;
}

function ChatPanelWelcome({ showWelcomeContent }: ChatPanelWelcomeProps) {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const promptsExhausted = usedPrompts >= totalPrompts;

  return (
    <Flex
      flexDir="column"
      gap="0.5"
      w={{ base: "full", md: `${PANEL_WIDTH}px` }}
    >
      {/* Top card: header + welcome content */}
      <Flex flexDir="column" flex="0 0 auto" {...cardStyle}>
        <ChatPanelHeader hasConversation={false} />
        {showWelcomeContent && (
          <Box overflowY="auto" px={4} pt={4} pb={4} maxH="60vh">
            <ChatMessages />
          </Box>
        )}
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

export default ChatPanelWelcome;
