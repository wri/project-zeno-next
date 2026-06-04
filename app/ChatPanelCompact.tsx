"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";
import useChatStore from "./store/chatStore";
import { useState } from "react";

const PANEL_WIDTH = 400;

const cardStyle = {
  w: { base: "full", md: `${PANEL_WIDTH}px` } as const,
  bg: "bg",
  borderRadius: { base: 0, md: "sm" } as const,
  borderWidth: { base: 0, md: "1px" } as const,
  borderColor: "border.emphasized",
  overflow: "hidden",
};

interface ChatPanelCompactProps {
  onToggleSize: () => void;
}

function ChatPanelCompact({ onToggleSize }: ChatPanelCompactProps) {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const promptsExhausted = usedPrompts >= totalPrompts;
  const { messages } = useChatStore();
  const hasConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Flex
      flexDir="column"
      justifyContent="flex-end"
      h="100%"
      pt={2}
      pb={1}
      pl={{ base: 0, md: 2 }}
      pointerEvents="none"
    >
      <Flex
        flexDir="column"
        gap="0.5"
        w={{ base: "full", md: `${PANEL_WIDTH}px` }}
        pointerEvents="auto"
      >
        {/* Top card: header + content */}
        <Flex flexDir="column" flex="0 0 auto" {...cardStyle}>
          <ChatPanelHeader
            isFullSize={false}
            hasConversation={hasConversation}
            onToggleSize={onToggleSize}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((v) => !v)}
          />
          {/* Animated collapse/expand of message content */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <Box overflowY="auto" px={4} pt={4} pb={4} maxH="590px">
                  <ChatMessages />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Flex>

        {/* Bottom card: input — always visible */}
        <Flex
          flexDir="column"
          {...cardStyle}
          boxShadow="none"
          overflow="hidden"
        >
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
          <ChatInput
            isChatDisabled={promptsExhausted}
            onAfterSend={isCollapsed ? () => setIsCollapsed(false) : undefined}
          />
        </Flex>
      </Flex>

      {/* Frosted-glass disclaimer — 16px below cards */}
      <Box
        px={2}
        py={1}
        mt={4}
        borderRadius="sm"
        backdropFilter="blur(24px)"
        bg="whiteAlpha.200"
        fontSize="10px"
        lineHeight="20px"
        color="#131619"
        opacity={0.5}
        whiteSpace="nowrap"
      >
        AI makes mistakes. Verify outputs and do not share any sensitive or
        personal information.
      </Box>
    </Flex>
  );
}

export default ChatPanelCompact;
