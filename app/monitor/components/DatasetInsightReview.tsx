"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Separator,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowClockwiseIcon,
  TableIcon,
} from "@phosphor-icons/react";

import { DATASETS } from "../constants/datasets";
import { detectChartsForDataset } from "../utils/autoDetectChart";
import { generateMultiAreaCharts } from "../utils/multiAreaCharts";
import { extractRows } from "../utils/extractRows";
import type {
  ChartSelection,
  DatasetStreamState,
  DetectedChartConfig,
} from "../types/stream";
import ChartCard from "./ChartCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatasetInsightReviewProps {
  state: DatasetStreamState;
  datasetId: number;
  selectedCharts: ChartSelection[];
  onToggleChart: (chart: ChartSelection) => void;
  onNext: () => void;
  onBack: () => void;
  onRetry: () => void;
  currentIndex: number;
  totalDatasets: number;
  canGoBack: boolean;
}

interface ChartEntry {
  config: DetectedChartConfig;
  rows: Record<string, unknown>[];
  isPrimary: boolean;
  badge?: string;
  badgeColor?: string;
}

// ---------------------------------------------------------------------------
// Inline raw-data table (compact preview, max 10 rows)
// ---------------------------------------------------------------------------

function RawDataPreview({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]);
  const preview = rows.slice(0, 10);

  return (
    <Box overflowX="auto" maxH="260px" overflowY="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            {columns.map((col) => (
              <Table.ColumnHeader key={col} fontSize="xs">
                {col}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {preview.map((row, ri) => (
            <Table.Row key={ri}>
              {columns.map((col) => (
                <Table.Cell key={col} fontFamily="mono" fontSize="xs">
                  {row[col] == null
                    ? "—"
                    : typeof row[col] === "number"
                      ? (row[col] as number).toLocaleString()
                      : String(row[col])}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {rows.length > 10 && (
        <Text fontSize="xs" color="fg.muted" mt={1} px={2}>
          Showing 10 of {rows.length} rows
        </Text>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DatasetInsightReview({
  state,
  datasetId,
  selectedCharts,
  onToggleChart,
  onNext,
  onBack,
  onRetry,
  currentIndex,
  totalDatasets,
  canGoBack,
}: DatasetInsightReviewProps) {
  const datasetName = DATASETS[datasetId] ?? `Dataset ${datasetId}`;
  const isComplete = state.status === "complete" || state.status === "insights";
  const isError = state.status === "error";
  const isLoading = !isComplete && !isError;

  // ------------------------------------------------------------------
  // Multi-area detection — inspects actual row data
  // ------------------------------------------------------------------
  const multiAreaResult = useMemo(() => {
    if (state.analyticsData.length === 0) return null;
    return generateMultiAreaCharts(state.analyticsData, datasetId);
  }, [state.analyticsData, datasetId]);

  const isMultiArea = (multiAreaResult?.areaCount ?? 0) > 1;

  // ------------------------------------------------------------------
  // Per-item baseline charts (single-area fallback)
  // ------------------------------------------------------------------
  const perItemCharts: ChartEntry[] = useMemo(() => {
    if (state.analyticsData.length === 0) return [];
    const configs = detectChartsForDataset(
      state.analyticsData,
      datasetId,
      datasetName,
    );
    const entries: ChartEntry[] = [];
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      if (!config) continue;
      const rows = extractRows(state.analyticsData[i]?.data);
      if (rows.length === 0) continue;
      entries.push({
        config,
        rows: config.pivotedData ?? rows,
        isPrimary: true,
      });
    }
    return entries;
  }, [state.analyticsData, datasetId, datasetName]);

  // ------------------------------------------------------------------
  // Multi-area chart entries (per-area, comparison, total)
  // ------------------------------------------------------------------
  const multiAreaEntries: ChartEntry[] = useMemo(() => {
    if (!multiAreaResult || !isMultiArea) return [];
    const entries: ChartEntry[] = [];

    // Per-area individual charts first
    for (const cfg of multiAreaResult.perArea) {
      entries.push({
        config: cfg,
        rows: cfg.pivotedData ?? [],
        isPrimary: true,
        badge: "Single Area",
        badgeColor: "blue",
      });
    }

    // Comparison
    if (multiAreaResult.comparison) {
      entries.push({
        config: multiAreaResult.comparison,
        rows: multiAreaResult.comparison.pivotedData ?? [],
        isPrimary: true,
        badge: "Comparison",
        badgeColor: "purple",
      });
    }

    // Total
    if (multiAreaResult.total) {
      entries.push({
        config: multiAreaResult.total,
        rows: multiAreaResult.total.pivotedData ?? [],
        isPrimary: true,
        badge: "Combined Total",
        badgeColor: "teal",
      });
    }

    return entries;
  }, [multiAreaResult, isMultiArea]);

  // ------------------------------------------------------------------
  // Final chart list (multi-area charts if available, else per-item)
  // ------------------------------------------------------------------
  const allCharts: ChartEntry[] = useMemo(() => {
    if (isMultiArea && multiAreaEntries.length > 0) {
      return multiAreaEntries;
    }
    return perItemCharts;
  }, [isMultiArea, multiAreaEntries, perItemCharts]);

  // ------------------------------------------------------------------
  // Raw data rows for the table preview (always available)
  // ------------------------------------------------------------------
  const rawRows = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    for (const item of state.analyticsData) {
      rows.push(...extractRows(item.data));
    }
    return rows;
  }, [state.analyticsData]);

  // ------------------------------------------------------------------
  // Selection
  // ------------------------------------------------------------------
  const isChartSelected = (label: string) =>
    selectedCharts.some((c) => c.chartLabel === label);

  const handleToggle = (entry: ChartEntry) => {
    onToggleChart({
      datasetId,
      chartLabel: entry.config.label,
      config: entry.config,
      rows: entry.rows,
      isPrimary: entry.isPrimary,
    });
  };

  const areaCount = multiAreaResult?.areaCount ?? 0;

  // ------------------------------------------------------------------
  // Split per-area entries from other entries (comparison, total)
  // ------------------------------------------------------------------
  const perAreaEntries = useMemo(
    () => allCharts.filter((e) => e.badge === "Single Area"),
    [allCharts],
  );
  const otherEntries = useMemo(
    () => allCharts.filter((e) => e.badge !== "Single Area"),
    [allCharts],
  );

  const [perAreaIndex, setPerAreaIndex] = useState(0);

  // Extract area names from labels like "Tree cover loss — Amapá"
  const perAreaNames = useMemo(
    () =>
      perAreaEntries.map((e) => {
        const parts = e.config.label.split(" — ");
        return parts.length > 1 ? parts.slice(1).join(" — ") : e.config.label;
      }),
    [perAreaEntries],
  );

  // Clamp index if entries change
  const safePerAreaIndex = Math.min(
    perAreaIndex,
    Math.max(0, perAreaEntries.length - 1),
  );

  const allPerAreaSelected =
    perAreaEntries.length > 0 &&
    perAreaEntries.every((e) => isChartSelected(e.config.label));

  const handleToggleAllPerArea = () => {
    for (const entry of perAreaEntries) {
      // If all selected → deselect all; if any unselected → select those
      const selected = isChartSelected(entry.config.label);
      if (allPerAreaSelected ? selected : !selected) {
        handleToggle(entry);
      }
    }
  };

  return (
    <VStack gap={6} align="stretch">
      {/* Progress header */}
      <Box>
        <HStack gap={2} mb={2}>
          <Badge size="sm" variant="outline" colorPalette="primary">
            {currentIndex + 1} of {totalDatasets}
          </Badge>
          {isLoading && <Spinner size="xs" />}
          {isComplete && (
            <CheckCircleIcon
              size={16}
              color="var(--chakra-colors-fg-success)"
              weight="fill"
            />
          )}
          {isError && (
            <XCircleIcon
              size={16}
              color="var(--chakra-colors-fg-error)"
              weight="fill"
            />
          )}
        </HStack>
        <Heading size="lg" mb={1}>
          {isLoading ? `Analyzing ${datasetName}…` : datasetName}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {isLoading
            ? `Fetching and processing data for ${datasetName}. This may take a moment.`
            : isError
              ? "An error occurred while fetching this dataset."
              : isMultiArea
                ? `${areaCount} areas detected — per-area, comparison, and total charts available. Click to select for your dashboard.`
                : `${allCharts.length} chart${allCharts.length !== 1 ? " options" : ""} available. Click to select or deselect for your dashboard.`}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box w="full" h="4px" bg="bg.subtle" rounded="full" overflow="hidden">
        <Box
          h="full"
          bg="primary.solid"
          rounded="full"
          transition="width 0.3s"
          w={`${((currentIndex + (isComplete || isError ? 1 : 0.5)) / totalDatasets) * 100}%`}
        />
      </Box>

      {/* Loading */}
      {isLoading && (
        <Flex
          justify="center"
          align="center"
          py={12}
          direction="column"
          gap={3}
        >
          <Spinner size="lg" colorPalette="primary" />
          <Text fontSize="sm" color="fg.muted">
            {state.statusMessage}
          </Text>
        </Flex>
      )}

      {/* Error */}
      {isError && (
        <VStack gap={3} align="stretch">
          <Box
            px={4}
            py={3}
            bg="bg.error"
            border="1px solid"
            borderColor="border.error"
            rounded="md"
          >
            <Text fontSize="sm" color="fg.error">
              {state.error}
            </Text>
          </Box>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              colorPalette="red"
              onClick={onRetry}
            >
              <ArrowClockwiseIcon /> Retry
            </Button>
            <Button size="sm" variant="outline" onClick={onNext}>
              Skip <ArrowRightIcon />
            </Button>
          </HStack>
        </VStack>
      )}

      {/* Charts — selectable */}
      {allCharts.length > 0 && (
        <VStack gap={4} align="stretch">
          <Heading size="sm" fontWeight="medium">
            Charts
          </Heading>

          {/* Grouped per-area card */}
          {perAreaEntries.length > 0 &&
            (() => {
              const activeEntry = perAreaEntries[safePerAreaIndex];
              if (!activeEntry) return null;
              return (
                <Box
                  cursor="pointer"
                  onClick={handleToggleAllPerArea}
                  rounded="md"
                  border="2px solid"
                  borderColor={
                    allPerAreaSelected ? "primary.solid" : "border.muted"
                  }
                  overflow="hidden"
                  transition="all 0.15s"
                  _hover={{
                    borderColor: allPerAreaSelected
                      ? "primary.solid"
                      : "primary.300",
                  }}
                >
                  <Flex
                    px={4}
                    py={2}
                    bg={allPerAreaSelected ? "primary.subtle" : "bg.subtle"}
                    borderBottom="1px solid"
                    borderColor={
                      allPerAreaSelected ? "primary.muted" : "border.muted"
                    }
                    align="center"
                    justify="space-between"
                    transition="background 0.15s"
                  >
                    <HStack gap={2}>
                      <Box
                        w={4}
                        h={4}
                        rounded="sm"
                        border="2px solid"
                        borderColor={
                          allPerAreaSelected ? "primary.solid" : "border"
                        }
                        bg={
                          allPerAreaSelected ? "primary.solid" : "transparent"
                        }
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        transition="all 0.15s"
                      >
                        {allPerAreaSelected && (
                          <Text
                            color="white"
                            fontSize="xs"
                            fontWeight="bold"
                            lineHeight="1"
                          >
                            ✓
                          </Text>
                        )}
                      </Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {datasetName} — Per Area
                      </Text>
                      <Badge size="xs" colorPalette="blue" variant="subtle">
                        {perAreaEntries.length} areas
                      </Badge>
                    </HStack>
                    <HStack gap={2}>
                      {/* Area dropdown */}
                      <select
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid var(--chakra-colors-border-muted)",
                          background: "var(--chakra-colors-bg-panel, #fff)",
                          cursor: "pointer",
                        }}
                        value={safePerAreaIndex}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setPerAreaIndex(Number(e.target.value))
                        }
                      >
                        {perAreaNames.map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <Badge size="xs" variant="outline">
                        {activeEntry.config.type}
                      </Badge>
                    </HStack>
                  </Flex>
                  <Box
                    opacity={allPerAreaSelected ? 1 : 0.4}
                    filter={allPerAreaSelected ? "none" : "grayscale(70%)"}
                    transition="all 0.2s"
                    px={4}
                    py={3}
                  >
                    <ChartCard
                      config={activeEntry.config}
                      rawData={activeEntry.rows}
                      bare
                    />
                  </Box>
                </Box>
              );
            })()}

          {/* Other charts (comparison, total) — rendered individually */}
          {otherEntries.map((entry) => {
            const selected = isChartSelected(entry.config.label);
            return (
              <Box
                key={entry.config.label}
                cursor="pointer"
                onClick={() => handleToggle(entry)}
                rounded="md"
                border="2px solid"
                borderColor={selected ? "primary.solid" : "border.muted"}
                overflow="hidden"
                transition="all 0.15s"
                _hover={{
                  borderColor: selected ? "primary.solid" : "primary.300",
                }}
              >
                <Flex
                  px={4}
                  py={2}
                  bg={selected ? "primary.subtle" : "bg.subtle"}
                  borderBottom="1px solid"
                  borderColor={selected ? "primary.muted" : "border.muted"}
                  align="center"
                  justify="space-between"
                  transition="background 0.15s"
                >
                  <HStack gap={2}>
                    <Box
                      w={4}
                      h={4}
                      rounded="sm"
                      border="2px solid"
                      borderColor={selected ? "primary.solid" : "border"}
                      bg={selected ? "primary.solid" : "transparent"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.15s"
                    >
                      {selected && (
                        <Text
                          color="white"
                          fontSize="xs"
                          fontWeight="bold"
                          lineHeight="1"
                        >
                          ✓
                        </Text>
                      )}
                    </Box>
                    <Text fontSize="sm" fontWeight="medium">
                      {entry.config.label}
                    </Text>
                    {entry.badge && (
                      <Badge
                        size="xs"
                        colorPalette={entry.badgeColor ?? "gray"}
                        variant="subtle"
                      >
                        {entry.badge}
                      </Badge>
                    )}
                  </HStack>
                  <Badge size="xs" variant="outline">
                    {entry.config.type}
                  </Badge>
                </Flex>
                <Box
                  opacity={selected ? 1 : 0.4}
                  filter={selected ? "none" : "grayscale(70%)"}
                  transition="all 0.2s"
                  px={4}
                  py={3}
                >
                  <ChartCard config={entry.config} rawData={entry.rows} bare />
                </Box>
              </Box>
            );
          })}
        </VStack>
      )}

      {/* No charts fallback */}
      {!isLoading &&
        !isError &&
        allCharts.length === 0 &&
        state.analyticsData.length > 0 && (
          <Box
            px={4}
            py={6}
            textAlign="center"
            rounded="md"
            border="1px dashed"
            borderColor="border.muted"
          >
            <Text color="fg.muted" fontSize="sm">
              No charts could be generated for this dataset. The raw data is
              shown below and will be included in your dashboard table.
            </Text>
          </Box>
        )}

      {/* Raw data table — always shown as reference */}
      {rawRows.length > 0 && (
        <Box>
          <HStack gap={2} mb={2}>
            <TableIcon size={16} />
            <Heading size="sm" fontWeight="medium">
              Raw Data
            </Heading>
            <Badge size="xs" variant="outline">
              {rawRows.length} rows
            </Badge>
            {areaCount > 1 && (
              <Badge size="xs" variant="outline">
                {areaCount} areas
              </Badge>
            )}
          </HStack>
          <Box
            rounded="md"
            border="1px solid"
            borderColor="border.muted"
            overflow="hidden"
          >
            <RawDataPreview rows={rawRows} />
          </Box>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Full raw data will be available in the final dashboard&apos;s data
            table with CSV export.
          </Text>
        </Box>
      )}

      {/* Navigation */}
      {(isComplete || isError) && (
        <>
          <Separator />
          <Flex justify="space-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              disabled={!canGoBack}
            >
              <ArrowLeftIcon />
              {currentIndex === 0 ? "Back to Setup" : "Previous Dataset"}
            </Button>
            <Button colorPalette="primary" size="sm" onClick={onNext}>
              {currentIndex < totalDatasets - 1 ? (
                <>
                  Next Dataset <ArrowRightIcon />
                </>
              ) : (
                <>
                  Finish Review <ArrowRightIcon />
                </>
              )}
            </Button>
          </Flex>
        </>
      )}
    </VStack>
  );
}
