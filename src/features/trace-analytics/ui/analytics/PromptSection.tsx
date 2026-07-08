"use client";

import { useMemo } from "react";
import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import {
  computePromptLengths,
  countCategories,
} from "../../lib/analytics/aggregations";
import { binValues, mean, median, quantile } from "../../lib/analytics/stats";
import { formatCount, languageName } from "../../lib/format";
import { ChartCard } from "../charts/ChartCard";
import { HistogramChart } from "../charts/HistogramChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { InfoCallout } from "../primitives/InfoCallout";
import { StatCards } from "../primitives/StatCards";

interface PromptSectionProps {
  readonly rows: readonly TraceRow[];
}

function lengthStats(values: readonly number[]) {
  return [
    { label: "N", value: formatCount(values.length) },
    { label: "Mean", value: mean(values).toFixed(0) },
    { label: "Median", value: median(values).toFixed(0) },
    { label: "P90", value: quantile(values, 0.9).toFixed(0) },
    { label: "P95", value: quantile(values, 0.95).toFixed(0) },
    {
      label: "Max",
      value: values.length ? Math.max(...values).toFixed(0) : "0",
    },
  ];
}

export function PromptSection({ rows }: PromptSectionProps) {
  const lengths = useMemo(() => computePromptLengths(rows), [rows]);
  const charBins = useMemo(() => binValues(lengths.chars, 60), [lengths]);
  const wordBins = useMemo(() => binValues(lengths.words, 60), [lengths]);
  const languageCounts = useMemo(
    () =>
      countCategories(
        rows.map((r) => r.language),
        { topN: 12 }
      ).map((entry) => ({
        label: languageName(entry.label),
        count: entry.count,
      })),
    [rows]
  );

  return (
    <Box>
      <Heading as="h3" size="md" mb={3}>
        Prompt Analysis
      </Heading>
      <Flex direction="column" gap={3}>
        <InfoCallout title="Prompt analysis explained">
          Prompt-level metrics help understand what users are asking and how.
          Length distributions reveal typical query complexity and outliers that
          may inflate cost or latency.
        </InfoCallout>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Prompt length (characters)"
            help="Helps spot unusually long prompts that may increase cost/latency."
          >
            {lengths.chars.length ? (
              <Flex direction="column" gap={3}>
                <StatCards items={lengthStats(lengths.chars)} columns={6} />
                <HistogramChart
                  bins={charBins}
                  height={180}
                  countLabel="Prompts"
                />
              </Flex>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No non-empty prompts available to chart.
              </Text>
            )}
          </ChartCard>
          <ChartCard
            title="Prompt length (words)"
            help="Useful for understanding typical query complexity."
          >
            {lengths.words.length ? (
              <Flex direction="column" gap={3}>
                <StatCards items={lengthStats(lengths.words)} columns={6} />
                <HistogramChart
                  bins={wordBins}
                  height={180}
                  countLabel="Prompts"
                />
              </Flex>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No non-empty prompts available to chart.
              </Text>
            )}
          </ChartCard>
        </SimpleGrid>
        {languageCounts.length ? (
          <ChartCard
            title="Prompt language"
            help="Detected language of user prompts (server-side langid, local fallback)."
            info="Language detection is heuristic and skips very short prompts, so
              counts undershoot the trace total. A meaningful non-English share
              matters twice over: the UI is English-only, and the soft-error
              detection heuristics only match English phrases — non-English
              failures are systematically undercounted in the outcome data."
          >
            <HorizontalBarChart
              data={languageCounts.map((l) => ({
                label: l.label,
                count: l.count,
              }))}
            />
          </ChartCard>
        ) : null}
      </Flex>
    </Box>
  );
}
