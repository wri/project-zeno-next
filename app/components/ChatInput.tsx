"use client";
import { useState } from "react";
import { Button, Flex, Textarea } from "@chakra-ui/react";
import { ArrowBendRightUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";
import useContextStore from "../store/contextStore";
import { useRouter } from "next/navigation";

function ChatInput({ isChatDisabled }: { isChatDisabled?: boolean }) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedContextType, setSelectedContextType] =
    useState<ChatContextType | null>(null);

  const router = useRouter();

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

    const result = await sendMessage(message);
    if (result.isNew) {
      router.replace(`/app/threads/${result.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift) or Command+Enter
    if (
      (e.key === "Enter" && !e.shiftKey && !e.metaKey) ||
      (e.key === "Enter" && e.metaKey)
    ) {
      e.preventDefault(); // Prevents newline
      submitPrompt();
    }
    // If Shift+Enter, do nothing: allow newline
  };

  const disabled = isLoading || isChatDisabled;
  const message = isLoading ? "Sending..." : "Ask a question...";

  const isButtonDisabled = disabled || !inputValue?.trim();
  const hasContext = context.length > 0;
  return (
    <Flex
      flexDir="column"
      position="relative"
      m={0}
      p={4}
      bg="gray.100"
      borderColor="gray.300"
      borderRadius="lg"
      borderWidth="1px"
      className="group"
      transition="all 0.32s ease-in-out"
      _active={{
        borderColor: "primary.focusRing",
      }}
      _focusWithin={{
        borderColor: "primary.focusRing",
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
                  ? c.content || c.aoiData?.name || c.aoiData?.src_id
                  : JSON.stringify(c.content)
              }
              onClose={() => removeContext(c.id)}
              closeable
            />
          ))}
        </Flex>
      )}
      <Textarea
        aria-label="Ask a question..."
        placeholder={message}
        fontSize="sm"
        autoresize
        maxH="10lh"
        border="none"
        p={0}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        _disabled={{
          opacity: 1,
        }}
        _focus={{
          outline: "none",
        }}
        _placeholder={{
          color: disabled ? "gray.400" : "gray.600",
        }}
      />
      <Flex justifyContent="space-between" alignItems="center" w="full">
        <Flex gap="2">
          <ContextButton
            contextType="layer"
            onClick={() => openContextMenu("layer")}
            disabled={disabled}
          />
          <ContextButton
            contextType="area"
            onClick={() => openContextMenu("area")}
            disabled={disabled}
          />
          <ContextButton
            contextType="date"
            onClick={() => openContextMenu("date")}
            disabled={disabled}
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
          variant="solid"
          colorPalette="primary"
          _disabled={{
            opacity: 0.36,
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
