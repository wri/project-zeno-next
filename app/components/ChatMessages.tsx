"use client";
import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import ThinkingMessage from "./ThinkingMessage";

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isFetchingThread } = useChatStore();

  const lastAssistantIdx = messages
  .map((msg, idx) => (msg.type === "assistant" ? idx : -1))
  .filter(idx => idx !== -1)
  .pop();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        const e = entries[0];
        const parentElement = e.target.parentElement;
        const elementHeight = e.contentRect.height;

        if (parentElement && elementHeight > parentElement.clientHeight) {
          parentElement.scrollTop = e.target.scrollHeight;
        }
      });
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  const lastMessage = messages[messages.length - 1];
  // Always show realtime thinking when a user message is in-flight
  const showThinking = isLoading && lastMessage?.type === "user";
  // Show historical fetch skeleton only when we're fetching and no messages are displayed yet
  const showFetching = isFetchingThread && messages.length === 0 && !isLoading;

  return (
    <Box ref={containerRef} fontSize="sm">
      {messages.map((message, index) => {
        // Check if this message is consecutive to the previous one of the same type
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive = previousMessage?.type === message.type;
        
        return (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isConsecutive={isConsecutive}
            isLatestAssistant={index === lastAssistantIdx}
          />
        );
      })}
      {showFetching && <ThinkingMessage label="Fetching conversation" />}
      {showThinking && <ThinkingMessage />}
    </Box>
  );
}

export default ChatMessages;
