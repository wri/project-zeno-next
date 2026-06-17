"use client";
import { Button, Flex, Text } from "@chakra-ui/react";
import { CheckIcon } from "@phosphor-icons/react";
import { AnalyseSuggestion } from "@/app/types/chat";
import useChatStore from "@/app/store/chatStore";
import { runAnalysis } from "@/app/lib/analysis/runAnalysis";

export default function AnalyseNudge({
  messageId,
  suggestion,
}: {
  messageId: string;
  suggestion: AnalyseSuggestion;
}) {
  // Accepted state lives on the message so the card survives re-mounts and
  // accepted nudges persist in the thread when a new selection is made.
  const accepted = suggestion.accepted ?? false;

  const handleAnalyse = () => {
    if (accepted) return;
    useChatStore.getState().acceptAnalyseNudge(messageId);
    runAnalysis(suggestion);
  };

  return (
    <Flex
      direction="column"
      gap={3}
      w="full"
      px={3}
      py={2}
      bg="bg.panel"
      border="1px solid"
      borderColor={accepted ? "primary.500" : "primary.emphasized"}
      borderRadius="lg"
    >
      <Flex direction="column" gap={1}>
        <Text fontSize="xs" fontWeight="semibold" lineHeight="16px">
          {suggestion.areaName}
        </Text>
        <Text fontSize="xs" color="fg.muted" lineHeight="16px">
          Run an analysis of {suggestion.datasetName} for this area?
        </Text>
      </Flex>
      <Button
        size="xs"
        colorPalette="primary"
        alignSelf="flex-start"
        onClick={handleAnalyse}
        disabled={accepted}
      >
        {accepted ? (
          <>
            <CheckIcon weight="bold" /> Analysing
          </>
        ) : (
          "Analyse"
        )}
      </Button>
    </Flex>
  );
}
