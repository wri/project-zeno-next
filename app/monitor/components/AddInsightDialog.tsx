"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChartBarIcon, CheckIcon, PlusIcon } from "@phosphor-icons/react";

import type { Dashboard } from "@/app/types/dashboard";
import type { ChartSelection, DetectedChartConfig } from "../types/stream";
import { DATASETS } from "../constants/datasets";
import { getDateRangeForDataset } from "../utils/dateRange";
import { useMultiDatasetStream } from "../hooks/useMultiDatasetStream";
import { extractRows } from "../utils/extractRows";
import { autoDetectChart } from "../utils/autoDetectChart";
import { generateMultiAreaCharts } from "../utils/multiAreaCharts";
import { convertSelectionsToBlocks } from "../utils/convertToBlocks";
import { GADM_CODE_TO_NAME } from "../constants/gadmCountries";
import useDashboardStore from "@/app/store/dashboardStore";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddInsightDialogProps {
  dashboard: Dashboard;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = "select" | "streaming" | "pick";

export default function AddInsightDialog({
  dashboard,
  isOpen,
  onOpenChange,
}: AddInsightDialogProps) {
  const { addBlock } = useDashboardStore();
  const { streams, aggregateStatus, aggregateMessage, run } =
    useMultiDatasetStream();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set());

  const datasetIds = dashboard.setupMetadata.datasetIds;
  const areaIds = dashboard.setupMetadata.areaIds;

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhase("select");
      setSelectedDataset(null);
      setSelectedCharts(new Set());
    }
  }, [isOpen]);

  // Transition from streaming to pick when complete
  useEffect(() => {
    if (
      phase === "streaming" &&
      (aggregateStatus === "complete" || aggregateStatus === "partial")
    ) {
      setPhase("pick");
    }
  }, [phase, aggregateStatus]);

  // ── Detect charts from streamed data ────────────────────────────
  const detectedCharts = useMemo((): {
    config: DetectedChartConfig;
    rows: Record<string, unknown>[];
  }[] => {
    if (phase !== "pick") return [];

    const results: {
      config: DetectedChartConfig;
      rows: Record<string, unknown>[];
    }[] = [];

    for (const [, state] of streams.entries()) {
      if (state.status !== "complete" || state.analyticsData.length === 0)
        continue;

      for (const item of state.analyticsData) {
        const rows = extractRows(item.data);
        if (rows.length === 0) continue;

        // Single-area chart
        const config = autoDetectChart(rows, state.datasetId);
        if (config) {
          results.push({ config, rows });
        }

        // Multi-area charts
        const multiSet = generateMultiAreaCharts(
          state.analyticsData,
          state.datasetId,
        );
        for (const config of multiSet.perArea) {
          results.push({ config, rows: config.pivotedData ?? rows });
        }
        if (multiSet.comparison) {
          results.push({
            config: multiSet.comparison,
            rows: multiSet.comparison.pivotedData ?? rows,
          });
        }
        if (multiSet.total) {
          results.push({
            config: multiSet.total,
            rows: multiSet.total.pivotedData ?? rows,
          });
        }
      }
    }

    return results;
  }, [phase, streams]);

  // ── Actions ─────────────────────────────────────────────────────
  const handleFetch = () => {
    if (selectedDataset === null) return;

    const { startDate, endDate } = getDateRangeForDataset(selectedDataset);

    run({
      datasetIds: [selectedDataset],
      areaIds,
      startDate,
      endDate,
      prompt: "",
    });

    setPhase("streaming");
  };

  const toggleChart = (label: string) => {
    setSelectedCharts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleAddSelected = () => {
    const selections: ChartSelection[] = detectedCharts
      .filter((c) => selectedCharts.has(c.config.label))
      .map((c) => ({
        datasetId: selectedDataset ?? 0,
        chartLabel: c.config.label,
        config: c.config,
        rows: c.rows,
        isPrimary: true,
      }));

    const resolvedAreaNames = dashboard.setupMetadata.areaIds.map(
      (id) => GADM_CODE_TO_NAME[id.replace(/^gadm:/, "")] ?? id,
    );
    const dateRange = {
      start: dashboard.setupMetadata.startDate,
      end: dashboard.setupMetadata.endDate,
    };
    const blocks = convertSelectionsToBlocks(
      selections,
      undefined,
      resolvedAreaNames,
      dateRange,
    );
    for (const block of blocks) {
      addBlock(dashboard.id, block);
    }

    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="80vh" overflow="auto">
            <Dialog.Header>
              <Dialog.Title>
                <Flex align="center" gap={2}>
                  <ChartBarIcon size={20} />
                  Add Insight
                </Flex>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {/* Phase: Select dataset */}
              {phase === "select" && (
                <VStack gap={3} align="stretch">
                  <Text fontSize="sm" color="fg.muted">
                    Select a dataset to analyze. Data will be fetched for your
                    dashboard&apos;s areas.
                  </Text>

                  <VStack gap={1} align="stretch">
                    {datasetIds.map((id) => {
                      const isSelected = selectedDataset === id;
                      return (
                        <Flex
                          key={id}
                          as="label"
                          px={3}
                          py={2}
                          cursor="pointer"
                          rounded="md"
                          border="1px solid"
                          borderColor={
                            isSelected ? "primary.solid" : "border.muted"
                          }
                          bg={isSelected ? "primary.subtle" : "transparent"}
                          _hover={{
                            bg: isSelected ? "primary.subtle" : "bg.muted",
                          }}
                          transition="all 0.15s"
                          gap={2}
                          align="center"
                        >
                          <input
                            type="radio"
                            name="dataset"
                            checked={isSelected}
                            onChange={() => setSelectedDataset(id)}
                            style={{
                              accentColor: "var(--chakra-colors-primary-500)",
                            }}
                          />
                          <Text fontSize="sm">
                            {DATASETS[id] ?? `Dataset ${id}`}
                          </Text>
                        </Flex>
                      );
                    })}
                  </VStack>
                </VStack>
              )}

              {/* Phase: Streaming */}
              {phase === "streaming" && (
                <Flex
                  justify="center"
                  py={8}
                  direction="column"
                  align="center"
                  gap={3}
                >
                  <Spinner size="lg" colorPalette="primary" />
                  <Text fontSize="sm" color="fg.muted">
                    {aggregateMessage || "Fetching data..."}
                  </Text>
                </Flex>
              )}

              {/* Phase: Pick charts */}
              {phase === "pick" && (
                <VStack gap={3} align="stretch">
                  <Text fontSize="sm" color="fg.muted">
                    {detectedCharts.length > 0
                      ? `${detectedCharts.length} chart${detectedCharts.length !== 1 ? "s" : ""} detected. Select which to add.`
                      : "No charts could be detected from the data."}
                  </Text>

                  {detectedCharts.map((c) => {
                    const isSelected = selectedCharts.has(c.config.label);
                    return (
                      <Box
                        key={c.config.label}
                        rounded="md"
                        border="2px solid"
                        borderColor={
                          isSelected ? "primary.solid" : "border.muted"
                        }
                        overflow="hidden"
                        cursor="pointer"
                        onClick={() => toggleChart(c.config.label)}
                        transition="border-color 0.15s"
                      >
                        <Flex
                          px={3}
                          py={2}
                          bg={isSelected ? "primary.subtle" : "bg.subtle"}
                          align="center"
                          gap={2}
                          borderBottom="1px solid"
                          borderColor="border.muted"
                        >
                          <Box
                            w={4}
                            h={4}
                            rounded="sm"
                            border="2px solid"
                            borderColor={
                              isSelected ? "primary.solid" : "border"
                            }
                            bg={isSelected ? "primary.solid" : "transparent"}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isSelected && (
                              <CheckIcon
                                size={10}
                                color="white"
                                weight="bold"
                              />
                            )}
                          </Box>
                          <Text fontSize="sm" fontWeight="medium">
                            {c.config.label}
                          </Text>
                        </Flex>
                        <Box px={3} py={2} pointerEvents="none">
                          <ChartCard config={c.config} rawData={c.rows} bare />
                        </Box>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>

              {phase === "select" && (
                <Button
                  colorPalette="primary"
                  onClick={handleFetch}
                  disabled={selectedDataset === null}
                >
                  Fetch Data
                </Button>
              )}

              {phase === "pick" && (
                <Button
                  colorPalette="primary"
                  onClick={handleAddSelected}
                  disabled={selectedCharts.size === 0}
                >
                  <PlusIcon size={16} /> Add {selectedCharts.size} Chart
                  {selectedCharts.size !== 1 ? "s" : ""}
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
