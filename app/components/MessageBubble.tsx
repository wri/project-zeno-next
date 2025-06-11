"use client";
import { Box, Text, Badge, Flex, IconButton } from "@chakra-ui/react";
import { Tooltip } from "./ui/tooltip";
import { ChatMessage } from "@/app/types/chat";
import WidgetMessage from "./WidgetMessage";
import Markdown from "react-markdown";
import {
  ArrowsCounterClockwiseIcon,
  CopyIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@phosphor-icons/react";
import LclLogo from "./LclLogo";
interface MessageBubbleProps {
  message: ChatMessage;
  isConsecutive?: boolean; // Whether this message is consecutive to the previous one of the same type
}

function MessageBubble({ message, isConsecutive = false }: MessageBubbleProps) {
  const isUser = message.type === "user";
  const isWidget = message.type === "widget";
  const isError = message.type === "error";

  // For widget messages, render them in a full-width container
  if (isWidget && message.widgets) {
    return (
      <Box mb={4}>
        <WidgetMessage widgets={message.widgets} />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={isConsecutive ? 1 : 4} // Reduced margin for consecutive messages
    >
      <Box
        w={isUser ? "fit-content" : "100%"}
        maxW={isUser ? "80%" : "none"}
        bg={isError ? "red.50" : isUser ? "gray.100" : "transparent"}
        color={isError ? "red.800" : "fg"}
        px={isUser ? 4 : 0}
        py={isUser ? 3 : 0}
        borderRadius="lg"
        borderBottomRightRadius={isUser ? "sm" : "lg"}
        borderBottomLeftRadius={isUser ? "lg" : "sm"}
        border={isError ? "1px solid" : "none"}
        borderColor={isError ? "red.200" : "transparent"}
      >
        {isError && <Badge colorPalette="red">Error</Badge>}
        <Markdown>{message.message}</Markdown>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap="2"
          transition="all 0.32s ease-in-out"
          opacity={0.5}
          _hover={{ opacity: 1 }}
        >
          {!isUser && <LclLogo width={11} avatarOnly />}
          <Text
            fontSize="xs"
            opacity={0.7}
            mt={1}
            textAlign={isUser ? "right" : "left"}
            mr="auto"
          >
            {new Date(message.timestamp).toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            on{" "}
            {new Date(message.timestamp).toLocaleDateString([], {
              year: "numeric",
              day: "2-digit",
              month: "short",
            })}
          </Text>
          {!isUser && (
            <Flex>
              <Tooltip content="Copy response">
                <IconButton variant="ghost" size="xs">
                  <CopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Good response">
                <IconButton variant="ghost" size="xs">
                  <ThumbsUpIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Bad response">
                <IconButton variant="ghost" size="xs">
                  <ThumbsDownIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Regenerate response">
                <IconButton variant="ghost" size="xs">
                  <ArrowsCounterClockwiseIcon />
                </IconButton>
              </Tooltip>
            </Flex>
          )}
        </Flex>
      </Box>
    </Box>
  );
}

export default MessageBubble;
