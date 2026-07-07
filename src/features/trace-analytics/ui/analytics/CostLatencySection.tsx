"use client";

import { useMemo } from "react";
import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import type { DailyMetrics } from "../../lib/analytics/daily";
import type { SummaryStats } from "../../lib/analytics/aggregations";
import {
  binValues,
  finiteNumbers,
  mean,
  median,
  quantile,
} from "../../lib/analytics/stats";
import { formatCompact, formatCount } from "../../lib/format";
import { CATEGORY_COLORS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { HistogramChart } from "../charts/HistogramChart";
import { DailyLinesChart } from "../charts/DailyLinesChart";
import { InfoCallout } from "../primitives/InfoCallout";
import { StatCards } from "../primitives/StatCards";

interface CostLatencySectionProps {
  readonly rows: readonly TraceRow[];
  readonly daily: readonly DailyMetrics[];
  readonly stats: SummaryStats;
}

export function CostLatencySection({
  rows,
  daily,
  stats,
}: CostLatencySectionProps) {
  const costBins = useMemo(
    () => binValues(finiteNumbers(rows.map((r) => r.totalCost)), 30),
    [rows]
  );
  const latencyBins = useMemo(
    () => binValues(finiteNumbers(rows.map((r) => r.latencySeconds)), 30),
    [rows]
  );
  // turnTokens is 0 when the API had no usage metadata — treat 0 as missing.
  const tokens = useMemo(
    () => finiteNumbers(rows.map((r) => r.turnTokens)).filter((t) => t > 0),
    [rows]
  );
  const tokenBins = useMemo(() => binValues(tokens, 30), [tokens]);

  return (
    <Flex direction="column" gap={6}>
      <Box>
        <Heading as="h3" size="md" mb={3}>
          Cost
        </Heading>
        <Flex direction="column" gap={3}>
          <InfoCallout title="How is cost calculated?">
            Cost is the total LLM spend per trace as reported by Langfuse
            (totalCost). It includes all generation steps within the trace
            (tool-use calls, retries, etc.). Mean gives the average spend; p95
            shows the worst-case for most users; median is less sensitive to
            outlier-heavy traces.
          </InfoCallout>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <ChartCard
              title="Cost distribution"
              help="Per-trace LLM cost across the window."
              info="Most traces should cluster in the cheap bins on the left. A long
                right tail is normal (complex analyses cost more), but compare Max
                against Mean — a Max hundreds of times the mean flags runaway traces
                worth opening in the Trace Explorer."
            >
              {stats.costCount ? (
                <Flex direction="column" gap={3}>
                  <StatCards
                    items={[
                      {
                        label: "Total",
                        value: `$${stats.totalCost.toFixed(2)}`,
                      },
                      { label: "Mean", value: `$${stats.meanCost.toFixed(4)}` },
                      {
                        label: "Median",
                        value: `$${stats.medianCost.toFixed(4)}`,
                      },
                      { label: "P95", value: `$${stats.p95Cost.toFixed(4)}` },
                      { label: "Max", value: `$${stats.maxCost.toFixed(4)}` },
                    ]}
                  />
                  <HistogramChart
                    bins={costBins}
                    edgeFormatter={(v) => `$${v.toFixed(4)}`}
                  />
                </Flex>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  No cost data available.
                </Text>
              )}
            </ChartCard>
            {daily.length ? (
              <ChartCard
                title="Daily cost"
                help="Mean and p95 LLM cost per trace, per day."
                info="A rising mean with a flat p95 means everything got slightly more
                  expensive (e.g. a prompt change); a rising p95 alone means the
                  expensive tail got worse (heavier analyses or retries)."
              >
                <DailyLinesChart
                  data={daily as unknown as Record<string, unknown>[]}
                  series={[
                    {
                      key: "meanCost",
                      label: "Mean cost",
                      color: CATEGORY_COLORS[0],
                    },
                    {
                      key: "p95Cost",
                      label: "p95 cost",
                      color: CATEGORY_COLORS[1],
                    },
                  ]}
                  yLabel="USD"
                  valueFormatter={(v) => `$${v.toFixed(4)}`}
                />
              </ChartCard>
            ) : null}
          </SimpleGrid>
        </Flex>
      </Box>

      <Box>
        <Heading as="h3" size="md" mb={3}>
          Latency
        </Heading>
        <Flex direction="column" gap={3}>
          <InfoCallout title="What does latency measure?">
            Latency is the wall-clock time from request receipt to final
            response, as recorded by Langfuse. It includes LLM inference, tool
            execution, retries, and any network overhead. p95 is a good proxy
            for worst-case user experience.
          </InfoCallout>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <ChartCard
              title="Latency distribution"
              help="Per-trace response time across the window."
              info="The bulk of traces should sit left of ~30s. A second bump far to
                the right usually isolates a specific slow path (a heavy tool or a
                retry loop) rather than general slowness."
            >
              {stats.latencyCount ? (
                <Flex direction="column" gap={3}>
                  <StatCards
                    items={[
                      {
                        label: "Total traces",
                        value: formatCount(stats.latencyCount),
                      },
                      {
                        label: "Mean",
                        value: `${stats.meanLatency.toFixed(2)}s`,
                      },
                      {
                        label: "Median",
                        value: `${stats.medianLatency.toFixed(2)}s`,
                      },
                      {
                        label: "P95",
                        value: `${stats.p95Latency.toFixed(2)}s`,
                      },
                      {
                        label: "Max",
                        value: `${stats.maxLatency.toFixed(2)}s`,
                      },
                    ]}
                  />
                  <HistogramChart
                    bins={latencyBins}
                    edgeFormatter={(v) => `${v.toFixed(1)}s`}
                  />
                </Flex>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  No latency data available.
                </Text>
              )}
            </ChartCard>
            {daily.length ? (
              <ChartCard
                title="Daily latency"
                help="Mean and p95 response time per day."
                info="The gap between the two lines is your consistency: a p95 several
                  times the mean means a few users wait far longer than most. Spikes
                  on single days usually track upstream API slowness."
              >
                <DailyLinesChart
                  data={daily as unknown as Record<string, unknown>[]}
                  series={[
                    {
                      key: "meanLatency",
                      label: "Mean latency",
                      color: CATEGORY_COLORS[0],
                    },
                    {
                      key: "p95Latency",
                      label: "p95 latency",
                      color: CATEGORY_COLORS[1],
                    },
                  ]}
                  yLabel="Seconds"
                  valueFormatter={(v) => `${v.toFixed(2)}s`}
                />
              </ChartCard>
            ) : null}
          </SimpleGrid>
        </Flex>
      </Box>

      <Box>
        <Heading as="h3" size="md" mb={3}>
          Tokens
        </Heading>
        <Flex direction="column" gap={3}>
          <InfoCallout title="What do token counts include?">
            Tokens are the per-turn total (input + output) summed across every
            LLM call in the turn, as reported in the model&apos;s usage
            metadata. Tokens drive cost and (for output tokens) latency, and
            they surface prompt bloat that cost alone can hide when model prices
            change. Traces without usage metadata are excluded.
          </InfoCallout>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <ChartCard
              title="Tokens per trace"
              help="Total LLM tokens consumed by each turn."
              info="The bulk should sit in a stable band; a drifting mean usually
                means the system prompt or tool descriptions grew. Heavy right-tail
                traces are multi-tool analyses — check they correlate with the cost
                tail rather than retry loops."
            >
              {tokens.length ? (
                <Flex direction="column" gap={3}>
                  <StatCards
                    items={[
                      {
                        label: "Traces",
                        value: formatCount(tokens.length),
                      },
                      { label: "Mean", value: formatCount(mean(tokens)) },
                      { label: "Median", value: formatCount(median(tokens)) },
                      {
                        label: "P95",
                        value: formatCount(quantile(tokens, 0.95)),
                      },
                      {
                        label: "Max",
                        value: formatCount(Math.max(...tokens)),
                      },
                    ]}
                  />
                  <HistogramChart
                    bins={tokenBins}
                    edgeFormatter={(v) => formatCompact(v)}
                  />
                </Flex>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  No token data available.
                </Text>
              )}
            </ChartCard>
            {daily.length && tokens.length ? (
              <ChartCard
                title="Daily tokens"
                help="Mean and p95 tokens per trace, per day."
                info="A step change in the mean pinpoints the deploy that changed
                  prompt size; a rising p95 alone means complex analyses are getting
                  heavier while typical turns are stable."
              >
                <DailyLinesChart
                  data={daily as unknown as Record<string, unknown>[]}
                  series={[
                    {
                      key: "meanTokens",
                      label: "Mean tokens",
                      color: CATEGORY_COLORS[0],
                    },
                    {
                      key: "p95Tokens",
                      label: "p95 tokens",
                      color: CATEGORY_COLORS[1],
                    },
                  ]}
                  yLabel="Tokens"
                  valueFormatter={(v) => formatCount(v)}
                  yTickFormatter={(v) => formatCompact(v)}
                />
              </ChartCard>
            ) : null}
          </SimpleGrid>
        </Flex>
      </Box>
    </Flex>
  );
}
