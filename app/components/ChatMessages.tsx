"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";
import ChatDisclaimer from "./ChatDisclaimer";
import WhatsNewModal from "./WhatsNewModal";

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, toolSteps: currentToolSteps } = useChatStore();
  const [displayDisclaimer, setDisplayDisclaimer] = useState(true);
  const shouldAutoScroll = useRef(true);
  const prefersReducedMotion = useRef(false);

  // Track reduced-motion preference live so callbacks always see the current value.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Scroll to the bottom of real content, ignoring the blank spacer.
  // Always instant — smooth scroll here causes jitter during streaming because
  // ResizeObserver fires this dozens of times per second.
  const scrollToBottom = () => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    parent.style.scrollBehavior = "auto";
    const spacerHeight = spacerRef.current?.offsetHeight ?? 0;
    parent.scrollTop = Math.max(
      0,
      parent.scrollHeight - spacerHeight - parent.clientHeight,
    );
  };

  // Track whether the user has manually scrolled away from the bottom.
  // Subtract spacer height so the spacer doesn't inflate the distance-to-bottom
  // and falsely mark the user as having scrolled away.
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleScroll = () => {
      // Kill any in-flight smooth scroll so user intent takes over immediately.
      parent.style.scrollBehavior = "auto";
      const spacerHeight = spacerRef.current?.offsetHeight ?? 0;
      const { scrollTop, scrollHeight, clientHeight } = parent;
      shouldAutoScroll.current =
        scrollHeight - spacerHeight - scrollTop - clientHeight < 100;
    };

    parent.addEventListener("scroll", handleScroll);
    return () => parent.removeEventListener("scroll", handleScroll);
  }, []);

  // Pin user message to top on send; re-enable auto-scroll when AI arrives.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === "user" && lastUserMessageRef.current) {
      // Lock the viewport at the user message. ResizeObserver is suppressed
      // (shouldAutoScroll=false) so the spacer addition doesn't scroll us away.
      shouldAutoScroll.current = false;
      const parent = containerRef.current?.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const msgRect = lastUserMessageRef.current.getBoundingClientRect();
        const delta = msgRect.top - parentRect.top - 16;

        if (delta !== 0 && !prefersReducedMotion.current) {
          parent.style.scrollBehavior = "smooth";
          parent.scrollTop += delta;
          // Restore instant scroll as soon as the animation finishes so
          // streaming updates remain snappy. scrollend is exact; fall back to
          // a conservative timeout for Safari < 17.4.
          const restore = () => {
            parent.style.scrollBehavior = "auto";
          };
          if ("onscrollend" in parent) {
            parent.addEventListener("scrollend", restore, { once: true });
          } else {
            setTimeout(restore, 400);
          }
        } else {
          parent.scrollTop += delta;
        }
      }
    } else {
      // AI has started or loading ended — re-enable auto-scroll.
      // Don't call scrollToBottom here; the ResizeObserver will trigger it
      // once AI content actually overflows the viewport.
      shouldAutoScroll.current = true;
    }
  }, [messages, isLoading]);

  // Scroll on content resize — but only once AI content has grown past the
  // visible fold. This lets messages fill the blank space before scrolling.
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const parent = containerRef.current?.parentElement;
      if (!parent || !shouldAutoScroll.current) return;
      const spacerHeight = spacerRef.current?.offsetHeight ?? 0;
      const contentBottom = parent.scrollHeight - spacerHeight;
      const viewportBottom = parent.scrollTop + parent.clientHeight;
      if (contentBottom > viewportBottom) {
        scrollToBottom();
      }
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Show reasoning after the last user message when loading
  const lastUserMessageIndex = messages.findLastIndex(
    (msg) => msg.type === "user",
  );

  return (
    <Box ref={containerRef} fontSize="sm">
      {messages.map((message, index) => {
        // Check if this message is consecutive to the previous one of the same type
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive = previousMessage?.type === message.type;
        const isFirst = index === 0;
        const isLastUserMessage =
          index === lastUserMessageIndex && message.type === "user";
        return (
          <Fragment key={message.id}>
            {isLastUserMessage && <Box ref={lastUserMessageRef} />}
            {isFirst && displayDisclaimer && (
              <ChatDisclaimer
                type="info"
                setDisplayDisclaimer={setDisplayDisclaimer}
              >
                <Box>
                  <Text mb={{ base: 1, md: 2 }}>
                    <strong>Global Nature Watch preview</strong>
                  </Text>
                  <Text mb={{ base: 1, md: 2 }}>
                    You&apos;re using a preview version that&apos;s still under
                    active development. You may encounter errors or incomplete
                    results, so verify results with primary sources. Features,
                    datasets, and assistant behavior may change or be removed as
                    we iterate.
                  </Text>
                  <Text>
                    By using this preview, you&apos;re helping shape the future
                    of Global Nature Watch. Share feedback via{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="https://surveys.hotjar.com/860def81-d4f2-4f8c-abee-339ebc3129f3"
                    >
                      this survey
                    </Link>{" "}
                    or by emailing{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="mailto:landcarbonlab@wri.org"
                    >
                      landcarbonlab@wri.org
                    </Link>{" "}
                    Visit the{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="https://help.globalnaturewatch.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Help Center
                    </Link>{" "}
                    to learn more about the preview.
                  </Text>
                </Box>
              </ChatDisclaimer>
            )}
            {isFirst && <WhatsNewModal />}
            <MessageBubble
              message={message}
              isConsecutive={isConsecutive}
              isFirst={isFirst}
            />
            {message.type === "user" && (
              <>
                {/* Show reasoning for current loading query (last user message) */}
                {index === lastUserMessageIndex && isLoading && (
                  <Reasoning toolSteps={currentToolSteps} isLoading={true} />
                )}
                {/* Show reasoning for completed queries (user messages with toolSteps) */}
                {message.toolSteps && message.toolSteps.length > 0 && (
                  <Reasoning
                    toolSteps={message.toolSteps}
                    isLoading={false}
                    reasoningDuration={message.reasoningDuration}
                  />
                )}
              </>
            )}

            {/* Prompt options for first message, removed when sent */}
            {messages.length < 2 && <SamplePrompts />}
          </Fragment>
        );
      })}
      {isLoading && <Box ref={spacerRef} height="100vh" />}
    </Box>
  );
}

export default ChatMessages;
