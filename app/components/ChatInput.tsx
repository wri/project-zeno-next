"use client";
import { useState } from "react";
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
import { ArrowBendRightUpIcon, StopIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";
import useMapStore from "../store/mapStore";
import { isAreaLayer } from "../store/layerManagerSlice";
import { useRouter } from "next/navigation";

export default function ChatInput({
  isChatDisabled,
  bordered,
  onAfterSend,
}: {
  isChatDisabled?: boolean;
  /** Render the input box as a standalone rounded card (conversation panel) */
  bordered?: boolean;
  /** Called immediately before sending, e.g. to expand a collapsed panel */
  onAfterSend?: () => void;
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

  const [focusEl, setFocusEl] = useState<HTMLTextAreaElement | null>(null);

  const {
    sendMessage,
    isLoading,
    cancelRequest,
    abortController,
    messages,
    dateRange,
    clearDateRange,
  } = useChatStore();
  const { layers, removeLayer } = useMapStore();

  // Pills are a presentational view of the current scope: visible dataset
  // layers + visible area layers + the selected date range. Dataset/area
  // sub-layers are excluded.
  const datasetPillLayers = layers.filter(
    (l) => typeof l.datasetId === "number" && !l.parentLayerId
  );
  const areaPillLayers = layers.filter((l) => l.visible && isAreaLayer(l));

  // Removing a dataset pill removes the layer and any context sub-layers.
  const removeDatasetLayer = (datasetId: number) => {
    layers
      .filter((l) => l.datasetId === datasetId)
      .forEach((l) => removeLayer(l.id));
  };

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
    onAfterSend?.();

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
  // The abortController is the authoritative signal that a cancellable chat
  // request is in flight: sendMessage sets it before fetching and nulls it in
  // its finally, and nothing else touches it. We deliberately do NOT gate on
  // isLoading, which is an overloaded flag also set during thread loading (not
  // cancellable) and whose meaning could drift in the future.
  const canCancelRequest = abortController !== null;
  const hasNudge = messages.at(-1)?.type === "dataset-nudge";
  const hasConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  const message = isLoading
    ? "Sending..."
    : hasNudge
      ? "Or ask a different question..."
      : hasConversation
        ? "Ask a follow-up question…"
        : "Or describe what you want to explore…";

  const isButtonDisabled = disabled || !inputValue?.trim();
  const hasPills =
    datasetPillLayers.length > 0 || areaPillLayers.length > 0 || !!dateRange;

  // The core UI of the chat input is defined here so it can be reused
  // for both the desktop view and within the mobile modal.
  const chatInputUI = (
    <Flex
      flexDir="column"
      position="relative"
      m={0}
      p={4}
      bg={bordered ? "#F4F5F6" : "gray.100"}
      borderWidth={bordered ? "1px" : 0}
      borderColor={bordered ? "#E0E2E5" : undefined}
      borderRadius={bordered ? "sm" : undefined}
      className="group"
      transition="all 0.32s ease-in-out"
      _focusWithin={
        bordered
          ? { borderColor: "primary.focusRing", outline: "none" }
          : undefined
      }
    >
      {hasPills && (
        <Flex gap={1} wrap="wrap" mb={1}>
          {datasetPillLayers.map((l) => (
            <ContextTag
              key={l.id}
              contextType="layer"
              content={l.name}
              onClose={() => removeDatasetLayer(l.datasetId!)}
              closeable
            />
          ))}
          {areaPillLayers.map((l) => (
            <ContextTag
              key={l.id}
              contextType="area"
              content={l.selectionName ?? l.name}
              onClose={() => removeLayer(l.id)}
              closeable
            />
          ))}
          {dateRange && (
            <ContextTag
              contextType="date"
              content={`${format(dateRange.start, "yyyy-MM-dd")} — ${format(
                dateRange.end,
                "yyyy-MM-dd"
              )}`}
              onClose={clearDateRange}
              closeable
            />
          )}
        </Flex>
      )}
      <Textarea
        ref={setFocusEl}
        aria-label="Ask a question..."
        placeholder={message}
        fontSize="sm"
        minH="20px"
        autoresize
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
        </Flex>
        {canCancelRequest ? (
          <Button
            p="0"
            ml="auto"
            borderRadius="full"
            variant="solid"
            colorPalette="primary"
            type="button"
            size="xs"
            aria-label="Cancel request"
            onClick={cancelRequest}
            title="Cancel request"
          >
            <StopIcon weight="fill" />
          </Button>
        ) : (
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
            aria-label="Send prompt"
            onClick={submitPrompt}
            disabled={isButtonDisabled}
          >
            <ArrowBendRightUpIcon weight="bold" />
          </Button>
        )}
      </Flex>
    </Flex>
  );

  const contextMenu = selectedContextType && (
    <Portal>
      <ContextMenu
        contextType={selectedContextType}
        open={contextModalOpen}
        onOpenChange={handleContextModalOpenChange}
      />
    </Portal>
  );

  // For desktop, return the UI directly.
  if (!isMobile) {
    return (
      <>
        {chatInputUI}
        {contextMenu}
      </>
    );
  }

  // For mobile, return a trigger and a modal containing the UI.
  return (
    <>
      {/* Mobile Trigger Bar */}
      <Flex
        onClick={onInputModalOpen}
        flexDir="column"
        align="flex-start"
        justifyContent="space-between"
        m={0}
        p={3}
        bg="gray.100"
        maxH="7rem"
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
        <Flex justifyContent="space-between" alignItems="center" w="full">
          <Flex gap="2">
            <ContextButton
              contextType="layer"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                openContextMenu("layer");
              }}
              disabled={disabled}
            />
            <ContextButton
              contextType="area"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                openContextMenu("area");
              }}
              disabled={disabled}
            />
          </Flex>
          {canCancelRequest ? (
            <Button
              p={0}
              flexShrink={0}
              colorPalette="primary"
              title="Cancel request"
              aria-label="Cancel request"
              ml="auto"
              borderRadius="full"
              variant="solid"
              type="button"
              size="xs"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                cancelRequest();
              }}
            >
              <StopIcon weight="fill" />
            </Button>
          ) : (
            <Button
              p={0}
              flexShrink={0}
              colorPalette="primary"
              title="Send message"
              aria-label="Send prompt"
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
            >
              <ArrowBendRightUpIcon weight="bold" />
            </Button>
          )}
        </Flex>
      </Flex>
      {contextMenu}
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
            <Dialog.Content
              bg="transparent"
              boxShadow="none"
              position="fixed"
              w="full"
              maxW="calc(100vw - 1rem)"
            >
              {chatInputUI}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
