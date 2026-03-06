"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { ArrowLeftIcon, ChatCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  ChartSelection,
  MultiDatasetFormValues,
  WizardPhase,
} from "@/app/monitor/types/stream";
import { useMultiDatasetStream } from "@/app/monitor/hooks/useMultiDatasetStream";
import { convertSelectionsToBlocks } from "@/app/monitor/utils/convertToBlocks";
import useDashboardStore from "@/app/store/dashboardStore";
import { DATASETS } from "@/app/monitor/constants/datasets";
import { GADM_CODE_TO_NAME } from "@/app/monitor/constants/gadmCountries";

import SetupWizard from "@/app/monitor/components/SetupWizard";
import StreamStatusBanner from "@/app/monitor/components/StreamStatusBanner";
import DatasetReviewFlow from "@/app/monitor/components/DatasetReviewFlow";
import SummaryPrompt from "@/app/monitor/components/SummaryPrompt";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewDashboardPage() {
  const router = useRouter();
  const { createDashboard } = useDashboardStore();

  const [phase, setPhase] = useState<WizardPhase>("setup");
  const [formValues, setFormValues] = useState<MultiDatasetFormValues | null>(
    null,
  );
  const [selectedCharts, setSelectedCharts] = useState<ChartSelection[]>([]);

  const { streams, aggregateStatus, aggregateMessage, run, cancel, retry } =
    useMultiDatasetStream();

  // Auto-advance from streaming → review when all datasets complete
  const prevAggregateStatus = useRef(aggregateStatus);
  useEffect(() => {
    if (
      phase === "streaming" &&
      prevAggregateStatus.current === "streaming" &&
      (aggregateStatus === "complete" || aggregateStatus === "partial")
    ) {
      setPhase("review");
    }
    prevAggregateStatus.current = aggregateStatus;
  }, [phase, aggregateStatus]);

  // ── Phase handlers ──────────────────────────────────────────────

  const handleSetupSubmit = useCallback(
    (values: MultiDatasetFormValues) => {
      setFormValues(values);
      setPhase("streaming");

      // Run the parallel streams with per-dataset date ranges
      // The SetupWizard already calculates the widest range, but each
      // dataset stream uses its own date range via the form values.
      run(values);
    },
    [run],
  );

  const handleReviewComplete = useCallback((charts: ChartSelection[]) => {
    setSelectedCharts(charts);
    setPhase("summary");
  }, []);

  const handleSummaryComplete = useCallback(
    (insights: string[], prompt: string) => {
      if (!formValues) return;

      const resolvedAreaNames = formValues.areaIds.map(
        (id) => GADM_CODE_TO_NAME[id.replace(/^gadm:/, "")] ?? id,
      );
      const dateRange = {
        start: formValues.startDate,
        end: formValues.endDate,
      };
      const blocks = convertSelectionsToBlocks(
        selectedCharts,
        insights,
        resolvedAreaNames,
        dateRange,
      );

      const datasetNames = formValues.datasetIds
        .map((id) => DATASETS[id] ?? `Dataset ${id}`)
        .slice(0, 3)
        .join(", ");
      const title = `Dashboard: ${datasetNames}`;

      const id = createDashboard(
        title,
        {
          datasetIds: formValues.datasetIds,
          areaIds: formValues.areaIds,
          startDate: formValues.startDate,
          endDate: formValues.endDate,
          prompt,
        },
        blocks,
      );

      router.push(`/app/monitor/${id}`);
    },
    [formValues, selectedCharts, createDashboard, router],
  );

  const handleSummarySkip = useCallback(() => {
    if (!formValues) return;

    const resolvedAreaNames = formValues.areaIds.map(
      (id) => GADM_CODE_TO_NAME[id.replace(/^gadm:/, "")] ?? id,
    );
    const dateRange = {
      start: formValues.startDate,
      end: formValues.endDate,
    };
    const blocks = convertSelectionsToBlocks(
      selectedCharts,
      undefined,
      resolvedAreaNames,
      dateRange,
    );

    const datasetNames = formValues.datasetIds
      .map((id) => DATASETS[id] ?? `Dataset ${id}`)
      .slice(0, 3)
      .join(", ");
    const title = `Dashboard: ${datasetNames}`;

    const id = createDashboard(
      title,
      {
        datasetIds: formValues.datasetIds,
        areaIds: formValues.areaIds,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        prompt: "",
      },
      blocks,
    );

    router.push(`/app/monitor/${id}`);
  }, [formValues, selectedCharts, createDashboard, router]);

  const handleBackToSetup = useCallback(() => {
    cancel();
    setPhase("setup");
  }, [cancel]);

  const handleBackToReview = useCallback(() => {
    setPhase("review");
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <Box maxW="4xl" mx="auto">
      <Flex align="center" gap={2} mb={4}>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/monitor">
            <ArrowLeftIcon /> All Dashboards
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ChatCircleIcon /> Back to Chat
          </Link>
        </Button>
      </Flex>

      <Heading size="xl" mb={6}>
        New Dashboard
      </Heading>

      {/* Phase: Setup Wizard */}
      {phase === "setup" && <SetupWizard onSubmit={handleSetupSubmit} />}

      {/* Phase: Streaming */}
      {phase === "streaming" && (
        <Box>
          <StreamStatusBanner
            streams={streams}
            aggregateStatus={aggregateStatus}
            aggregateMessage={aggregateMessage}
          />
          <Flex mt={4} gap={2}>
            <Button variant="outline" size="sm" onClick={handleBackToSetup}>
              <ArrowLeftIcon /> Back to Setup
            </Button>
          </Flex>
        </Box>
      )}

      {/* Phase: Review */}
      {phase === "review" && formValues && (
        <DatasetReviewFlow
          datasetIds={formValues.datasetIds}
          streams={streams}
          onRetry={retry}
          onComplete={handleReviewComplete}
          onBackToSetup={handleBackToSetup}
        />
      )}

      {/* Phase: Summary */}
      {phase === "summary" && (
        <SummaryPrompt
          streams={streams}
          selectedCharts={selectedCharts}
          onComplete={handleSummaryComplete}
          onSkip={handleSummarySkip}
          onBack={handleBackToReview}
        />
      )}
    </Box>
  );
}
