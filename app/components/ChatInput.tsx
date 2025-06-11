"use client";
import { useState } from "react";
import { Box, Button, Textarea } from "@chakra-ui/react";
import { ArrowUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";

function ChatInput() {
  const [inputValue, setInputValue] = useState("");
  const { sendMessage, isLoading } = useChatStore();

  const submitPrompt = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue.trim();
    setInputValue("");
    
    await sendMessage(message);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.keyCode === 13 && inputValue?.trim().length > 0 && !isLoading) {
      e.preventDefault();
      submitPrompt();
    }
  };

  const getInputState = () => {
    return {
      disabled: isLoading,
      message: isLoading ? "Sending..." : "Ask a question"
    };
  };

  const { disabled, message } = getInputState();
  const isButtonDisabled = disabled || !inputValue?.trim();

  return (
    <Box position="relative" m={0} p={0}>
      <Textarea
        aria-label="Ask a question"
        placeholder={message}
        fontSize="sm"
        autoresize
        maxH="10lh"
        pr="12"
        bg="bg.subtle"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        _disabled={{
          opacity: 1
        }}
      />
      <Button
        position="absolute"
        right="2"
        bottom="0.5"
        transform="translateY(-50%)"
        padding="0"
        borderRadius="full"
        colorPalette="blue"
        _disabled={{
          opacity: 0.75,
        }}
        type="button"
        size="xs"
        onClick={submitPrompt}
        disabled={isButtonDisabled}
        loading={isLoading}
      >
        <ArrowUpIcon />
      </Button>
    </Box>
  );
}

export default ChatInput;
