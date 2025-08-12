"use client";
import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import ThinkingMessage from "./ThinkingMessage";
import ThreadSkeleton from "./ThreadSkeleton";


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

  // Determine if the last message is from the user
  const lastMessage = messages[messages.length - 1];
  const showThinking = isLoading && lastMessage?.type === "user" && !isFetchingThread;

  return (
    <Box
      ref={containerRef}
      fontSize="sm"
      position="relative"
      minH="220px"
      w="100%"
      h="100%"
      overflow="hidden"
    >
      {isFetchingThread && <ThreadSkeleton />}
      {!isFetchingThread && messages.map((message, index) => {
        // Check if this message is consecutive to the previous one of the same type
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive = previousMessage?.type === message.type;
        // Determine if we should animate typing for this assistant message:
        // Only if it's the last assistant AND not immediately followed by a widget
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const isTypingCandidate = index === lastAssistantIdx && nextMessage?.type !== "widget";
        
        return (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isConsecutive={isConsecutive}
            isLatestAssistant={isTypingCandidate}
          />
        );
      })}
      {!isFetchingThread && showThinking && <ThinkingMessage />}
    </Box>
  );
}

export default ChatMessages;
