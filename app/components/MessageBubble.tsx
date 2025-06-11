"use client";
import { Box, Badge, Flex, IconButton } from "@chakra-ui/react";
import { Tooltip } from "./ui/tooltip";
import { ChatMessage } from "@/app/types/chat";
import WidgetMessage from "./WidgetMessage";
import Markdown from "react-markdown";
import {
  ArrowBendDownRightIcon,
  ArrowsCounterClockwiseIcon,
  CopyIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@phosphor-icons/react";
import LclLogo from "./LclLogo";
import ContextTag from "./ContextTag";
import { ChatContextType } from "./ContextButton";
interface MessageBubbleProps {
  message: ChatMessage;
  isConsecutive?: boolean; // Whether this message is consecutive to the previous one of the same type
}

function MessageBubble({ message, isConsecutive = false }: MessageBubbleProps) {
  const isUser = message.type === "user";
  const isWidget = message.type === "widget";
  const isError = message.type === "error";
  const hasContext = isUser && true; // placeholder
  const sampleContext = [ //placholder
    { contextType: "area", content: "Beirut, Lebanon" },
    { contextType: "date", content: "2025/01/01 - 2025/03/19" },
    { contextType: "layer", content: "FIRMS" },
    { contextType: "area", content: "Svalbard" },
    { contextType: "layer", content: "Fire alerts (VIRS)" },
  ];
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
        display="flex"
        flexDir="column"
        alignItems={isUser ? "flex-end" : "flex-start"}
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
        {hasContext &&
          <Flex gap="2" wrap="wrap" mb="1" >
            <Flex gap="1" fontSize="xs" color="fg.muted">
              <ArrowBendDownRightIcon /> Context:
            </Flex>
            {sampleContext.map((c) => (
              <ContextTag key={c.content} contextType={c.contextType as ChatContextType} content={c.content} />
            ))}
          </Flex>}
        <Markdown>{message.message}</Markdown>
        {!isUser && (
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
          </Flex>
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
        </Flex>
        )}
      </Box>
    </Box>
  );
}

export default MessageBubble;
