"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();
  const [shouldScrollToUser, setShouldScrollToUser] = useState(false);
  const [scrollTargetMessageId, setScrollTargetMessageId] = useState<string | null>(null);

  // Find the last user message
  const lastUserMessage = messages.findLast((msg) => msg.type === "user");
  const lastUserMessageIndex = messages.findLastIndex((msg) => msg.type === "user");

  // Track when a new user message is added (by ID, not index)
  const prevLastUserMessageIdRef = useRef(lastUserMessage?.id);
  
  useEffect(() => {
    // Check if a new user message was added (different ID)
    if (lastUserMessage && lastUserMessage.id !== prevLastUserMessageIdRef.current) {
      // Enable scroll-to-top mode and remember which message to scroll to
      setScrollTargetMessageId(lastUserMessage.id);
      setShouldScrollToUser(true);
      
      // Use multiple animation frames to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (lastUserMessageRef.current && containerRef.current) {
            const parentElement = containerRef.current.parentElement;
            if (parentElement) {
              // Get the position of the message relative to the parent
              const messageRect = lastUserMessageRef.current.getBoundingClientRect();
              const parentRect = parentElement.getBoundingClientRect();
              
              // Calculate the scroll position to put message at top
              // Add small offset to account for parent padding
              const paddingOffset = 24; // Account for parent padding
              const scrollOffset = messageRect.top - parentRect.top - paddingOffset;
              const targetScroll = parentElement.scrollTop + scrollOffset;
              const maxScroll = parentElement.scrollHeight - parentElement.clientHeight;
              
              // Scroll to the target, or max scroll if target is beyond content
              parentElement.scrollTop = Math.min(targetScroll, maxScroll);
            }
          }
        });
      });
    }
    
    prevLastUserMessageIdRef.current = lastUserMessage?.id;
  }, [lastUserMessage?.id]);

  // Auto-scroll to bottom as content grows (for streaming responses)
  // But only if we're not trying to scroll to user message
  useEffect(() => {
    if (containerRef.current && !shouldScrollToUser) {
      const observer = new ResizeObserver((entries) => {
        const e = entries[0];
        const parentElement = containerRef.current?.parentElement;
        const elementHeight = e.contentRect.height;

        // Only auto-scroll to bottom if we're not scrolling to user message
        if (parentElement && elementHeight > parentElement.clientHeight) {
          parentElement.scrollTop = parentElement.scrollHeight;
        }
      });
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [shouldScrollToUser]);

  // Track initial content height when scroll-to-user mode starts
  const initialContentHeightRef = useRef<number>(0);
  
  useEffect(() => {
    if (shouldScrollToUser && containerRef.current) {
      // Capture the initial content height when we start scroll-to-user mode
      initialContentHeightRef.current = containerRef.current.scrollHeight;
    }
  }, [shouldScrollToUser]);

  // Disable scroll-to-top mode when response fills viewport OR user manually scrolls
  useEffect(() => {
    if (shouldScrollToUser && containerRef.current) {
      const parentElement = containerRef.current.parentElement;
      if (!parentElement) return;
      
      const userMessageTop = lastUserMessageRef.current?.offsetTop || 0;
      
      // Check if NEW content has filled the viewport OR user scrolled
      const checkShouldDisable = () => {
        if (parentElement && containerRef.current) {
          const currentContentHeight = containerRef.current.scrollHeight;
          const viewportHeight = parentElement.clientHeight;
          const scrollTop = parentElement.scrollTop;
          const contentGrowth = currentContentHeight - initialContentHeightRef.current;
          
          // Calculate if user message is still near the top of viewport
          const messageScrollPosition = scrollTop;
          const userScrolledAway = Math.abs(messageScrollPosition - userMessageTop) > 50;
          
          // Disable scroll-to-top mode if:
          // 1. Response has filled the viewport, OR
          // 2. User manually scrolled away from the user message
          if (contentGrowth > viewportHeight || userScrolledAway) {
            setShouldScrollToUser(false);
            setScrollTargetMessageId(null);
          }
        }
      };
      
      // Check periodically
      const intervalId = setInterval(checkShouldDisable, 200);
      
      // Also listen for manual scroll events
      const handleScroll = () => {
        checkShouldDisable();
      };
      
      parentElement.addEventListener('scroll', handleScroll);
      
      return () => {
        clearInterval(intervalId);
        parentElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [shouldScrollToUser]);

  return (
    <Box ref={containerRef} fontSize="sm">
      {messages.map((message, index) => {
        // Check if this message is consecutive to the previous one of the same type
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive = previousMessage?.type === message.type;
        const isFirst = index === 0;
        const isLastUserMessage = index === lastUserMessageIndex;
        
        return (
          <Fragment key={message.id}>
            <Box ref={isLastUserMessage ? lastUserMessageRef : null}>
              <MessageBubble
                message={message}
                isConsecutive={isConsecutive}
                isFirst={isFirst}
              />
            </Box>
            {isLoading && index === lastUserMessageIndex && <Reasoning />}

            {/* Prompt options for first message, removed when sent */}
            {messages.length < 2 && LANDING_PAGE_VERSION !== "public" && (
              <SamplePrompts />
            )}
          </Fragment>
        );
      })}
      
      {/* Add temporary spacer after last message to allow scrolling user message to top */}
      {shouldScrollToUser && (
        <Box height="70vh" />
      )}
    </Box>
  );
}

export default ChatMessages;
