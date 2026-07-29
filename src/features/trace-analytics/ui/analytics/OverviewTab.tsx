"use client";

/** Overview tab — headline KPIs with period-over-period deltas and trends. */

import { useMemo } from "react";
import { Flex, SimpleGrid, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import type { AnalysisGrain } from "../../model/filtersStore";
import type { DailyMetrics } from "../../lib/analytics/daily";
import { computeDailyOutcomeMix } from "../../lib/analytics/daily";
import type {
  SummaryStats,
  PromptUtilisation,
} from "../../lib/analytics/aggregations";
import type { UserSegments } from "../../lib/analytics/segments";
import type { ReportContext } from "../../lib/analytics/report";
import {
  percentagePointDelta,
  relativeDelta,
  withMovingAverage,
} from "../../lib/analytics/compare";
import { formatCount, formatPercent, formatReportDate } from "../../lib/format";
import { KpiCard } from "../primitives/KpiCard";
import { ChartCard } from "../charts/ChartCard";
import { DailyLinesChart } from "../charts/DailyLinesChart";
import { DailyOutcomeAreaChart } from "../charts/DailyOutcomeAreaChart";
import { SummarySection } from "./SummarySection";
import { useOpenTracesInExplorer } from "../useOpenTracesInExplorer";
import {
  CATEGORY_COLORS,
  CHART_CHROME,
  OUTCOME_LABELS,
} from "../charts/palette";

interface OverviewTabProps {
  readonly rows: readonly TraceRow[];
  readonly daily: readonly DailyMetrics[];
  readonly stats: SummaryStats;
  readonly prevStats: SummaryStats | null;
  readonly utilisation: PromptUtilisation;
  readonly prevUtilisation: PromptUtilisation | null;
  readonly segments: UserSegments | null;
  readonly prevSegments: UserSegments | null;
  readonly reportContext: ReportContext;
  readonly baseThreadUrl: string;
  readonly prevRangeLabel: string;
  readonly grain: AnalysisGrain;
}

export function OverviewTab({
  rows,
  daily,
  stats,
  prevStats,
  utilisation,
  prevUtilisation,
  segments,
  prevSegments,
  reportContext,
  baseThreadUrl,
  prevRangeLabel,
  grain,
}: OverviewTabProps) {
  const conversationGrain = grain === "conversation";
  const volumeData = useMemo(
    () =>
      withMovingAverage(
        daily as unknown as Record<string, unknown>[],
        "traces",
        7
      ),
    [daily]
  );
  const showMa = daily.length >= 10;
  const spark = (key: keyof DailyMetrics) =>
    daily.length >= 2 ? daily.map((d) => Number(d[key])) : undefined;
  // Daily outcome composition (API labels) for the stacked-area chart.
  const dailyOutcomeMix = useMemo(
    () =>
      computeDailyOutcomeMix(rows, (r) =>
        r.outcome ? (OUTCOME_LABELS[r.outcome] ?? r.outcome) : null
      ),
    [rows]
  );
  const openTraces = useOpenTracesInExplorer();

  const kpis = [
    {
      label: conversationGrain ? "Conversations" : "Prompts (traces)",
      value: formatCount(stats.totalTraces),
      hint: conversationGrain
        ? "One row = one conversation thread"
        : "One trace = one user turn",
      delta: prevStats
        ? relativeDelta(stats.totalTraces, prevStats.totalTraces, {
            upIsGood: true,
          })
        : null,
      spark: spark("traces"),
    },
    {
      label: "Active users",
      value: formatCount(stats.uniqueUsers),
      hint: "Sent ≥1 prompt in the window",
      delta: prevStats
        ? relativeDelta(stats.uniqueUsers, prevStats.uniqueUsers, {
            upIsGood: true,
          })
        : null,
      spark: spark("uniqueUsers"),
    },
    // At conversation grain this KPI would duplicate the first one.
    ...(conversationGrain
      ? []
      : [
          {
            label: "Conversations",
            value: formatCount(stats.uniqueThreads),
            hint: "Distinct threads touched",
            delta: prevStats
              ? relativeDelta(stats.uniqueThreads, prevStats.uniqueThreads, {
                  upIsGood: true,
                })
              : null,
            spark: spark("uniqueThreads"),
          },
        ]),
    {
      label: "Success rate",
      value: formatPercent(stats.successRate),
      hint: conversationGrain
        ? "Conversations ending on an answered turn"
        : "Turns answered with ≥1 tool call",
      delta: prevStats
        ? percentagePointDelta(stats.successRate, prevStats.successRate, {
            upIsGood: true,
          })
        : null,
      spark: spark("successRate"),
    },
    ...(segments
      ? [
          {
            label: "New users",
            value: formatCount(segments.newUsers.size),
            hint: "First-ever activity in the window",
            delta: prevSegments
              ? relativeDelta(
                  segments.newUsers.size,
                  prevSegments.newUsers.size,
                  {
                    upIsGood: true,
                  }
                )
              : null,
          },
          {
            label: "Engaged users",
            value: formatCount(segments.engagedUsers.size),
            hint: "≥2 sessions with ≥2 prompts each",
            delta: prevSegments
              ? relativeDelta(
                  segments.engagedUsers.size,
                  prevSegments.engagedUsers.size,
                  {
                    upIsGood: true,
                  }
                )
              : null,
          },
        ]
      : []),
    {
      label: "Prompts / user / day",
      value: utilisation.meanPrompts.toFixed(2),
      hint: "Mean per active user-day",
      delta: prevUtilisation
        ? relativeDelta(utilisation.meanPrompts, prevUtilisation.meanPrompts, {
            upIsGood: true,
          })
        : null,
    },
    {
      label: "p95 latency",
      value: `${stats.p95Latency.toFixed(1)}s`,
      hint: conversationGrain
        ? "Total agent time; 95% of conversations sum to less"
        : "95% of turns respond faster",
      delta: prevStats
        ? relativeDelta(stats.p95Latency, prevStats.p95Latency, {
            upIsGood: false,
          })
        : null,
      spark: spark("p95Latency"),
    },
    {
      label: "LLM cost",
      value: `$${stats.totalCost.toFixed(2)}`,
      hint: "Total Langfuse-reported spend",
      delta: prevStats
        ? relativeDelta(stats.totalCost, prevStats.totalCost, {
            upIsGood: false,
          })
        : null,
    },
  ];

  return (
    <Flex direction="column" gap={4}>
      <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} gap={3}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </SimpleGrid>
      {prevStats ? (
        <Text fontSize="xs" color="fg.muted" mt={-2}>
          Deltas compare against the previous period ({prevRangeLabel});
          sparklines show the daily trend inside the current window.
        </Text>
      ) : null}

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
        {daily.length ? (
          <ChartCard
            title="Daily volume"
            help={
              conversationGrain
                ? "Conversations (dated by their first turn) and unique users per day."
                : "Traces, unique users and unique threads per day."
            }
            info={
              <>
                {conversationGrain
                  ? "Each line counts distinct items per calendar day: conversations started and users who sent at least one prompt."
                  : "Each line counts distinct items per calendar day: prompts sent (traces), users who sent at least one, and conversation threads touched."}
                {showMa
                  ? " The dashed gray line is a 7-day moving average — follow it, not the daily spikes, for the underlying trend."
                  : ""}{" "}
                Weekday/weekend rhythm is normal; look for the lines moving
                together (organic growth) vs. volume spiking alone (a few heavy
                users or a bot).
              </>
            }
          >
            <DailyLinesChart
              data={volumeData}
              series={[
                {
                  key: "traces",
                  label: conversationGrain ? "Conversations" : "Traces",
                  color: CATEGORY_COLORS[0],
                },
                {
                  key: "uniqueUsers",
                  label: "Unique users",
                  color: CATEGORY_COLORS[2],
                },
                // Threads ≈ conversations at conversation grain — drop the
                // near-duplicate line.
                ...(conversationGrain
                  ? []
                  : [
                      {
                        key: "uniqueThreads",
                        label: "Unique threads",
                        color: CATEGORY_COLORS[1],
                      },
                    ]),
                ...(showMa
                  ? [
                      {
                        key: "tracesMa",
                        label: conversationGrain
                          ? "Conversations (7d avg)"
                          : "Traces (7d avg)",
                        color: CHART_CHROME.contextSeries,
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
              yLabel="Count"
            />
          </ChartCard>
        ) : null}
        {daily.length ? (
          <ChartCard
            title="Daily outcomes"
            help={`Share of each day's ${
              conversationGrain ? "conversations (by final turn)" : "traces"
            } by outcome. Click a day to open its traces.`}
            info={
              <>
                Every trace gets exactly one outcome, so each day stacks to
                100%. Green (Success) should dominate; the warm bands at the
                bottom are failures — amber = apologetic answer, red =
                user-visible error, dark red = no answer at all. Gray (Defer) is
                a clarification request, not a failure. A widening warm band on
                a specific day usually points at an incident — click the day to
                open its traces, or drill in from the Quality tab.
              </>
            }
          >
            <DailyOutcomeAreaChart
              data={dailyOutcomeMix}
              onDayClick={(date) =>
                openTraces(
                  conversationGrain
                    ? `Conversations started on ${date} (opening turns)`
                    : `All traces on ${date}`,
                  rows.filter((r) => r.date === date)
                )
              }
            />
          </ChartCard>
        ) : null}
      </SimpleGrid>

      <SummarySection
        context={reportContext}
        rows={rows}
        baseThreadUrl={baseThreadUrl}
        heading={`Report (${formatReportDate(reportContext.startDate)} → ${formatReportDate(reportContext.endDate)})`}
      />
    </Flex>
  );
}
