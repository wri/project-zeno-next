"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, CloseButton, Link, Text } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import { InfoIcon } from "@phosphor-icons/react";
import { usePromptStore } from "../store/promptStore";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const SAMPLE_PROMPTS = [
  "Show me recent forest loss due to firest in protected areas",
  "I want to monitor restoration progress in my region. What datasets should I use?",
  "Where are the most disturbances to nature happening now?",
];
function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage } = useChatStore();
  const { prompts } = usePromptStore();
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

        return (
          <Fragment key={message.id}>
            {/* Disclaimer above first message in closed mode */}
            {index === 0 &&
              LANDING_PAGE_VERSION !== "public" &&
              displayDisclaimer && (
                <Box
                  background="secondary.subtle"
                  p={2}
                  rounded="sm"
                  border="1px solid"
                  borderColor="secondary.300"
                  fontSize="xs"
                  display="flex"
                  gap={2}
                  my={4}
                  mb={6}
                >
                  <InfoIcon
                    weight="fill"
                    style={{ flexShrink: 0 }}
                    size="16"
                    fill="var(--chakra-colors-secondary-600)"
                  />
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
                  <CloseButton
                    size="2xs"
                    variant="ghost"
                    colorPalette="secondary"
                    title="Hide disclaimer"
                    onClick={() => setDisplayDisclaimer((prev) => !prev)}
                  />
                </Box>
              )}
            <MessageBubble message={message} isConsecutive={isConsecutive} />
            {isLoading && index === lastUserMessageIndex && <Reasoning />}

            {/* Prompt options for first message, removed when sent */}
            {messages.length < 2 && LANDING_PAGE_VERSION !== "public" && (
              <Box display="flex" gap={2} flexWrap="nowrap" mt={6} mb={4}>
                {prompts.slice(0, 3).map((text, i) => (
                  <Box
                    key={i}
                    p={2}
                    flex={1}
                    rounded="lg"
                    border="1px solid"
                    borderColor="border.emphasized"
                    fontSize="xs"
                    transition="all 0.24s ease"
                    _hover={{
                      cursor: "pointer",
                      bg: "bg.subtle",
                      borderColor: "primary.solid",
                    }}
                    onClick={() => sendMessage(text)}
                  >
                    {text}
                  </Box>
                ))}
              </Box>
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}

export default ChatMessages;
