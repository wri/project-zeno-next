"use client";
import { useState, useRef } from "react";
import {
  Button,
  Flex,
  Textarea,
  useBreakpointValue,
  useDisclosure,
  Dialog,
  Text,
  Portal,
} from "@chakra-ui/react";
import { ArrowBendRightUpIcon } from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";
import useContextStore from "../store/contextStore";
import { useRouter } from "next/navigation";

export default function ChatInput({
  isChatDisabled,
}: {
  isChatDisabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [selectedContextType, setSelectedContextType] =
    useState<ChatContextType | null>(null);

  const router = useRouter();

  // Hooks for responsive modal behavior
  const isMobile = useBreakpointValue({ base: true, md: false });
  const {
    open: inputModalOpen,
    onOpen: onInputModalOpen,
    onClose: onInputModalClose,
  } = useDisclosure();
  const initialFocusRef = useRef<HTMLTextAreaElement>(null);
  const [focusEl, setFocusEl] = useState<HTMLTextAreaElement | null>(null);

  const { sendMessage, isLoading } = useChatStore();
  const { context, removeContext } = useContextStore();

  const openContextMenu = (type: ChatContextType) => {
    setSelectedContextType(type);
    setContextModalOpen(true);
  };

  const handleContextModalOpenChange = (e: { open: boolean }) => {
    setContextModalOpen(e.open);
    if (!e.open) setSelectedContextType(null);
  };

  const submitPrompt = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");

    // Close the modal on mobile after sending a message
    if (isMobile) {
      onInputModalClose();
    }

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

  // The core UI of the chat input is defined here so it can be reused
  // for both the desktop view and within the mobile modal.
  const chatInputUI = (
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
        ref={setFocusEl}
        aria-label="Ask a question..."
        placeholder={message}
        fontSize="sm"
        minH="20px"
        resize="none"
        maxH="10lh"
        border="none"
        p={0}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        _disabled={{ opacity: 1 }}
        _focus={{ outline: "none", boxShadow: "none" }}
        _placeholder={{ color: disabled ? "gray.400" : "gray.600" }}
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
            open={contextModalOpen}
            onOpenChange={handleContextModalOpenChange}
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

  // For desktop, return the UI directly.
  if (!isMobile) {
    return chatInputUI;
  }

  // For mobile, return a trigger and a modal containing the UI.
  return (
    <>
      {/* Mobile Trigger Bar */}
      <Flex
        onClick={onInputModalOpen}
        align="center"
        justifyContent="space-between"
        m={0}
        p={3}
        gap={1}
        bg="gray.100"
        maxH="6lh"
        overflowY="auto"
        borderTopWidth="1px"
        borderColor="gray.300"
        cursor="pointer"
        position="relative"
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
        <Text
          fontSize="sm"
          color={inputValue ? "fg" : "fg.subtle"}
          wordBreak="break-word"
        >
          {inputValue || message}
        </Text>
        <Button
          p={0}
          flexShrink={0}
          colorPalette="primary"
          title="Send message"
          aria-hidden
          ml="auto"
          borderRadius="full"
          variant="solid"
          _disabled={{ opacity: 0.36, cursor: "not-allowed" }}
          type="button"
          size="xs"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            submitPrompt();
          }}
          disabled={isButtonDisabled}
          loading={isLoading}
        >
          <ArrowBendRightUpIcon weight="bold" />
        </Button>
      </Flex>

      {/* Input Modal appears on tap when on mobile device */}
      <Dialog.Root
        open={inputModalOpen}
        onOpenChange={onInputModalClose}
        initialFocusEl={focusEl ? () => focusEl : undefined}
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.400" backdropFilter="blur(2px)" />
          <Dialog.Positioner>
            <Dialog.Content bg="transparent" boxShadow="none" mx={3} bottom={6}>
              {chatInputUI}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
