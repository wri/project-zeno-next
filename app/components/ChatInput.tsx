"use client";
import { useState } from "react";
import { Button, Flex, Textarea } from "@chakra-ui/react";
import { ArrowUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";

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
      message: isLoading ? "Sending..." : "Ask Zeno a question",
    };
  };

  const { disabled, message } = getInputState();
  const isButtonDisabled = disabled || !inputValue?.trim();
  const hasContext = true; // placeholder
  const sampleContext = [
    //placholder
    { contextType: "date", content: "2023/11/21 - 2024/07/02" },
    { contextType: "layer", content: "DIST Alerts" },
    { contextType: "area", content: "Indonesia" },
  ];
  return (
    <Flex
      flexDir="column"
      position="relative"
      gap={2}
      m={0}
      p={4}
      bg="bg.subtle"
      borderRadius="md"
      borderWidth="1px"
      className="group"
      _active={{
        bg: "white",
        borderColor: "blue"
      }}
      _focusWithin={{
        bg: "white",
        borderColor: "blue"
      }}
    >
      {hasContext && (
        <Flex gap="2" wrap="wrap">
          {sampleContext.map((c) => (
            <ContextTag
              key={c.content}
              contextType={c.contextType as ChatContextType}
              content={c.content}
              closeable
            />
          ))}
        </Flex>
      )}
      <Textarea
        aria-label="Ask Zeno a question"
        placeholder={message}
        fontSize="sm"
        autoresize
        maxH="10lh"
        border="none"
        p={0}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        _disabled={{
          opacity: 1,
        }}
        _focus={{
          outline: "none",
        }}
      />
      <Flex justifyContent="space-between" alignItems="center" w="full">
        <Flex gap="2">
          <ContextButton contextType="area" />
          <ContextButton contextType="layer" />
          <ContextButton contextType="date" />
        </Flex>
        <Button
          p="0"
          ml="auto"
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
      </Flex>
    </Flex>
  );
}

export default ChatInput;
