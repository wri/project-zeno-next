"use client";
import { Box, Button, Text } from "@chakra-ui/react";
import { ChartLineIcon, CheckIcon } from "@phosphor-icons/react";
import { useAnalysis } from "@/src/features/analysis";

/**
 * Chat nudge: run the default analysis for the selected area — the same
 * behaviour as the "View analysis" item in the AOI "…" menu. Completed charts
 * land in insightStore and surface in the map's InsightWorkspace.
 */
export default function ViewAnalysisNudge({
  area,
}: {
  area: { name: string; source: string; srcId?: string; subtype?: string };
}) {
  const { status, error, run } = useAnalysis();
  const running = status === "running";
  const done = status === "done";

  const handleViewAnalysis = () => {
    if (running) return;
    run({
      area,
      dataset: { id: 4 }, // Tree cover loss — the default analysis
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  };

  return (
    <Box>
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
        borderColor={done ? "primary.500" : "border.emphasized"}
        _hover={
          running
            ? undefined
            : { bg: "primary.50", borderColor: "primary.emphasized" }
        }
        onClick={handleViewAnalysis}
        disabled={running}
      >
        {done ? (
          <CheckIcon weight="bold" color="var(--chakra-colors-primary-solid)" />
        ) : (
          <ChartLineIcon
            weight="thin"
            color="var(--chakra-colors-primary-solid)"
          />
        )}
        {running
          ? `Analyzing ${area.name}…`
          : done
            ? `Analysis added for ${area.name}`
            : `View analysis for ${area.name}`}
      </Button>
      {status === "error" && error && (
        <Text color="red.500" fontSize="2xs" mt={1} px={1}>
          {error.message}
        </Text>
      )}
    </Box>
  );
}
