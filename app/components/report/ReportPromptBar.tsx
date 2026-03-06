"use client";

import { useState } from "react";
import { Box, Flex, Input, Button, IconButton, Spinner, Text } from "@chakra-ui/react";
import { SparkleIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react";
import { Tooltip } from "@/app/components/ui/tooltip";

interface Props {
  /** Called when user clicks Generate. Returns when generation is complete. */
  onGenerate: (prompt: string) => Promise<void>;
  /** Called when user clicks the plain "Add text block" button. */
  onAddTextBlock: () => void;
  /** Whether a generation is currently in progress. */
  isGenerating: boolean;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** When true, shows a banner indicating responses are mocked. */
  isMockMode?: boolean;
}

export default function ReportPromptBar({
  onGenerate,
  onAddTextBlock,
  isGenerating,
  placeholder = "Write about this report…",
  isMockMode = false,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setPrompt("");
    await onGenerate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <Box mb={4}>
      {isMockMode && (
        <Flex
          align="center"
          gap={1.5}
          mb={2}
          px={3}
          py={1.5}
          bg="orange.50"
          border="1px solid"
          borderColor="orange.200"
          rounded="md"
        >
          <WarningIcon size={14} color="var(--chakra-colors-orange-500)" />
          <Text fontSize="xs" color="orange.700">
            Mock mode — AI responses are placeholder text.
          </Text>
        </Flex>
      )}
    <Flex gap={2} align="center">
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        size="sm"
        flex={1}
        disabled={isGenerating}
      />
      <Button
        size="sm"
        colorPalette="primary"
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
      >
        {isGenerating ? (
          <>
            <Spinner size="xs" /> Generating…
          </>
        ) : (
          <>
            <SparkleIcon size={16} weight="fill" /> Generate
          </>
        )}
      </Button>
      <Tooltip
        content="Add empty text block"
        positioning={{ placement: "top" }}
      >
        <IconButton
          aria-label="Add text block"
          variant="outline"
          size="sm"
          onClick={onAddTextBlock}
        >
          <PlusIcon size={16} />
        </IconButton>
      </Tooltip>
    </Flex>
    </Box>
  );
}
