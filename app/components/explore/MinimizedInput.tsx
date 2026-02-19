"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Textarea } from "@chakra-ui/react";
import {
  ArrowBendRightUpIcon,
  MagnifyingGlassIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
  StackIcon,
} from "@phosphor-icons/react";
import useChatStore from "@/app/store/chatStore";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import { usePromptStore } from "@/app/store/promptStore";
import { useRouter } from "next/navigation";

/** Truncate a string to maxLen and add ellipsis */
function truncate(str: string, maxLen: number) {
  return str.length > maxLen ? str.slice(0, maxLen).trimEnd() + "…" : str;
}

/** Pick n random items from an array (stable across re-renders via useState) */
function useRandomItems(items: string[], count: number) {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    if (items.length > 0 && picked.length === 0) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setPicked(shuffled.slice(0, Math.min(count, shuffled.length)));
    }
  }, [items, count, picked.length]);
  return picked;
}

export default function MinimizedInput() {
  const [inputValue, setInputValue] = useState("");
  const { sendMessage, isLoading, messages } = useChatStore();
  const { openChat, openDataset } = useExplorePanelStore();
  const { context } = useContextStore();
  const { startDrawing, setSelectionMode, toggleUploadAreaDialog } =
    useMapStore();
  const { prompts } = usePromptStore();
  const router = useRouter();

  const samplePrompts = useRandomItems(prompts, 3);

  // Derive nudge state
  const hasUserMessages = messages.some((m) => m.type === "user");
  const hasDataset = context.some((c) => c.contextType === "layer");
  const pendingClickCta = useMemo(() => {
    // Find the latest system message with a CTA (from click-on-map)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].cta) return messages[i].cta;
    }
    return null;
  }, [messages]);

  const handleFocus = () => {
    openChat();
  };

  const submitPrompt = async (prompt: string) => {
    openChat();
    const result = await sendMessage(prompt);
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
      if (inputValue.trim()) submitPrompt(inputValue.trim());
    }
  };

  const handleDraw = () => {
    startDrawing();
    setSelectionMode({ type: "Drawing", name: undefined });
  };

  const handleUpload = () => {
    toggleUploadAreaDialog();
    setSelectionMode({ type: "Uploading", name: undefined });
  };

  const disabled = isLoading;

  return (
    <Box w="420px">
      {/* Nudge buttons */}
      <Flex gap={2} mb={2} flexWrap="wrap">
        {/* Click-on-map CTA takes priority */}
        {pendingClickCta && (
          <Button
            size="xs"
            variant="solid"
            colorPalette="primary"
            rounded="full"
            onClick={() => submitPrompt(pendingClickCta.prompt)}
          >
            <MagnifyingGlassIcon weight="bold" />
            {pendingClickCta.label}
          </Button>
        )}

        {/* Initial state: show sample prompts as quick actions */}
        {!hasUserMessages &&
          !pendingClickCta &&
          samplePrompts.map((prompt, i) => (
            <Button
              key={i}
              size="xs"
              variant="solid"
              colorPalette="primary"
              rounded="full"
              onClick={() => submitPrompt(prompt)}
              maxW="200px"
            >
              <Box
                as="span"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {truncate(prompt, 40)}
              </Box>
            </Button>
          ))}

        {/* No dataset selected */}
        {!hasDataset && (
          <Button
            size="xs"
            variant="solid"
            colorPalette="primary"
            rounded="full"
            onClick={openDataset}
          >
            <StackIcon weight="bold" />
            Select a dataset
          </Button>
        )}

        {/* Area quick actions */}
        <Button
          size="xs"
          variant="solid"
          colorPalette="primary"
          rounded="full"
          onClick={handleDraw}
        >
          <SelectionPlusIcon weight="bold" />
          Draw area
        </Button>
        <Button
          size="xs"
          variant="solid"
          colorPalette="primary"
          rounded="full"
          onClick={handleUpload}
        >
          <UploadSimpleIcon weight="bold" />
          Upload area
        </Button>
      </Flex>

      {/* Input box */}
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
            placeholder={
              isLoading ? "Generating response..." : "Ask a question..."
            }
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
            onClick={() => {
              if (inputValue.trim()) submitPrompt(inputValue.trim());
            }}
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
