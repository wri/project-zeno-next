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
  const [width, setWidth] = useState(
    parseInt(localStorage.getItem("sidebarWidth") ?? `${defaultWidth}`) ||
      defaultWidth
  );
  const isDragged = useRef(false);

  // Function to resize chat panel and store width in localStorage
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
      <Flex minH="100%" maxH="100%" w={`${width}px`} flexDir="column">
        <ChatPanelHeader />
        <Flex
          p="4"
          py={0}
          position="relative"
          flex="1"
          flexDir="column"
          height="100%"
          overflow="auto"
        >
          <Box flex="1" overflowY="auto" height="100%" mx="-4" px="6" pb="8">
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
            <Text
              fontSize="xs"
              color="fg.subtle"
              whiteSpace="pre"
              overflowX="auto"
            >
              AI can make mistakes. Please verify any outputs before using them
              in your work.
            </Text>
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
          cursor: "col-resize"
        }}
        _active={{
          bg: "primary.500/50",
          cursor: "col-resize"
        }}
        onMouseDown={() => {
          isDragged.current = true;
        }}
       />
    </Flex>
  );
}

export default ChatPanel;
