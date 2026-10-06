"use client";

import { Box, Text } from "@chakra-ui/react";

import ConversationHistoryList from "./components/ConversationHistoryList";
import useSidebarStore from "./store/sidebarStore";

/**
 * The chat panel's history view: past conversations in place of the
 * messages. Picking one opens it and returns the panel to the chat.
 */
function ChatHistoryView() {
  const setChatHistoryOpen = useSidebarStore((s) => s.setChatHistoryOpen);

  return (
    <Box data-testid="chat-history-view">
      <Text fontSize="sm" fontWeight="medium" color="fg" px="4" pt="3" pb="2">
        Conversation history
      </Text>
      <ConversationHistoryList onThreadOpen={() => setChatHistoryOpen(false)} />
    </Box>
  );
}

export default ChatHistoryView;
