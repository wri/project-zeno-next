"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Flex, Icon, IconButton, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ChartBarIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  DotsSixVerticalIcon,
  SidebarSimpleIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";
import type { DragControls } from "framer-motion";

import {
  CHAT_DISCLAIMER_TEXT,
  chatPanelCardStyle,
} from "@/app/chatPanelShared";
import ChatInput from "@/app/components/ChatInput";
import ChatMessages from "@/app/components/ChatMessages";
import PromptQuotaNotice from "@/app/PromptQuotaNotice";
import { usePromptQuota } from "@/app/hooks/usePromptQuota";
import useChatStore from "@/app/store/chatStore";
import useComposerStore from "@/app/store/composerStore";
import useSidebarStore from "@/app/store/sidebarStore";

// Prompts offered while the dashboard conversation is empty.
const SUGGESTIONS = [
  "Explain what's driving the recent disturbance alerts",
  "Add a map comparing this period to previous years",
  "Summarize the tree cover loss trend as an annotation",
];

/**
 * The dashboard AI assistant card — the design's floating "AI ASSISTANT"
 * panel, driven by the real chat pipeline (chatStore + view_context; the
 * agent's dashboard writes stream back via dashboard_updated → react-query
 * invalidation). Renders either as a floating card or a docked full-height
 * column inside DashboardWorkspace.
 */
export default function DashboardChatCard({
  floating = false,
  dragControls,
}: {
  /** Render as a self-contained floating card rather than a docked column. */
  floating?: boolean;
  /** When provided, the header's drag handle starts a framer-motion drag. */
  dragControls?: DragControls;
}) {
  const messages = useChatStore((s) => s.messages);
  const { promptsExhausted } = usePromptQuota();
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);

  const openSidePane = useComposerStore((s) => s.openSidePane);
  const sidePane = useComposerStore((s) => s.sidePane);
  const chatMaximised = useComposerStore((s) => s.chatMaximised);
  const setChatMaximised = useComposerStore((s) => s.setChatMaximised);
  const chatCollapsed = useComposerStore((s) => s.chatCollapsed);
  const setChatCollapsed = useComposerStore((s) => s.setChatCollapsed);
  const focusNonce = useComposerStore((s) => s.focusNonce);

  const rootRef = useRef<HTMLDivElement>(null);

  const collapsed = floating && chatCollapsed;
  const hasConversation = messages.length > 0;

  // "Ask AI" elsewhere on the page: uncollapse and focus the input.
  useEffect(() => {
    if (!focusNonce) return;
    setChatCollapsed(false);
    // After the collapse re-render — the textarea lives inside ChatInput.
    requestAnimationFrame(() => {
      rootRef.current?.querySelector("textarea")?.focus();
    });
  }, [focusNonce, setChatCollapsed]);

  const sendSuggestion = (text: string) => {
    void useChatStore.getState().sendMessage(text);
  };

  return (
    <Flex
      ref={rootRef}
      flexDir="column"
      h="100%"
      w={floating ? { base: "full", md: "400px" } : "full"}
      flexShrink={0}
      {...chatPanelCardStyle}
      borderRadius={floating ? "lg" : 0}
      borderWidth={floating ? "1px" : 0}
      borderRightWidth={floating ? "1px" : { base: 0, md: "1px" }}
      boxShadow={floating ? "xl" : undefined}
      overflow="hidden"
    >
      {/* Header — drag handle + AI ASSISTANT + action icons */}
      <Flex
        h="40px"
        px="3"
        bg="#F4F5F6"
        borderBottomWidth="1px"
        borderColor="#E7E6E6"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Flex
          align="center"
          gap={2}
          cursor={dragControls ? "grab" : undefined}
          onPointerDown={
            dragControls ? (e) => dragControls.start(e) : undefined
          }
          style={dragControls ? { touchAction: "none" } : undefined}
        >
          <Icon as={DotsSixVerticalIcon} boxSize="16px" color="#656E7B" />
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            letterSpacing="0.3px"
            textTransform="uppercase"
            color="#656E7B"
          >
            AI Assistant
          </Text>
        </Flex>
        <Flex align="center" gap={1}>
          <IconButton
            aria-label="New chat"
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={() => useChatStore.getState().reset()}
          >
            <ChatCircleDotsIcon size={16} />
          </IconButton>
          <IconButton
            aria-label="Conversation history"
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={toggleSidebar}
          >
            <ClockCounterClockwiseIcon size={16} />
          </IconButton>
          <IconButton
            aria-label={chatMaximised ? "Float chat" : "Dock chat full-size"}
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={() => {
              setChatMaximised(!chatMaximised);
              setChatCollapsed(false);
            }}
          >
            <SidebarSimpleIcon size={16} />
          </IconButton>
          {floating && (
            <IconButton
              aria-label={collapsed ? "Expand chat" : "Collapse chat"}
              size="2xs"
              variant="ghost"
              color="#656E7B"
              onClick={() => setChatCollapsed(!chatCollapsed)}
            >
              {collapsed ? (
                <CaretUpIcon size={12} />
              ) : (
                <CaretDownIcon size={12} />
              )}
            </IconButton>
          )}
        </Flex>
      </Flex>

      {!collapsed && (
        <>
          {/* Conversation — or the intro + suggested prompts while empty */}
          <Box flex="1 1 auto" overflowY="auto" px={4} py={4}>
            {hasConversation ? (
              <ChatMessages />
            ) : (
              <>
                <Text
                  fontSize="16px"
                  fontWeight="medium"
                  lineHeight="1.5"
                  color="#0049AA"
                  mb={2}
                >
                  Refine this dashboard
                </Text>
                <Text fontSize="12px" lineHeight="1.5" color="#131619" mb={4}>
                  I can help you add context, new analyses, or visuals to make
                  this dashboard more useful.
                </Text>
                <Text fontSize="xs" color="fg.muted" mb={2}>
                  You might want to:
                </Text>
                <Flex direction="column" gap={2}>
                  {SUGGESTIONS.map((s) => (
                    <Box
                      key={s}
                      as="button"
                      onClick={() => sendSuggestion(s)}
                      textAlign="left"
                      w="full"
                      bg="bg"
                      borderWidth="1px"
                      borderColor="border.emphasized"
                      rounded="lg"
                      px={3}
                      py={2}
                      fontSize="xs"
                      color="fg"
                      cursor="pointer"
                      transition="border-color 0.12s ease, background 0.12s ease"
                      _hover={{ borderColor: "fg.link", bg: "bg.subtle" }}
                    >
                      {s}
                    </Box>
                  ))}
                </Flex>
              </>
            )}
          </Box>

          {/* Input */}
          <Box flexShrink={0} borderTopWidth="1px" borderColor="#E7E6E6">
            <PromptQuotaNotice px={3} pt={3} />
            <ChatInput
              isChatDisabled={promptsExhausted}
              redirectOnNewThread={false}
              contextButtons={
                // Styled like ContextButton, but open the dashboard panels.
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    borderRadius="sm"
                    borderWidth="1px"
                    px="2"
                    h="8"
                    gap="1"
                    fontSize="xs"
                    fontWeight="normal"
                    onClick={() => openSidePane("datasets")}
                    borderColor={
                      sidePane === "datasets" ? "primary.solid" : "#E0E2E5"
                    }
                    color={
                      sidePane === "datasets" ? "primary.solid" : undefined
                    }
                    aria-expanded={sidePane === "datasets"}
                    aria-label="Datasets"
                  >
                    <StackSimpleIcon size={14} />
                    Datasets
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    borderRadius="sm"
                    borderWidth="1px"
                    px="2"
                    h="8"
                    gap="1"
                    fontSize="xs"
                    fontWeight="normal"
                    onClick={() => openSidePane("insights")}
                    borderColor={
                      sidePane === "insights" ? "primary.solid" : "#E0E2E5"
                    }
                    color={
                      sidePane === "insights" ? "primary.solid" : undefined
                    }
                    aria-expanded={sidePane === "insights"}
                    aria-label="Analyses"
                  >
                    <ChartBarIcon size={14} />
                    Analyses
                  </Button>
                </>
              }
            />
            <Text fontSize="10px" color="fg.muted" px={3} pb={2}>
              {CHAT_DISCLAIMER_TEXT}
            </Text>
          </Box>
        </>
      )}
    </Flex>
  );
}
