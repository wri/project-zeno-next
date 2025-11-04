"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import { SelectionTooltip } from "./SelectionTooltip";
import { useSelectionTooltip } from "../hooks/useSelectionTooltip";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";
import ChatDisclaimer from "./ChatDisclaimer";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();
  const [displayDisclaimer, setDisplayDisclaimer] = useState(true);
  const { isTooltipOpen, tooltipTarget, handleMouseUp, handleCopy, onClose } = useSelectionTooltip(containerRef);

    
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
    <Box ref={containerRef} fontSize="sm" position="relative">
      <SelectionTooltip
        isOpen={isTooltipOpen}
        onClose={onClose}
        target={tooltipTarget}
        onCopy={handleCopy}
        containerRef={containerRef}
      />
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
                <Text>
                <strong>Beta notice</strong>
                <br />
                This version of Global Nature Watch is still being tested. Expect mistakes and verify results with primary sources.
                Assistant behavior, features and datasets may change or be removed while in beta.
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
                  to learn more.
                <br />
                  Your feedback is critical to improving Global Nature Watch. Complete{" "}
                  <Link
                    color="primary.solid"
                    textDecor="underline"
                    href="https://surveys.hotjar.com/860def81-d4f2-4f8c-abee-339ebc3129f3"
                  >
                    this survey
                  </Link>{" "}
                   or email us at{" "} 
                   <Link
                    color="primary.solid"
                    textDecor="underline"
                    href="mailto:landcarbonlab@wri.org"
                  >
                    landcarbonlab@wri.org
                  </Link>{"."}
                </Text>
              </ChatDisclaimer>
            )}
            <MessageBubble
              message={message}
              isConsecutive={isConsecutive}
              isFirst={isFirst}
              onSelectText={handleMouseUp}
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
