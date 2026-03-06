"use client";

import { useCallback, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Separator,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  GlobeIcon,
  NoteIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";

import type { ChartSelection, DatasetStreamState } from "../types/stream";
import type { Report } from "@/app/types/report";
import { DATASETS } from "../constants/datasets";
import { selectionToWidget } from "../utils/convertToBlocks";
import mockGenerateText from "@/app/utils/mockGenerateText";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryPromptProps {
  streams: Map<number, DatasetStreamState>;
  selectedCharts: ChartSelection[];
  onComplete: (insights: string[], prompt: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Status = "idle" | "loading" | "done" | "error";

export default function SummaryPrompt({
  streams,
  selectedCharts,
  onComplete,
  onSkip,
  onBack,
}: SummaryPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [insights, setInsights] = useState<string[]>([]);
  const [error] = useState<string | null>(null);

  const chartCount = selectedCharts.length;
  const datasetIds = [...new Set(selectedCharts.map((c) => c.datasetId))];
  const datasetNames = datasetIds.map((id) => DATASETS[id] ?? `Dataset ${id}`);

  const areaNames = new Set<string>();
  for (const state of streams.values()) {
    for (const item of state.analyticsData) {
      for (const n of item.aoi_names) areaNames.add(n);
    }
  }

  const fetchSummary = useCallback(
    async (promptText: string) => {
      setStatus("loading");

      // Build a synthetic Report with selected charts as insight blocks so
      // the generate-text endpoint receives full chart data + metadata.
      const allAreaNames = [...areaNames];
      const syntheticReport: Report = {
        id: "summary-preview",
        title: `Dashboard: ${datasetNames.join(", ")}`,
        blocks: selectedCharts.map((sel, i) => ({
          id: `chart-${i}`,
          kind: "insight" as const,
          widget: selectionToWidget(sel, allAreaNames),
          size: "half" as const,
          order: i,
          createdAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const text = await mockGenerateText(syntheticReport, promptText, null);
        setInsights(text.split("\n\n").filter(Boolean));
        setStatus("done");
      } catch (err) {
        console.error("[SummaryPrompt] Generation failed:", err);
        setInsights([
          `Summary generation failed: ${(err as Error).message}. You can skip this step and use per-widget chat on the dashboard instead.`,
        ]);
        setStatus("done");
      }
    },
    [selectedCharts, areaNames, datasetNames],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    fetchSummary(prompt.trim());
  };

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg" mb={1}>
          What do you want your dashboard to say?
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Tell us what story or insights you want your dashboard to communicate.
          We&apos;ll generate a cross-dataset summary to tie everything
          together.
        </Text>
      </Box>

      {/* Your selections summary */}
      <Box
        rounded="md"
        border="1px solid"
        borderColor="border"
        overflow="hidden"
      >
        <Flex
          px={4}
          py={2.5}
          bg="bg.subtle"
          borderBottom="1px solid"
          borderColor="border"
          align="center"
          gap={2}
        >
          <Text fontSize="sm" fontWeight="medium">
            Your Dashboard So Far
          </Text>
        </Flex>
        <Box px={4} py={3}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
            <VStack gap={1} align="flex-start">
              <HStack gap={1.5} color="fg.muted">
                <ChartBarIcon size={14} />
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Charts
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">
                {chartCount} selected
              </Text>
              <Flex gap={1} flexWrap="wrap">
                {selectedCharts.slice(0, 4).map((c) => (
                  <Badge
                    key={c.chartLabel}
                    size="xs"
                    variant="outline"
                    lineClamp={1}
                  >
                    {c.config.type}
                  </Badge>
                ))}
                {chartCount > 4 && (
                  <Badge size="xs" variant="outline">
                    +{chartCount - 4} more
                  </Badge>
                )}
              </Flex>
            </VStack>
            <VStack gap={1} align="flex-start">
              <HStack gap={1.5} color="fg.muted">
                <NoteIcon size={14} />
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Datasets
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">
                {datasetIds.length} dataset{datasetIds.length !== 1 ? "s" : ""}
              </Text>
              <Text fontSize="xs" color="fg.muted" lineClamp={2}>
                {datasetNames.join(", ")}
              </Text>
            </VStack>
            <VStack gap={1} align="flex-start">
              <HStack gap={1.5} color="fg.muted">
                <GlobeIcon size={14} />
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Areas
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="semibold">
                {areaNames.size} area{areaNames.size !== 1 ? "s" : ""}
              </Text>
              <Text fontSize="xs" color="fg.muted" lineClamp={2}>
                {[...areaNames].join(", ")}
              </Text>
            </VStack>
          </Grid>
        </Box>
      </Box>

      {/* Prompt form */}
      {status !== "done" && (
        <Box as="form" onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Dashboard narrative prompt</Field.Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`e.g., "Compare deforestation rates between ${[...areaNames].slice(0, 2).join(" and ") || "the selected areas"} and highlight which datasets show the most change since 2015"`}
                rows={3}
                disabled={status === "loading"}
              />
              <Field.HelperText>
                This generates an AI summary that connects findings across all
                your datasets and areas.
              </Field.HelperText>
            </Field.Root>

            <Flex gap={3} flexWrap="wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
                disabled={status === "loading"}
              >
                <ArrowLeftIcon /> Back to Review
              </Button>
              <Box flex={1} />
              <Button
                type="submit"
                colorPalette="primary"
                size="sm"
                disabled={!prompt.trim() || status === "loading"}
                loading={status === "loading"}
                loadingText="Generating…"
              >
                <PaperPlaneTiltIcon /> Generate Summary
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSkip}
                disabled={status === "loading"}
              >
                Skip <ArrowRightIcon />
              </Button>
            </Flex>
          </VStack>
        </Box>
      )}

      {status === "loading" && (
        <Flex justify="center" py={8} direction="column" align="center" gap={3}>
          <Spinner size="lg" colorPalette="primary" />
          <Text fontSize="sm" color="fg.muted">
            Generating cross-dataset summary…
          </Text>
        </Flex>
      )}

      {status === "error" && error && (
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
              {error}
            </Text>
          </Box>
          <Flex gap={2}>
            <Button
              size="xs"
              variant="outline"
              onClick={() => fetchSummary(prompt.trim())}
            >
              <ArrowClockwiseIcon /> Retry
            </Button>
          </Flex>
        </VStack>
      )}

      {status === "done" && (
        <VStack gap={4} align="stretch">
          {insights.length > 0 ? (
            <Box
              px={4}
              py={4}
              rounded="md"
              border="1px solid"
              borderColor="border"
              bg="bg.subtle"
            >
              <HStack gap={2} mb={3}>
                <NoteIcon size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  Generated Summary
                </Text>
              </HStack>
              <VStack gap={2} align="stretch">
                {insights.map((insight, i) => (
                  <Text key={i} fontSize="sm" whiteSpace="pre-wrap">
                    {insight}
                  </Text>
                ))}
              </VStack>
            </Box>
          ) : (
            <Box
              px={4}
              py={4}
              rounded="md"
              border="1px dashed"
              borderColor="border.muted"
            >
              <Text fontSize="sm" color="fg.muted">
                Summary generated but no insights were returned. You can still
                continue to your dashboard.
              </Text>
            </Box>
          )}

          <Separator />

          <Flex justify="space-between">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeftIcon /> Back to Review
            </Button>
            <Button
              colorPalette="primary"
              size="sm"
              onClick={() => onComplete(insights, prompt)}
            >
              View Dashboard <ArrowRightIcon />
            </Button>
          </Flex>
        </VStack>
      )}
    </VStack>
  );
}
