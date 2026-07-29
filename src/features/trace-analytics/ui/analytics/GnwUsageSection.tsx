"use client";

import { useMemo } from "react";
import { Box, Flex, Heading, SimpleGrid } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import {
  countAoiNames,
  countCategories,
} from "../../lib/analytics/aggregations";
import { computeOutcomeMixByDataset } from "../../lib/analytics/datasetOutcomes";
import { OUTCOME_LABELS, SEGMENT_COLORS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { OutcomeMixBars } from "../charts/OutcomeMixBars";
import { InfoCallout } from "../primitives/InfoCallout";
import { useOpenTracesInExplorer } from "../useOpenTracesInExplorer";

/** Does the trace's thread-cumulative dataset CSV include this dataset? */
function usedDataset(row: TraceRow, dataset: string): boolean {
  return row.datasetsAnalysed
    .split(",")
    .map((part) => part.trim())
    .includes(dataset);
}

interface GnwUsageSectionProps {
  readonly rows: readonly TraceRow[];
}

/** Two-state coverage donut (has X vs not), colored as a polarity pair. */
function coverageData(
  rows: readonly TraceRow[],
  flag: (row: TraceRow) => boolean | null,
  yesLabel: string,
  noLabel: string
) {
  const known = rows.filter((r) => flag(r) !== null);
  const yes = known.filter((r) => flag(r) === true).length;
  return {
    known: known.length,
    data: [
      { label: yesLabel, count: yes },
      { label: noLabel, count: known.length - yes },
    ],
    colors: {
      [yesLabel]: SEGMENT_COLORS.new,
      [noLabel]: SEGMENT_COLORS.returning,
    },
  };
}

export function GnwUsageSection({ rows }: GnwUsageSectionProps) {
  const openTraces = useOpenTracesInExplorer();
  const datasetCounts = useMemo(
    () =>
      countCategories(
        rows.map((r) => r.datasetsAnalysed),
        { explodeCsv: true, topN: 10 }
      ),
    [rows]
  );
  const aoiTypeCounts = useMemo(
    () =>
      countCategories(
        rows.map((r) => r.aoiType),
        { topN: 10 }
      ),
    [rows]
  );
  const aoiNames = useMemo(() => countAoiNames(rows, 30), [rows]);
  const datasetOutcomes = useMemo(
    () =>
      computeOutcomeMixByDataset(rows, 10).map((d) => ({
        label: d.label,
        total: d.total,
        counts: Object.fromEntries(
          Object.entries(d.counts).map(([outcome, count]) => [
            OUTCOME_LABELS[outcome] ?? outcome,
            count,
          ])
        ),
      })),
    [rows]
  );
  const insight = useMemo(
    () => coverageData(rows, (r) => r.hasInsight, "Insight", "No insight"),
    [rows]
  );
  const globalScope = useMemo(
    () => coverageData(rows, (r) => r.isGlobal, "Global", "Specific area"),
    [rows]
  );

  return (
    <Box>
      <Heading as="h3" size="md" mb={3}>
        GNW Analysis Usage
      </Heading>
      <Flex direction="column" gap={3}>
        <InfoCallout title="Where does this data come from?">
          These metrics are extracted from trace context metadata attached by
          the GNW agent. Only traces that reach the analysis stage will have
          dataset and AOI information populated — so totals here are lower than
          overall trace counts by design.
        </InfoCallout>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          {datasetCounts.length ? (
            <ChartCard
              title="Datasets analysed"
              help="Datasets referenced in analyses (one trace can reference several). Click a bar to open those traces."
              info="Counts come from trace context, so bars don't sum to the trace
                total and shares of a whole aren't meaningful — compare bar lengths
                instead. Use this to see which data products actually drive agent
                usage, and which are never touched. Click any bar to inspect its
                traces in the Trace Explorer."
            >
              <HorizontalBarChart
                data={datasetCounts.map((d) => ({
                  label: d.label,
                  count: d.count,
                }))}
                onBarClick={(datum) =>
                  openTraces(
                    `Dataset = ${datum.label}`,
                    rows.filter((r) => usedDataset(r, datum.label))
                  )
                }
              />
            </ChartCard>
          ) : null}
          {aoiTypeCounts.length ? (
            <ChartCard
              title="AOI type"
              help="What kinds of areas users analyse (country, region, drawn polygon…). Click a slice to open those traces."
              info="A high share of drawn polygons suggests users care about custom
                places the catalog doesn't cover; a high share of countries suggests
                broad exploratory use. Click a slice to inspect its traces in the
                Trace Explorer."
            >
              <DonutChart
                data={aoiTypeCounts}
                centerLabel="analyses"
                onSliceClick={(label) =>
                  openTraces(
                    `AOI type = ${label}`,
                    rows.filter((r) => r.aoiType.trim() === label)
                  )
                }
              />
            </ChartCard>
          ) : null}
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          {insight.known ? (
            <ChartCard
              title="Insight coverage"
              help="Share of traces that produced a saved insight. Click a slice to open those traces."
              info="Insights are the agent's packaged takeaway (chart + narrative).
                A low share isn't automatically bad — clarifications and follow-ups
                don't produce insights — but a falling trend after a release is a
                regression signal. Click a slice to inspect its traces in the Trace
                Explorer."
            >
              <DonutChart
                data={insight.data}
                colors={insight.colors}
                height={200}
                centerLabel="traces"
                onSliceClick={(label) =>
                  openTraces(
                    label,
                    rows.filter((r) => r.hasInsight === (label === "Insight"))
                  )
                }
              />
            </ChartCard>
          ) : null}
          {globalScope.known ? (
            <ChartCard
              title="Global vs specific area"
              help="Whether analyses ran globally or on a selected area. Click a slice to open those traces."
              info="Global queries (“all countries”) are heavier and often
                exploratory; specific areas signal a user with a concrete place in
                mind. A rising global share can also flag misfired AOI selection.
                Click a slice to inspect its traces in the Trace Explorer."
            >
              <DonutChart
                data={globalScope.data}
                colors={globalScope.colors}
                height={200}
                centerLabel="traces"
                onSliceClick={(label) =>
                  openTraces(
                    label,
                    rows.filter((r) => r.isGlobal === (label === "Global"))
                  )
                }
              />
            </ChartCard>
          ) : null}
        </SimpleGrid>
        {datasetOutcomes.length ? (
          <ChartCard
            title="Outcome mix by dataset"
            help="How turns that touched each dataset ended, best → worst. Click a segment to open its traces."
            info="Rows are the most-used datasets; segments read left to right from
              Success to Empty. A dataset whose warm share is well above its peers
              usually has a broken handler or confusing schema — click the warm
              segment to open exactly those failing traces in the Trace Explorer.
              Small totals swing wildly; check the trace count in the tooltip
              before reacting."
          >
            <OutcomeMixBars
              data={datasetOutcomes}
              onSegmentClick={(dataset, outcome) =>
                openTraces(
                  `Dataset = ${dataset} · outcome ${outcome}`,
                  rows.filter(
                    (r) =>
                      usedDataset(r, dataset) &&
                      (OUTCOME_LABELS[String(r.outcome)] ??
                        String(r.outcome)) === outcome
                  )
                )
              }
            />
          </ChartCard>
        ) : null}
        {aoiNames.length ? (
          <ChartCard
            title="AOI selection counts"
            help="Most commonly analysed places, colored by dominant AOI type. Click a bar to open those traces."
            info="Bars share one count axis; color only says what kind of area the
              place is. Repeated appearances of one place often trace back to a
              single user's project — click the bar to open its traces, or click
              through Top Users to confirm."
          >
            <HorizontalBarChart
              data={aoiNames.map((a) => ({
                label: a.label,
                count: a.count,
                category: a.aoiType,
              }))}
              onBarClick={(datum) =>
                openTraces(
                  `AOI = ${datum.label}`,
                  rows.filter((r) => r.aoiName.trim() === datum.label)
                )
              }
            />
          </ChartCard>
        ) : null}
      </Flex>
    </Box>
  );
}
