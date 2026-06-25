"use client";
import { Box, Button, Text } from "@chakra-ui/react";
import type { AnalysisStatus } from "./use-analysis";

interface AnalysisCTAContentProps {
  datasetLabel?: string;
  name: string;
  status: AnalysisStatus;
  error: Error | null;
  onAnalyze: () => void;
  onCancel: () => void;
}

/**
 * Presentational content of the analysis CTA — area name + Analyze/Cancel
 * actions, reflecting the run status. Map-free so it can be tested in
 * isolation; the geo-anchored Popup wrapper lives in AnalysisCTA.
 */
export function AnalysisCTAContent({
  datasetLabel,
  name,
  status,
  error,
  onAnalyze,
  onCancel,
}: AnalysisCTAContentProps) {
  const running = status === "running";

  return (
    <Box>
      <Text fontWeight="medium">{name}</Text>
      <Text fontWeight="medium">{datasetLabel}</Text>
      <Box display="flex" gap={1} mt={1}>
        <Button size="xs" onClick={onAnalyze} disabled={running}>
          {running ? "Analyzing…" : "Analyze"}
        </Button>
        {running && (
          <Button size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Box>
      {status === "error" && error && (
        <Text color="red.500" fontSize="xs" mt={1}>
          {error.message}
        </Text>
      )}
    </Box>
  );
}
