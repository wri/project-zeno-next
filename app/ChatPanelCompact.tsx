"use client";

import { Flex, Box } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatPanelDisclaimer from "./ChatPanelDisclaimer";
import PromptQuotaNotice from "./PromptQuotaNotice";
import { chatPanelCardStyle } from "./chatPanelShared";
import {
  COMPACT_CHAT_PANEL_WIDTH_PX,
  getCompactChatLeftPx,
} from "./explorationLayout";
import { usePromptQuota } from "./hooks/usePromptQuota";
import useChatStore from "./store/chatStore";
import useSidebarStore from "./store/sidebarStore";
import { isAppRoute, isDashboardDetailRoute } from "./utils/threadNavigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

// Intentionally narrower than the full-size panel (see FULLSIZE_CHAT_PANEL_WIDTH_PX).

// Cap the scrollable message list at ~50vh per design (~440px on a 900px-tall
// viewport). The compact panel is bottom-anchored and grows upward, so when the
// preview DisclaimerPanel banner is showing (a separate top-left map overlay at
// the same left edge) we shrink the cap further so the panel never grows up far
// enough to overlap it.
const MESSAGES_MAX_VH = 0.5;
const DISCLAIMER_CLEARANCE = 12; // px of breathing room below the disclaimer

const cardStyle = {
  w: { base: "full", md: `${COMPACT_CHAT_PANEL_WIDTH_PX}px` } as const,
  ...chatPanelCardStyle,
};

interface ChatPanelCompactProps {
  onToggleSize: () => void;
}

function ChatPanelCompact({ onToggleSize }: ChatPanelCompactProps) {
  const { promptsExhausted } = usePromptQuota();
  const { messages } = useChatStore();
  const { dataCatalogOpen, areasPanelOpen, insightsPanelOpen } =
    useSidebarStore();
  const pathname = usePathname();
  // On the map, any of the three column panels shifts the compact chat aside.
  // On a dashboard's detail page only the Analyses (insights) pane renders, so
  // the data catalog / areas open state (which can persist from the map) must
  // not push the panel sideways there. On any other surface nothing shifts it.
  const chatLeftPx = getCompactChatLeftPx(
    isAppRoute(pathname)
      ? dataCatalogOpen || areasPanelOpen || insightsPanelOpen
      : isDashboardDetailRoute(pathname) && insightsPanelOpen
  );
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

  return (
    <Flex
      flexDir="column"
      justifyContent="flex-end"
      h="100%"
      pt={2}
      pb={1}
      pl={{ base: 0, md: `${chatLeftPx}px` }}
      transition="padding-left 0.2s ease-in-out"
      pointerEvents="none"
    >
      <Flex
        flexDir="column"
        gap="0.5"
        w={{ base: "full", md: `${COMPACT_CHAT_PANEL_WIDTH_PX}px` }}
        minH={0}
        pointerEvents="auto"
      >
        {/* Top card: header + content. Base (bottom sheet): shrinkable so the
            message list scrolls within the sheet instead of clipping past its
            top edge. Desktop keeps the fixed 50vh-capped height. */}
        <Flex
          ref={topCardRef}
          flexDir="column"
          flex={{ base: "0 1 auto", md: "0 0 auto" }}
          minH={0}
          {...cardStyle}
        >
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
                style={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {/* Top padding is passed to ChatMessages instead of set on
                    this scroller — see ChatMessagesProps.pt. */}
                <Box
                  ref={messagesRef}
                  overflowY="auto"
                  px={4}
                  pb={4}
                  minH={0}
                  maxH={{ base: "none", md: messagesMaxH }}
                >
                  <ChatMessages pt={4} />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Flex>

        {/* Bottom card: input — always visible, never squeezed by the list */}
        <Flex
          ref={inputCardRef}
          flexDir="column"
          flexShrink={0}
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
      {/* Frosted-glass disclaimer — sits just below the input card */}
      <ChatPanelDisclaimer variant="frosted" />
    </Flex>
  );
}

export default ChatPanelCompact;
