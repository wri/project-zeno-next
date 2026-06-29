"use client";

import { Flex, Box } from "@chakra-ui/react";
import { AnimatePresence, motion, type DragControls } from "framer-motion";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatPanelDisclaimer from "./ChatPanelDisclaimer";
import PromptQuotaNotice from "./PromptQuotaNotice";
import { chatPanelCardStyle } from "./chatPanelShared";
import { usePromptQuota } from "./hooks/usePromptQuota";
import useChatStore from "./store/chatStore";
import { useState, useEffect, useRef, useCallback } from "react";

// Intentionally narrower than the full-size panel (see FULLSIZE_PANEL_WIDTH).
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
  ...chatPanelCardStyle,
};

interface ChatPanelCompactProps {
  onToggleSize: () => void;
  dragControls?: DragControls;
}

function ChatPanelCompact({
  onToggleSize,
  dragControls,
}: ChatPanelCompactProps) {
  const { promptsExhausted } = usePromptQuota();
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
          <PromptQuotaNotice px={3} pt={3} />
          <ChatInput
            isChatDisabled={promptsExhausted}
            onAfterSend={isCollapsed ? () => setIsCollapsed(false) : undefined}
          />
        </Flex>
      </Flex>
      {/* Frosted-glass disclaimer — sits just below the input card. Hidden in
          floating mode; the header's info button serves instead. */}
      {!isFloating && <ChatPanelDisclaimer variant="frosted" />}
    </Flex>
  );
}

export default ChatPanelCompact;
