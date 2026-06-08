"use client";

import { Flex, Box, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";
import { AnimatePresence, motion, type DragControls } from "framer-motion";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatStatusInfo from "./components/ChatStatusInfo";
import ChatPanelHeader from "./ChatPanelHeader";
import useAuthStore from "./store/authStore";
import useChatStore from "./store/chatStore";
import { useState, useEffect, useRef, useCallback } from "react";

const PANEL_WIDTH = 400;

// Cap the scrollable message list at ~50vh per design (~440px on a 900px-tall
// viewport). The compact panel is bottom-anchored and grows upward, so when the
// preview DisclaimerPanel banner is showing (a separate top-left map overlay at
// the same left edge) we shrink the cap further so the panel never grows up far
// enough to overlap it.
const MESSAGES_MAX_VH = 0.5;
const DISCLAIMER_CLEARANCE = 12; // px of breathing room below the disclaimer

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
  dragControls?: DragControls;
}

function ChatPanelCompact({
  onToggleSize,
  dragControls,
}: ChatPanelCompactProps) {
  const { usedPrompts, totalPrompts } = useAuthStore();
  const promptsExhausted = usedPrompts >= totalPrompts;
  const { messages } = useChatStore();
  const hasConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  const topCardRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const [messagesMaxH, setMessagesMaxH] = useState(
    `${MESSAGES_MAX_VH * 100}vh`
  );

  // The disclaimer lives in a sibling map overlay, not in this panel's flex
  // flow, so layout can't keep them apart. Shrink the message list so the whole
  // (bottom-anchored) panel — including the header that sits above the list —
  // stays DISCLAIMER_CLEARANCE px below the disclaimer's bottom edge, capped at
  // the design 50vh.
  const recomputeMaxH = useCallback(() => {
    const messages = messagesRef.current;
    const topCard = topCardRef.current;
    if (!messages || !topCard) return;
    const cap = window.innerHeight * MESSAGES_MAX_VH;
    const messagesRect = messages.getBoundingClientRect();
    // Header + card border above the list. Constant regardless of list height,
    // so panel top = messagesRect.bottom − listHeight − headerOffset.
    const headerOffset = messagesRect.top - topCard.getBoundingClientRect().top;
    const disclaimer = document.getElementById("gnw-disclaimer-panel");
    const disclaimerVisible = !!disclaimer && disclaimer.offsetParent !== null;
    const topLimit = disclaimerVisible
      ? disclaimer.getBoundingClientRect().bottom + DISCLAIMER_CLEARANCE
      : 0;
    const available = messagesRect.bottom - headerOffset - topLimit;
    setMessagesMaxH(`${Math.round(Math.max(0, Math.min(cap, available)))}px`);
  }, []);

  useEffect(() => {
    recomputeMaxH();
    const raf = requestAnimationFrame(recomputeMaxH);
    // Input card height changes (e.g. the quota notice) shift the message
    // list's bottom edge, so re-measure when it resizes.
    const observer = new ResizeObserver(recomputeMaxH);
    if (inputCardRef.current) observer.observe(inputCardRef.current);
    window.addEventListener("resize", recomputeMaxH);
    window.addEventListener("gnw-disclaimer-shown", recomputeMaxH);
    window.addEventListener("gnw-disclaimer-dismissed", recomputeMaxH);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", recomputeMaxH);
      window.removeEventListener("gnw-disclaimer-shown", recomputeMaxH);
      window.removeEventListener("gnw-disclaimer-dismissed", recomputeMaxH);
    };
  }, [recomputeMaxH, isCollapsed]);

  // [PROTOTYPE] dragControls being present signals the panel is in floating
  // (position:fixed, draggable) mode. In this mode the outer Flex wrapper no
  // longer needs h="100%" / justifyContent="flex-end" for bottom-anchoring —
  // that's handled by the fixed CSS in ChatPanel. The disclaimer is also hidden
  // here because floating mode shows it as a tooltip on an info icon in the
  // header instead (see ChatPanelHeader).
  const isFloating = !!dragControls;

  return (
    <Flex
      flexDir="column"
      justifyContent={isFloating ? undefined : "flex-end"}
      h={isFloating ? undefined : "100%"}
      pt={isFloating ? 1 : 2}
      pb={isFloating ? 1 : 1}
      pl={isFloating ? 0 : { base: 0, md: 3 }} // fixed left:12 in parent provides margin in floating mode
      pointerEvents="none"
    >
      <Flex
        flexDir="column"
        gap="0.5"
        w={{ base: "full", md: `${PANEL_WIDTH}px` }}
        pointerEvents="auto"
      >
        {/* Top card: header + content */}
        <Flex ref={topCardRef} flexDir="column" flex="0 0 auto" {...cardStyle}>
          <ChatPanelHeader
            isFullSize={false}
            hasConversation={hasConversation}
            onToggleSize={onToggleSize}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((v) => !v)}
            dragControls={dragControls}
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
                <Box
                  ref={messagesRef}
                  overflowY="auto"
                  px={4}
                  pt={4}
                  pb={4}
                  maxH={messagesMaxH}
                >
                  <ChatMessages />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Flex>

        {/* Bottom card: input — always visible */}
        <Flex
          ref={inputCardRef}
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
      {/* Frosted-glass disclaimer — sits just below the input card.
          Hidden in floating mode; an info button in the header serves instead.
          TODO: use chakra styles and theming for this */}
      {!isFloating && (
        <Box
          px={2}
          py={0}
          mt={2}
          borderRadius="sm"
          backdropFilter="blur(24px)"
          bg="whiteAlpha.200"
          fontSize="10px"
          lineHeight="20px"
          color="#131619"
          opacity={0.6}
          whiteSpace="nowrap"
        >
          AI makes mistakes. Verify outputs and do not share sensitive or
          personal information.
        </Box>
      )}
    </Flex>
  );
}

export default ChatPanelCompact;
