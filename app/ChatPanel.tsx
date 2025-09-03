"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";
import { Toaster } from "@/app/components/ui/toaster";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";

function ChatPanel() {
  const { usedPrompts, totalPrompts, isAnonymous } = useAuthStore();

  const promptsExhausted = usedPrompts >= totalPrompts;

  return (
    <Flex minH="100%" maxH="100%" flexDir="column" gridArea="chat">
      <ChatPanelHeader />
      <Flex
        p="2"
        position="relative"
        flex="1"
        flexDir="column"
        height="100%"
        overflow="auto"
      >
        <Toaster />
        <Box flex="1" overflowY="auto" height="100%" mx="-4" px="4" pb="8">
          <ChatMessages />
        </Box>
        <Box mt="auto" position="sticky" bottom="2">
          {promptsExhausted &&
            (isAnonymous ? (
              <ChatStatusInfo>
                <Text>
                  <strong>You&apos;ve used all your guest prompts.</strong>
                  <br />
                  <ChLink
                    as={Link}
                    href="/login"
                    color="blue.600"
                    textDecoration="underline"
                  >
                    Log in or sign up for free
                  </ChLink>{" "}
                  to unlock extra daily prompts, or{" "}
                  <ChLink as={Link} href="/app/classic">
                    continue without AI
                  </ChLink>
                  .
                </Text>
              </ChatStatusInfo>
            ) : (
              <ChatStatusInfo>
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
            ))}

          <ChatInput isChatDisabled={promptsExhausted} />
          <Text fontSize="xs" color="fg.subtle">
            AI can make mistakes. Please verify any outputs before using them in
            your work.
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}

export default ChatPanel;
