"use client";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const SCROLL_PADDING = 24;
const SCROLL_TOLERANCE = 50;
const VIEWPORT_FILL_THRESHOLD = 0.8; // 80% of viewport
const SCROLL_DURATION = 800; // Slower scroll animation in ms

// Easing function for smooth animation
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const parentElementRef = useRef<HTMLElement | null>(null);
  const { messages, isLoading } = useChatStore();
  const [isScrollingToUser, setIsScrollingToUser] = useState(false);
  const isScrollingToUserRef = useRef(false); // Synchronous flag to prevent race condition
  const isAnimatingScrollRef = useRef(false); // Flag to prevent clearing during our own animation
  const prevLastUserMessageIdRef = useRef<string | null>(null);

  // Find the last user message
  const lastUserMessage = messages.findLast((msg) => msg.type === "user");
  const lastUserMessageIndex = messages.findLastIndex((msg) => msg.type === "user");

  // Cache parent element reference
  useEffect(() => {
    if (containerRef.current) {
      parentElementRef.current = containerRef.current.parentElement;
    }
  }, []);

  // Detect new user message and block auto-scroll immediately
  // Using useLayoutEffect to run synchronously BEFORE ResizeObserver can fire
  useLayoutEffect(() => {
    const hasNewUserMessage = 
      lastUserMessage && 
      lastUserMessage.id !== prevLastUserMessageIdRef.current;

    if (hasNewUserMessage) {
      // Set ref and state immediately to block auto-scroll
      isScrollingToUserRef.current = true;
      setIsScrollingToUser(true);
    }

    prevLastUserMessageIdRef.current = lastUserMessage?.id ?? null;
  }, [lastUserMessage?.id]);

  // Perform the actual scroll animation after spacer is rendered
  useEffect(() => {
    if (isScrollingToUser && lastUserMessageRef.current && parentElementRef.current) {
      const parent = parentElementRef.current;
      const messageElement = lastUserMessageRef.current;
      
      // Wait for spacer to be in DOM and increase scrollHeight
      const checkAndScroll = () => {
        if (!lastUserMessageRef.current || !parentElementRef.current) return;
        
        const expectedMinHeight = messageElement.offsetTop + parent.clientHeight * 0.7;
        
        // Wait until spacer has actually increased the scrollHeight
        if (parent.scrollHeight < expectedMinHeight) {
          requestAnimationFrame(checkAndScroll);
          return;
        }
        
        // Now spacer is rendered, calculate scroll position
        const messageTop = messageElement.offsetTop;
        const targetScroll = Math.max(0, messageTop - SCROLL_PADDING);
        const startScroll = parent.scrollTop;
        const distance = targetScroll - startScroll;
        
        // Set flag to prevent disable logic from running during our animation
        isAnimatingScrollRef.current = true;
        const startTime = performance.now();

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / SCROLL_DURATION, 1);
          const easedProgress = easeInOutCubic(progress);
          
          if (parent) {
            parent.scrollTop = startScroll + distance * easedProgress;
          }

          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          } else {
            // Animation complete, allow disable logic to run again
            isAnimatingScrollRef.current = false;
          }
        };

        requestAnimationFrame(animateScroll);
      };
      
      requestAnimationFrame(checkAndScroll);
    }
  }, [isScrollingToUser]);

  // Auto-scroll to bottom as content grows (streaming responses)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Always check ref - don't rely on state
      if (isScrollingToUserRef.current) {
        return;
      }
      
      if (parentElementRef.current && containerRef.current) {
        const { scrollHeight, clientHeight } = parentElementRef.current;
        
        if (scrollHeight > clientHeight) {
          parentElementRef.current.scrollTop = scrollHeight;
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []); // No dependencies - single observer for component lifetime

  // Disable scroll-to-top mode when appropriate
  useEffect(() => {
    if (!isScrollingToUser || !parentElementRef.current || !containerRef.current) return;

    const parent = parentElementRef.current;
    const userMessageTop = lastUserMessageRef.current?.offsetTop ?? 0;
    const initialContentHeight = containerRef.current.scrollHeight;

    const handleScrollChange = () => {
      // Don't check during our own scroll animation
      if (isAnimatingScrollRef.current) {
        return;
      }
      
      if (!parent || !containerRef.current) return;

      const currentContentHeight = containerRef.current.scrollHeight;
      const viewportHeight = parent.clientHeight;
      const scrollTop = parent.scrollTop;
      const contentGrowth = currentContentHeight - initialContentHeight;

      // Check if content has grown significantly
      const hasFilledViewport = contentGrowth > (viewportHeight * VIEWPORT_FILL_THRESHOLD);

      // Check if user manually scrolled away
      const currentMessagePosition = scrollTop;
      const hasScrolledAway = Math.abs(currentMessagePosition - userMessageTop) > SCROLL_TOLERANCE;

      if (hasFilledViewport || hasScrolledAway) {
        isScrollingToUserRef.current = false;
        setIsScrollingToUser(false);
      }
    };

    // Use ResizeObserver for content growth (more efficient than interval)
    const resizeObserver = new ResizeObserver(handleScrollChange);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Listen for manual scroll
    parent.addEventListener('scroll', handleScrollChange, { passive: true });

    return () => {
      resizeObserver.disconnect();
      parent.removeEventListener('scroll', handleScrollChange);
    };
  }, [isScrollingToUser]);

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
      
      {/* Dynamic spacer to allow scrolling user message to top */}
      {isScrollingToUser && parentElementRef.current && (
        <Box height={`${parentElementRef.current.clientHeight * 0.7}px`} />
      )}
    </Box>
  );
}

export default ChatMessages;
