"use client";

import { useState } from "react";
import { Box, Button, Flex, Textarea } from "@chakra-ui/react";
import { ArrowBendRightUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import SamplePrompts from "@/app/components/SamplePrompts";
import { useRouter } from "next/navigation";

export default function MinimizedInput() {
  const [inputValue, setInputValue] = useState("");
  const { sendMessage, isLoading } = useChatStore();
  const { openChat } = useExplorePanelStore();
  const router = useRouter();

  const handleFocus = () => {
    openChat();
  };

  const submitPrompt = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue.trim();
    setInputValue("");
    openChat();
    const result = await sendMessage(message);
    if (result.isNew) {
      router.replace(`/app/threads/${result.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (e.key === "Enter" && !e.shiftKey && !e.metaKey) ||
      (e.key === "Enter" && e.metaKey)
    ) {
      e.preventDefault();
      submitPrompt();
    }
  };

  const disabled = isLoading;

  return (
    <Box w="400px">
      <SamplePrompts />
      <Flex
        flexDir="column"
        position="relative"
        p={3}
        bg="bg"
        borderColor="border.muted"
        borderRadius="lg"
        borderWidth="1px"
        shadow="md"
        transition="all 0.24s ease"
        _focusWithin={{
          borderColor: "primary.focusRing",
          shadow: "lg",
        }}
      >
        <Flex alignItems="center" gap={2}>
          {/* Pulsing dot when loading */}
          {isLoading && (
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg="primary.solid"
              flexShrink={0}
              animation="pulse 1.5s ease-in-out infinite"
            />
          )}
          <Textarea
            aria-label="Ask a question..."
            placeholder={isLoading ? "Generating response..." : "Ask a question..."}
            fontSize="sm"
            minH="20px"
            maxH="3lh"
            autoresize
            border="none"
            p={0}
            flex={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            _disabled={{ opacity: 1 }}
            _focus={{ outline: "none", boxShadow: "none" }}
            _placeholder={{ color: disabled ? "gray.400" : "gray.600" }}
          />
          <Button
            p="0"
            borderRadius="full"
            variant="solid"
            colorPalette="primary"
            _disabled={{ opacity: 0.36 }}
            size="xs"
            onClick={submitPrompt}
            disabled={disabled || !inputValue?.trim()}
            loading={isLoading}
            flexShrink={0}
          >
            <ArrowBendRightUpIcon weight="bold" />
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
