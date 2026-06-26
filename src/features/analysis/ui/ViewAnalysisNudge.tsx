"use client";
import { Button, Text } from "@chakra-ui/react";
import { CheckIcon, ChartBarIcon } from "@phosphor-icons/react";

import useChatStore from "@/app/store/chatStore";
import type { ViewAnalysisSuggestion } from "@/app/types/chat";

import { useAnalysis } from "./use-analysis";

/**
 * Direct-analysis "View Analysis" nudge — the in-chat replacement for the old
 * map popup (AnalysisCTA). Accepting it runs the analysis straight against the
 * analytics API (useAnalysis) and renders the result in the insight workspace,
 * rather than sending a generative prompt to the agent like AnalyseNudge.
 *
 * Styled to match AnalyseNudge so the two cards read as a pair in the thread.
 */
export default function ViewAnalysisNudge({
  messageId,
  suggestion,
}: {
  messageId: string;
  suggestion: ViewAnalysisSuggestion;
}) {
  const { status, error, run } = useAnalysis();
  // Accepted state lives on the message so the card survives re-mounts and
  // accepted nudges persist in the thread when a new selection is made.
  const accepted = suggestion.accepted ?? false;
  const running = status === "running";

  const handleViewAnalysis = () => {
    if (accepted) return;
    useChatStore.getState().acceptViewAnalysisNudge(messageId);
    run({
      area: suggestion.area,
      dataset: { id: suggestion.datasetId },
      startDate: suggestion.startDate,
      endDate: suggestion.endDate,
    });
  };

  const label = `View Analysis for ${suggestion.datasetName} in ${suggestion.area.name}`;

  return (
    <>
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
        _hover={
          accepted
            ? undefined
            : { bg: "primary.50", borderColor: "primary.emphasized" }
        }
        onClick={handleViewAnalysis}
        disabled={accepted}
      >
        {accepted ? (
          <CheckIcon weight="bold" color="var(--chakra-colors-primary-solid)" />
        ) : (
          <ChartBarIcon
            weight="regular"
            color="var(--chakra-colors-primary-solid)"
          />
        )}
        {running ? "Analyzing…" : label}
      </Button>
      {status === "error" && error && (
        <Text color="red.500" fontSize="xs" mt={1}>
          {error.message}
        </Text>
      )}
    </>
  );
}
