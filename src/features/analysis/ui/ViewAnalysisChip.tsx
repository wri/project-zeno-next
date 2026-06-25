"use client";
import { Flex, Spinner, Text } from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import type { AnalysisStatus } from "./use-analysis";

const ACCENT = "#0049AA";
const ERROR = "#C0392B";

/**
 * On-map "View analysis" nudge chip shown beside a selected AOI label. Clicking
 * it kicks off the default analysis; the label reflects run status. Presentational
 * only — the caller owns the analysis run (useAnalysis) and passes status + onClick.
 */
export function ViewAnalysisChip({
  status,
  error,
  onClick,
}: {
  status: AnalysisStatus;
  error?: Error | null;
  onClick: () => void;
}) {
  const running = status === "running";
  const isError = status === "error";
  const color = isError ? ERROR : ACCENT;
  const label = running
    ? "Analyzing…"
    : isError
      ? "Retry analysis"
      : "View analysis";

  const chip = (
    <Flex
      as="button"
      align="center"
      gap="5px"
      px="10px"
      py="5px"
      bg="#FFFFFF"
      borderWidth="1px"
      borderColor={color}
      rounded="4px"
      boxShadow="sm"
      cursor={running ? "default" : "pointer"}
      opacity={running ? 0.85 : 1}
      onClick={running ? undefined : onClick}
      _hover={running ? undefined : { bg: "#F0F4FF" }}
    >
      {running && <Spinner size="xs" color={ACCENT} />}
      <Text fontSize="13px" fontWeight="600" lineHeight="17px" color={color}>
        {label}
      </Text>
      {!running && (
        <Text fontSize="13px" lineHeight="17px" color={color}>
          →
        </Text>
      )}
    </Flex>
  );

  if (isError && error) {
    return (
      <Tooltip content={error.message} showArrow>
        {chip}
      </Tooltip>
    );
  }
  return chip;
}
