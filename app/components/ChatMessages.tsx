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
            {displayDisclaimer && (
              <ChatDisclaimer
                type="info"
                setDisplayDisclaimer={setDisplayDisclaimer}
              >
                <Text>
                  This is an <strong>experimental preview</strong> of Global
                  Nature Watch. Our AI assistant may make mistakes, please
                  verify outputs with primary sources. Feedback is welcome at{" "}
                  <Link
                    color="primary.solid"
                    textDecor="underline"
                    href="mailto:xyz@landandcarbonlab.org"
                  >
                    xyz@landandcarbonlab.org.
                  </Link>
                </Text>
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
