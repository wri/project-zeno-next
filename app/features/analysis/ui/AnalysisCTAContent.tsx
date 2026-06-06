"use client";
import { Box, Button, Text } from "@chakra-ui/react";
import type { AnalysisStatus } from "./use-analysis";

interface AnalysisCTAContentProps {
  name: string;
  status: AnalysisStatus;
  onAnalyze: () => void;
}

/**
 * Presentational content of the analysis CTA — area name + Analyze action,
 * reflecting the run status. Map-free so it can be tested in isolation; the
 * geo-anchored Popup wrapper lives in AnalysisCTA.
 */
export function AnalysisCTAContent({
  name,
  status,
  onAnalyze,
}: AnalysisCTAContentProps) {
  const running = status === "running";

  return (
    <Box>
      <Text fontWeight="medium">{name}</Text>
      <Button size="xs" onClick={onAnalyze} disabled={running}>
        {running ? "Analyzing…" : "Analyze"}
      </Button>
    </Box>
  );
}
