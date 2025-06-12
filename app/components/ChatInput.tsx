"use client";
import { useState } from "react";
import { Button, Flex, Textarea } from "@chakra-ui/react";
import { ArrowBendRightUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";

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
      message: isLoading ? "Sending..." : "Ask Zeno a question...",
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
      transition="all 0.32s ease-in-out"
      _active={{
        bg: "white",
        borderColor: "blue.900"
      }}
      _focusWithin={{
        bg: "white",
        borderColor: "blue.900"
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
        aria-label="Ask Zeno a question..."
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
          <ContextMenu contextType="layer" />
          <ContextMenu contextType="area" />
          <ContextMenu contextType="date" />
        </Flex>
        <Button
          p="0"
          ml="auto"
          borderRadius="full"
          colorPalette="blue"
          bg="blue.900"
          _disabled={{
            opacity: 0.75,
          }}
          type="button"
          size="xs"
          onClick={submitPrompt}
          disabled={isButtonDisabled}
          loading={isLoading}
        >
          <ArrowBendRightUpIcon />
        </Button>
      </Flex>
    </Flex>
  );
}

export default ChatInput;
