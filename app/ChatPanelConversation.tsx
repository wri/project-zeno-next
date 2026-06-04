"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";

const PANEL_WIDTH = 400;

function ChatPanelConversation() {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const promptsExhausted = usedPrompts >= totalPrompts;

  return (
    <Flex
      flexDir="column"
      flex="1 1 auto"
      minH={0}
      w={{ base: "full", md: `${PANEL_WIDTH}px` }}
      bg="bg"
      borderRadius={{ base: 0, md: "sm" }}
      borderWidth={{ base: 0, md: "1px" }}
      borderColor="border.emphasized"
      overflow="hidden"
    >
      <ChatPanelHeader hasConversation={true} />

      {/* Scrollable message area */}
      <Box flex="1" overflowY="auto" px={4} pt={4} pb={0} minH={0}>
        <ChatMessages />
      </Box>

      {/* Input docked inside the same card, flush on white background */}
      <Flex flexDir="column" flexShrink={0}>
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
        <ChatInput isChatDisabled={promptsExhausted} transparent />
      </Flex>
    </Flex>
  );
}

export default ChatPanelConversation;
