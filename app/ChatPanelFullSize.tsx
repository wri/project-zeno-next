"use client";

import { Flex, Box } from "@chakra-ui/react";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatPanelDisclaimer from "./ChatPanelDisclaimer";
import PromptQuotaNotice from "./PromptQuotaNotice";
import { chatPanelCardStyle } from "./chatPanelShared";
import { usePromptQuota } from "./hooks/usePromptQuota";
import useSidebarStore from "./store/sidebarStore";

// Intentionally wider than the compact panel (see COMPACT_PANEL_WIDTH).
const FULLSIZE_PANEL_WIDTH = 428;

interface ChatPanelFullSizeProps {
  onToggleSize: () => void;
}

function ChatPanelFullSize({ onToggleSize }: ChatPanelFullSizeProps) {
  const { promptsExhausted } = usePromptQuota();
  const { dataCatalogOpen } = useSidebarStore();

  return (
    <Flex
      flexDir="column"
      flex="1 1 auto"
      minH={0}
      h="100%"
      w={{ base: "full", md: `${FULLSIZE_PANEL_WIDTH}px` }}
      {...chatPanelCardStyle}
      borderRightWidth={{ base: 0, md: dataCatalogOpen ? 0 : "1px" }}
      pointerEvents="auto"
    >
      <ChatPanelHeader
        isFullSize={true}
        hasConversation={true}
        onToggleSize={onToggleSize}
      />

      {/* Scrollable message area */}
      <Box flex="1" overflowY="auto" px={3} pt={3} pb={0} minH={0}>
        <ChatMessages />
      </Box>

      {/* Input area — rounded bordered box. pb matches ChatPanelCompact so the
          input box bottom lines up across compact/full-size. */}
      <Flex flexDir="column" flexShrink={0} px={3} pb={1}>
        <PromptQuotaNotice pb={2} />
        <ChatInput isChatDisabled={promptsExhausted} bordered />
      </Flex>

      {/* Disclaimer — compact single-line at bottom */}
      <ChatPanelDisclaimer variant="inline" />
    </Flex>
  );
}

export default ChatPanelFullSize;
