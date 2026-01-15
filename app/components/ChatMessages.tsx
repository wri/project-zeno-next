"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";
import ChatDisclaimer from "./ChatDisclaimer";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();
  const [displayDisclaimer, setDisplayDisclaimer] = useState(true);

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
                    <strong>Global Nature Watch beta</strong>
                  </Text>
                  <Text mb={{ base: 1, md: 2 }}>
                    You&apos;re using a beta version that&apos;s still under active development.
                    You may encounter errors or incomplete results, so verify results with primary sources.
                    Features, datasets, and assistant behavior may change or be removed as we iterate.
                  </Text>
                  <Text>
                    By using this beta, you&apos;re helping shape the future of Global Nature Watch.
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
                  </Link>{". "}
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
                  to learn more about the beta.
                  </Text>
                </Box>
              </ChatDisclaimer>
            )}
            <MessageBubble
              message={message}
              isConsecutive={isConsecutive}
              isFirst={isFirst}
            />
            {isLoading && index === lastUserMessageIndex && <Reasoning />}

            {/* Prompt options for first message, removed when sent */}
            {messages.length < 2 && LANDING_PAGE_VERSION !== "public" && (
              <SamplePrompts />
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}

export default ChatMessages;
