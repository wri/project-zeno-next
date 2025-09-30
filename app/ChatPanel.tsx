"use client";

import { useState, useEffect, useRef } from "react";
import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";

const [minWidth, maxWidth, defaultWidth] = [384, 624, 592];

function ChatPanel() {
  const { usedPrompts, totalPrompts, isAnonymous } = useAuthStore();

  const promptsExhausted = usedPrompts >= totalPrompts;
  const [width, setWidth] = useState(defaultWidth);
  const isDragged = useRef(false);

  // Function to resize chat panel and store width in localStorage
  useEffect(() => {
    if (localStorage.getItem("sidebarWidth")) {
      setWidth(Number(localStorage.getItem("sidebarWidth")));
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragged.current) {
        return;
      }

      setWidth((previousWidth) => {
        const newWidth = previousWidth + e.movementX / 2;
        const isWidthInRange = newWidth >= minWidth && newWidth <= maxWidth;

        return isWidthInRange ? newWidth : previousWidth;
      });
    };
    window.addEventListener("mousemove", onMouseMove);

    const onMouseUp = () => {
      document.body.style.userSelect = "auto";
      isDragged.current = false;
    };

    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarWidth", width.toString());
  }, [width]);

  return (
    <Flex minH="100%" maxH="100%" gridArea="chat">
      <Flex
        minH="100%"
        maxH="100%"
        w={{ base: "full", md: `${width}px` }}
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
          <Box mt="auto" position="sticky" bottom="2">
            {promptsExhausted &&
              (isAnonymous ? (
                <ChatStatusInfo type="error">
                  <Text>
                    <strong>You&apos;ve used all your guest prompts.</strong>
                    <br />
                    <ChLink
                      as={Link}
                      href="/login"
                      color="primary.emphasized"
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
      {/* Panel resize handle */}
      <Box
        h="full"
        title="Drag to resize chat panel"
        w={1 / 2}
        ml={-1}
        mr={1 / 2}
        zIndex={10}
        bg="transparent"
        transition="background 0.16s ease"
        _hover={{
          bg: "primary.500/50",
          cursor: "col-resize",
        }}
        _active={{
          bg: "primary.500/50",
          cursor: "col-resize",
        }}
        onMouseDown={() => {
          isDragged.current = true;
        }}
        hideBelow="md"
      />
    </Flex>
  );
}

export default ChatPanel;
