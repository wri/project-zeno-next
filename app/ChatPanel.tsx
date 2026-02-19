"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";
import useExplorePanelStore from "./store/explorePanelStore";

function ChatPanel() {
  const { usedPrompts, totalPrompts, isAnonymous } = useAuthStore();
  const { panelReady } = useExplorePanelStore();
  const promptsExhausted = usedPrompts >= totalPrompts;

  return (
    <Flex minH="100%" maxH="100%" position="relative" bg="bg" w="100%">
      <Flex
        minH="100%"
        maxH="100%"
        w="100%"
        flexDir="column"
      >
        <ChatPanelHeader />
        <Flex
          px={{ base: 2, md: 4 }}
          py={0}
          position="relative"
          flex="1"
          flexDir="column"
          height="100%"
          overflow="auto"
        >
          <Box
            flex="1"
            overflowY="auto"
            height="100%"
            mx={{ base: -2, md: -4 }}
            px={{ base: 4, md: 6 }}
            pb={{ base: 4, md: 8 }}
          >
            <ChatMessages />
          </Box>
          <Box
            mt="auto"
            position="sticky"
            bottom="2"
            opacity={panelReady ? 1 : 0}
            transition="opacity 0.18s ease"
          >
            {promptsExhausted &&
              (isAnonymous ? (
                <ChatStatusInfo type="error">
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
              ))}

            <ChatInput isChatDisabled={promptsExhausted} />
            <Flex
              fontSize="xs"
              color="fg.subtle"
              hideBelow="md"
              whiteSpace="pre"
              overflowX="auto"
              gap={2}
            >
              <Text>
                AI makes mistakes. Verify outputs and do not share
                any sensitive or personal information.
              </Text>
            </Flex>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}

export default ChatPanel;
