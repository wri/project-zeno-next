"use client";

import useChatStore from "./store/chatStore";
import useContextStore from "./store/contextStore";
import ChatPanelWelcome from "./ChatPanelWelcome";
import ChatPanelConversation from "./ChatPanelConversation";

function ChatPanel() {
  const { messages } = useChatStore();
  const { context } = useContextStore();

  // Treat the seed system message as "no conversation yet".
  // Once the user has sent a message, switch to the expanded conversation layout.
  const hasUserConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  // Show welcome content only when no conversation and no context has been set.
  const showWelcomeContent = !hasUserConversation && context.length === 0;

  if (hasUserConversation) {
    return <ChatPanelConversation />;
  }

  return <ChatPanelWelcome showWelcomeContent={showWelcomeContent} />;
}

export default ChatPanel;
