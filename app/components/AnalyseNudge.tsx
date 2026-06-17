"use client";
import { Button } from "@chakra-ui/react";
import { CheckIcon, SparkleIcon } from "@phosphor-icons/react";
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

  // Matches the agent prompt wording (buildAnalysisPrompt) so the message the
  // user sends on accept reads identically to the button they clicked.
  const label = `Analyse ${suggestion.datasetName} in ${suggestion.areaName}`;

  return (
    <Button
      w="full"
      variant="outline"
      justifyContent="flex-start"
      gap={2}
      px={3}
      py={2}
      h="auto"
      minH={10}
      fontSize="xs"
      fontWeight="light"
      textAlign="left"
      whiteSpace="normal"
      rounded="lg"
      borderColor={accepted ? "primary.500" : "border.emphasized"}
      _hover={accepted ? undefined : { borderColor: "primary.emphasized" }}
      onClick={handleAnalyse}
      disabled={accepted}
    >
      {accepted ? (
        <CheckIcon weight="bold" color="var(--chakra-colors-primary-solid)" />
      ) : (
        <SparkleIcon weight="thin" color="var(--chakra-colors-primary-solid)" />
      )}
      {label}
    </Button>
  );
}
