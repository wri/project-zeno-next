"use client";
import { Box, Text } from "@chakra-ui/react";
import { ChatMessage } from "@/app/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isConsecutive?: boolean; // Whether this message is consecutive to the previous one of the same type
}

function MessageBubble({ message, isConsecutive = false }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={isConsecutive ? 1 : 4} // Reduced margin for consecutive messages
    >
      <Box
        maxW="80%"
        bg={isUser ? "blue.500" : isSystem ? "gray.100" : "white"}
        color={isUser ? "white" : "black"}
        px={4}
        py={3}
        borderRadius="lg"
        borderBottomRightRadius={isUser ? "sm" : "lg"}
        borderBottomLeftRadius={isUser ? "lg" : "sm"}
        shadow={isSystem ? "none" : "sm"}
        border={isUser ? "none" : "1px solid"}
        borderColor={isUser ? "transparent" : "gray.200"}
      >
        <Text fontSize="sm" lineHeight="tall" whiteSpace="pre-wrap">
          {message.message}
        </Text>
        <Text
          fontSize="xs"
          opacity={0.7}
          mt={1}
          textAlign={isUser ? "right" : "left"}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </Box>
    </Box>
  );
}

export default MessageBubble; 