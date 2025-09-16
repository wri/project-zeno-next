"use client";
import {
  Box,
  useClipboard,
  Flex,
  IconButton,
  Textarea,
  Button,
  HStack,
  Popover,
  Portal,
} from "@chakra-ui/react";
import { Tooltip } from "./ui/tooltip";
import { ChatMessage } from "@/app/types/chat";
import WidgetMessage from "./WidgetMessage";
import Markdown from "react-markdown";
import {
  ArrowBendDownRightIcon,
  CheckIcon,
  CopyIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@phosphor-icons/react";
import LclLogo from "./LclLogo";
import ContextTag from "./ContextTag";
import { ChatContextType } from "./ContextButton";
import { ContextItem } from "../store/contextStore";
import { useEffect, useState, useCallback } from "react";
import remarkBreaks from "remark-breaks";
import { WarningIcon } from "@phosphor-icons/react";
import useChatStore from "../store/chatStore";
import { toaster } from "./ui/toaster";

interface MessageBubbleProps {
  message: ChatMessage;
  isConsecutive?: boolean; // Whether this message is consecutive to the previous one of the same type
}

function MessageBubble({ message, isConsecutive = false }: MessageBubbleProps) {
  const [formattedTimestamp, setFormattedTimestamp] = useState("");
  const clipboard = useClipboard({ value: message.message });
  const [isRating, setIsRating] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const { currentThreadId } = useChatStore();

  useEffect(() => {
    // This has to be done by a useEffect, otherwise there will be a hydration
    // mismatch because the timestamp is different on the server and client
    const date = new Date(message.timestamp);
    const time = date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const day = date.toLocaleDateString([], {
      year: "numeric",
      day: "2-digit",
      month: "short",
    });
    setFormattedTimestamp(`${time} on ${day}`);
  }, [message.timestamp]);

  const rateMessage = useCallback(
    async (ratingValue: 1 | -1, comment?: string) => {
      if (isRating) return;
      try {
        setIsRating(true);
        const threadId = currentThreadId || "";
        if (!threadId) {
          toaster.create({
            title: "Unable to rate",
            description: "No active thread.",
            type: "error",
          });
          return;
        }
        // Only attempt rating for assistant messages with a traceId
        if (!message.traceId) return;
        const res = await fetch(`/api/threads/${threadId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trace_id: message.traceId,
            rating: ratingValue,
            comment,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to submit rating", text);
          toaster.create({
            title: "Rating failed",
            description: "Please try again.",
            type: "error",
          });
        } else {
          if (ratingValue === 1) {
            toaster.create({
              title: "Thanks for the feedback",
              description: "Glad it helped!",
              duration: 2500,
              type: "success",
            });
          } else {
            const hasComment =
              typeof comment === "string" && comment.trim().length > 0;
            toaster.create({
              title: hasComment ? "Feedback sent" : "Marked as not helpful",
              description: hasComment
                ? "Thanks for helping us improve."
                : "You can add a comment.",
              duration: 2500,
              type: "success",
            });
          }
        }
      } finally {
        setIsRating(false);
      }
    },
    [isRating, message.traceId, currentThreadId]
  );

  const submitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) {
      setFeedbackOpen(false);
      return;
    }
    await rateMessage(-1, feedbackText.trim());
    setFeedbackText("");
    setFeedbackOpen(false);
  }, [feedbackText, rateMessage]);

  const isUser = message.type === "user";
  const isWidget = message.type === "widget";
  const isError = message.type === "error";
  const hasContext = isUser && message.context && message.context.length > 0;
  // For widget messages, render them in a full-width container
  if (isWidget && message.widgets) {
    return message.widgets.map((widget, idx) => (
      <Box
        mb={4}
        key={`${widget.title} ${message.id}`}
        id={`widget-${message.id}-${idx}`}
        scrollMarginTop="32px"
      >
        <WidgetMessage widget={widget} />
      </Box>
    ));
  }

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={isConsecutive ? 1 : 4} // Reduced margin for consecutive messages
      _first={{ base: { mt: 3 }, md: { mt: 6 } }}
    >
      <Box
        display="flex"
        flexDir="column"
        alignItems={isUser ? "flex-end" : "flex-start"}
        w={isUser ? "fit-content" : "100%"}
        maxW={isUser ? "80%" : "none"}
        bg={isError ? "red.50" : isUser ? "gray.100" : "transparent"}
        color={isError ? "red.800" : "fg"}
        px={isUser || isError ? 4 : 0}
        py={isUser || isError ? 3 : 0}
        borderRadius="lg"
        borderBottomRightRadius={isUser ? "sm" : "lg"}
        borderBottomLeftRadius={isUser ? "lg" : "sm"}
        border={isError ? "1px solid" : "none"}
        borderColor={isError ? "red.200" : "transparent"}
      >
        {hasContext && (
          <Flex gap="2" wrap="wrap" mb="1">
            <Flex gap="1" fontSize="xs" color="fg.muted">
              <ArrowBendDownRightIcon /> Context:
            </Flex>
            {message.context?.map((c: ContextItem) => (
              <ContextTag
                key={c.id}
                contextType={c.contextType as ChatContextType}
                content={
                  typeof c.content === "string"
                    ? c.content
                    : JSON.stringify(c.content)
                }
              />
            ))}
          </Flex>
        )}
        {isError ? (
          <Flex alignItems="center" gap="2">
            <WarningIcon weight="fill" color="red" />
            <Box
              css={{
                "& > p:not(:last-of-type)": { mb: 2 },
                "& > h1, & > h2, & > h3, & > h4, & > h5, & > h6": {
                  borderBottom: "1px solid",
                  borderColor: "bg.muted",
                  pb: 2,
                },
              }}
            >
              <Markdown remarkPlugins={[remarkBreaks]}>
                {message.message}
              </Markdown>
            </Box>
          </Flex>
        ) : (
          <Box
            css={{
              "& > p:not(:last-of-type)": { mb: 2 },
              "& > h1, & > h2, & > h3, & > h4, & > h5, & > h6": {
                borderBottom: "1px solid",
                borderColor: "bg.muted",
                pb: 2,
              },
            }}
          >
            <Markdown remarkPlugins={[remarkBreaks]}>
              {message.message}
            </Markdown>
          </Box>
        )}
        {!isUser && !isConsecutive && !isError && (
          <Flex
            alignItems="center"
            w="full"
            justifyContent="space-between"
            gap="2"
            transition="all 0.32s ease-in-out"
            opacity={0.5}
            _hover={{ opacity: 1 }}
          >
            <Flex
              fontSize="xs"
              color="fg.muted"
              gap="2"
              textAlign={isUser ? "right" : "left"}
            >
              <LclLogo width={11} avatarOnly />
              {formattedTimestamp}
            </Flex>
            <Flex>
              <Tooltip
                content={
                  clipboard.copied
                    ? "Response copied to clipboard"
                    : "Copy response"
                }
              >
                <IconButton variant="ghost" size="xs" onClick={clipboard.copy}>
                  {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip content="Good response">
                <IconButton
                  variant="ghost"
                  size="xs"
                  disabled={isRating || !message.traceId}
                  onClick={() => rateMessage(1)}
                >
                  <ThumbsUpIcon />
                </IconButton>
              </Tooltip>
              <Popover.Root
                open={feedbackOpen}
                onOpenChange={(e) => setFeedbackOpen(e.open)}
                positioning={{ placement: "bottom-end" }}
              >
                <Tooltip content="Bad response">
                  <Box display="inline-block">
                    <Popover.Trigger asChild>
                      <IconButton
                        variant="ghost"
                        size="xs"
                        disabled={isRating || !message.traceId}
                        onClick={async () => {
                          await rateMessage(-1);
                          setFeedbackOpen(true);
                        }}
                      >
                        <ThumbsDownIcon />
                      </IconButton>
                    </Popover.Trigger>
                  </Box>
                </Tooltip>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content>
                      <Popover.Body>
                        <Textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Tell us what went wrong (optional)"
                          size="sm"
                          rows={3}
                        />
                        <HStack justify="flex-end" mt="2" gap="2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setFeedbackOpen(false);
                              setFeedbackText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            disabled={isRating}
                            colorPalette="primary"
                            onClick={submitFeedback}
                          >
                            Send feedback
                          </Button>
                        </HStack>
                      </Popover.Body>
                      <Popover.CloseTrigger />
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
            </Flex>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

export default MessageBubble;
