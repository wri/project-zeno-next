"use client";
import { Fragment, useState, useEffect, useRef } from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import useChatStore from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import Reasoning from "./Reasoning";
import SamplePrompts from "./SamplePrompts";
import ChatDisclaimer from "./ChatDisclaimer";

function ChatMessages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();
  const [displayDisclaimer, setDisplayDisclaimer] = useState(true);
  const t = useTranslations("chat");

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
                    <strong>{t("previewDisclaimer.heading")}</strong>
                  </Text>
                  <Text mb={{ base: 1, md: 2 }}>
                    {t("previewDisclaimer.body")}
                  </Text>
                  <Text>
                    {t("previewDisclaimer.feedbackIntro")}{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="https://surveys.hotjar.com/860def81-d4f2-4f8c-abee-339ebc3129f3"
                    >
                      {t("previewDisclaimer.surveyLink")}
                    </Link>{" "}
                    {t("previewDisclaimer.orEmail")}{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="mailto:landcarbonlab@wri.org"
                    >
                      landcarbonlab@wri.org
                    </Link>
                    {" "}
                    {t("previewDisclaimer.helpIntro")}{" "}
                    <Link
                      color="primary.solid"
                      textDecor="underline"
                      href="https://help.globalnaturewatch.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("previewDisclaimer.helpLink")}
                    </Link>{" "}
                    {t("previewDisclaimer.helpSuffix")}
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
