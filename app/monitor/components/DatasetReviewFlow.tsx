"use client";

import { useCallback, useMemo, useState } from "react";
import { Box } from "@chakra-ui/react";

import type { ChartSelection, DatasetStreamState } from "../types/stream";
import DatasetInsightReview from "./DatasetInsightReview";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DatasetReviewFlowProps {
  /** Ordered list of dataset IDs to review. */
  datasetIds: number[];
  /** Stream states keyed by dataset ID. */
  streams: Map<number, DatasetStreamState>;
  /** Retry a single dataset. */
  onRetry: (datasetId: number) => void;
  /** Called when ALL datasets have been reviewed. */
  onComplete: (selectedCharts: ChartSelection[]) => void;
  /** Go back to setup phase. */
  onBackToSetup: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DatasetReviewFlow({
  datasetIds,
  streams,
  onRetry,
  onComplete,
  onBackToSetup,
}: DatasetReviewFlowProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allSelectedCharts, setAllSelectedCharts] = useState<ChartSelection[]>([]);

  const currentDatasetId = datasetIds[currentIdx];
  const currentState = streams.get(currentDatasetId);

  // Charts selected for the current dataset
  const currentDatasetCharts = useMemo(
    () => allSelectedCharts.filter((c) => c.datasetId === currentDatasetId),
    [allSelectedCharts, currentDatasetId],
  );

  const handleToggleChart = useCallback(
    (chart: ChartSelection) => {
      setAllSelectedCharts((prev) => {
        const exists = prev.some(
          (c) => c.datasetId === chart.datasetId && c.chartLabel === chart.chartLabel,
        );
        if (exists) {
          return prev.filter(
            (c) => !(c.datasetId === chart.datasetId && c.chartLabel === chart.chartLabel),
          );
        }
        return [...prev, chart];
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentIdx < datasetIds.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // All datasets reviewed — pass selections up
      onComplete(allSelectedCharts);
    }
  }, [currentIdx, datasetIds.length, onComplete, allSelectedCharts]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    } else {
      // First dataset — go back to setup
      onBackToSetup();
    }
  }, [currentIdx, onBackToSetup]);

  if (!currentState) return null;

  return (
    <Box>
      <DatasetInsightReview
        key={currentDatasetId} // Force remount on dataset change
        state={currentState}
        datasetId={currentDatasetId}
        selectedCharts={currentDatasetCharts}
        onToggleChart={handleToggleChart}
        onNext={handleNext}
        onBack={handleBack}
        onRetry={() => onRetry(currentDatasetId)}
        currentIndex={currentIdx}
        totalDatasets={datasetIds.length}
        canGoBack={true}
      />
    </Box>
  );
}
