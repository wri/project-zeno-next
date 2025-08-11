"use client";
import { useState } from "react";
import { Button, Flex, Textarea } from "@chakra-ui/react";
import { ArrowBendRightUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";
import useContextStore from "../store/contextStore";

function ChatInput() {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedContextType, setSelectedContextType] =
    useState<ChatContextType | null>(null);

  const openContextMenu = (type: ChatContextType) => {
    setSelectedContextType(type);
    setOpen(true);
  };

  const handleOpenChange = (e: { open: boolean }) => {
    setOpen(e.open);
    if (!e.open) setSelectedContextType(null);
  };

  const { sendMessage, isLoading } = useChatStore();
  const { context, removeContext } = useContextStore();

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
      message: isLoading ? "Sending..." : "Ask Global Nature Watch a question...",
    };
  };

  const { disabled, message } = getInputState();
  const isButtonDisabled = disabled || !inputValue?.trim();
  const hasContext = context.length > 0;
  return (
    <Flex
      flexDir="column"
      position="relative"
      m={0}
      p={4}
      bg="bg.subtle"
      borderRadius="lg"
      borderWidth="1px"
      className="group"
      transition="all 0.32s ease-in-out"
      _active={{
        bg: "white",
        borderColor: "blue.900",
      }}
      _focusWithin={{
        bg: "white",
        borderColor: "blue.900",
      }}
    >
      {hasContext && (
        <Flex gap={1} wrap="wrap" mb={1}>
          {context.map((c) => (
            <ContextTag
              key={c.id}
              contextType={c.contextType as ChatContextType}
              content={
                typeof c.content === "string"
                  ? c.content
                  : JSON.stringify(c.content)
              }
              onClose={() => removeContext(c.id)}
              closeable
            />
          ))}
        </Flex>
      )}
      <Textarea
        aria-label="Ask Global Nature Watch a question..."
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
          <ContextButton
            contextType="layer"
            onClick={() => openContextMenu("layer")}
          />
          <ContextButton
            contextType="area"
            onClick={() => openContextMenu("area")}
          />
          <ContextButton
            contextType="date"
            onClick={() => openContextMenu("date")}
          />
        </Flex>
        {selectedContextType && (
          <ContextMenu
            contextType={selectedContextType}
            open={open}
            onOpenChange={handleOpenChange}
          />
        )}
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
          <ArrowBendRightUpIcon weight="bold" />
        </Button>
      </Flex>
    </Flex>
  );
}

export default ChatInput;
