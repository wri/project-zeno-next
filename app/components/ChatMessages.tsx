"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";
import ChatDisclaimer from "./ChatDisclaimer";

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, toolSteps: currentToolSteps } = useChatStore();
  const [displayDisclaimer, setDisplayDisclaimer] = useState(true);
  const shouldAutoScroll = useRef(true);

  const scrollToBottom = () => {
    const parent = containerRef.current?.parentElement;
    if (parent) parent.scrollTop = parent.scrollHeight;
  };

  // Track whether the user has manually scrolled away from the bottom
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    parent.addEventListener("scroll", handleScroll);
    return () => parent.removeEventListener("scroll", handleScroll);
  }, []);

  // Always scroll to bottom on new messages or loading state changes
  useEffect(() => {
    shouldAutoScroll.current = true;
    scrollToBottom();
  }, [messages, isLoading]);

  // Scroll on content resize only if the user hasn't scrolled away
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (shouldAutoScroll.current) scrollToBottom();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Show reasoning after the last user message when loading
  const lastUserMessageIndex = messages.findLastIndex(
    (msg) => msg.type === "user"
  );

  return (
    <Box ref={containerRef} fontSize="sm">
      {messages.map((message, index) => {
        // Check if this message is consecutive to the previous one of the same type
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive = previousMessage?.type === message.type;
        const isFirst = index === 0;
        return (
          <Fragment key={message.id}>
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
                    You&apos;re using a preview version that&apos;s still under active development.
                    You may encounter errors or incomplete results, so verify results with primary sources.
                    Features, datasets, and assistant behavior may change or be removed as we iterate.
                  </Text>
                  <Text>
                    By using this preview, you&apos;re helping shape the future of Global Nature Watch.
                    Share feedback via{" "}
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
                    </Link>
                    {" "}
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
            {messages.length < 2 && (
              <SamplePrompts />
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}

export default ChatMessages;
