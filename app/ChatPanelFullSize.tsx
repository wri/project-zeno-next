import { Flex, Box } from "@chakra-ui/react";

import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatHistoryView from "./ChatHistoryView";
import AvailablePromptsCard from "./components/AvailablePromptsCard";
import ChatPanelDisclaimer from "./ChatPanelDisclaimer";
import PromptQuotaNotice from "./PromptQuotaNotice";
import { ProfileNudgeSlot } from "@/src/features/front-door";
import { chatPanelCardStyle } from "./chatPanelShared";
import { FULLSIZE_CHAT_PANEL_WIDTH_PX } from "./explorationLayout";
import { usePromptQuota } from "./hooks/usePromptQuota";
import useSidebarStore from "./store/sidebarStore";

interface ChatPanelFullSizeProps {
  onToggleSize: () => void;
}

function ChatPanelFullSize({ onToggleSize }: ChatPanelFullSizeProps) {
  const { promptsExhausted } = usePromptQuota();
  const chatHistoryOpen = useSidebarStore((s) => s.chatHistoryOpen);

  return (
    <Flex
      flexDir="column"
      flex="1 1 auto"
      flexShrink={0}
      minH={0}
      h="100%"
      w={{ base: "full", md: `${FULLSIZE_CHAT_PANEL_WIDTH_PX}px` }}
      minW={{ base: undefined, md: `${FULLSIZE_CHAT_PANEL_WIDTH_PX}px` }}
      maxW={{ base: "full", md: `${FULLSIZE_CHAT_PANEL_WIDTH_PX}px` }}
      {...chatPanelCardStyle}
      pointerEvents="auto"
    >
      <ChatPanelHeader isFullSize={true} onToggleSize={onToggleSize} />

      {chatHistoryOpen ? (
        <>
          {/* History view: past conversations in place of the messages, the
              prompt allowance in place of the input. */}
          <Box flex="1" overflowY="auto" minH={0}>
            <ChatHistoryView />
          </Box>
          <Box flexShrink={0} px={3} pb={3}>
            <AvailablePromptsCard />
          </Box>
        </>
      ) : (
        <>
          {/* Scrollable message area. Top padding is passed to ChatMessages
              instead of set on this scroller — see ChatMessagesProps.pt. */}
          <Box flex="1" overflowY="auto" px={3} pb={0} minH={0}>
            <ChatMessages pt={3} />
          </Box>

          {/* Input area — rounded bordered box. pb matches ChatPanelCompact so
              the input box bottom lines up across compact/full-size. */}
          <Flex flexDir="column" flexShrink={0} px={3} pb={1}>
            <PromptQuotaNotice pb={2} />
            <ProfileNudgeSlot pb={2} />
            <ChatInput isChatDisabled={promptsExhausted} bordered />
          </Flex>

          {/* Disclaimer — compact single-line at bottom */}
          <ChatPanelDisclaimer variant="inline" />
        </>
      )}
    </Flex>
  );
}

export default ChatPanelFullSize;
