"use client";
import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();

  // Auto-scroll to bottom when new messages are added or loading state changes
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
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
          />
        );
      })}
      {isLoading && <Reasoning />}
    </Box>
  );
}

export default ChatMessages;
