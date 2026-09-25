"use client";

/**
 * Accuracy view (from the Query Accuracy Dashboard mockup, panels 2 + 3):
 * the headline pass rate exactly as the GOLD HTML reports derive it
 * (row verdicts over all rows, ± spread between repeats), a Sankey of the
 * five-dimension primary-failure attribution (GOLD only, scope-first,
 * unattributed class for shared-only failures), the by-query-type mix —
 * composed from the latest run per set for CHALLENGE, since diagnostics
 * are set-scoped — and the type × dimension coverage matrix bucketed into
 * ROBUST / THIN / GAP / n/a.
 */

import { useMemo } from "react";
import { Flex, Grid, SimpleGrid, Text } from "@chakra-ui/react";
import { accuracyBreakdown, PRIMARY_DIMENSIONS } from "../lib/attribution";
import { bucketRates } from "../lib/buckets";
import { isInfoOnly } from "../lib/checks";
import { pickHeadlineRun } from "../lib/comparability";
import { fmtPct, fmtRunDate } from "../lib/format";
import {
  challengeRowDefs,
  composeTypeBreakdown,
  coverageMatrix,
  goldRowDefs,
  typeBreakdown,
} from "../lib/matrix";
import { trialSpreadPts } from "../lib/stats";
import { seriesLabel } from "../lib/trends";
import type { EvalSet } from "../model/types";
import { BucketBar } from "./charts/BucketBar";
import { CoverageMatrixGrid } from "./charts/CoverageMatrixGrid";
import { DimensionSankey } from "./charts/DimensionSankey";
import { TypeBars } from "./charts/TypeBars";
import { DIMENSION_COLORS, PASS_COLOR } from "./charts/palette";
import {
  DIMENSION_DEFINITIONS,
  MATRIX_CATEGORY_DEFINITIONS,
} from "./definitions";
import { ChartCard } from "./primitives/ChartCard";
import { DefinitionsList } from "./primitives/DefinitionsList";
import { InlineAlert } from "./primitives/InlineAlert";
import { KpiCard } from "./primitives/KpiCard";
import { QueryState } from "./primitives/QueryState";
import { SetSwitcher } from "./primitives/SetSwitcher";
import { RunTierBadge } from "./primitives/badges";
import { useCasesByUid, useRun, useRunIndex, useRuns } from "./use-evals-data";

/** Composed CHALLENGE view: how many recent runs to consider per fetch. */
const COMPOSE_RUN_LIMIT = 8;

interface OverviewTabProps {
  readonly set: EvalSet;
  readonly onSetChange: (set: EvalSet) => void;
}

export function OverviewTab({ set, onSetChange }: OverviewTabProps) {
  const index = useRunIndex();
  const headlineRun = pickHeadlineRun(index.data?.[set] ?? []);
  const run = useRun(headlineRun?.path ?? null);
  const cases = useCasesByUid(set);

  // CHALLENGE by-type composes the latest run per set (diagnostics are
  // set-scoped); GOLD reads the single headline run.
  const composePaths = useMemo(
    () =>
      set === "challenge"
        ? (index.data?.challenge ?? [])
            .slice()
            .sort((a, b) => b.started.localeCompare(a.started))
            .slice(0, COMPOSE_RUN_LIMIT)
            .map((entry) => entry.path)
        : [],
    [set, index.data]
  );
  const composed = useRuns(composePaths);

  const breakdown = useMemo(
    () => (run.data ? accuracyBreakdown(run.data.rows) : null),
    [run.data]
  );
  const spread = useMemo(
    () =>
      run.data
        ? trialSpreadPts(run.data.rows, run.data.numTrials, isInfoOnly)
        : null,
    [run.data]
  );
  const rowDefs = useMemo(() => {
    if (set === "challenge") return challengeRowDefs();
    return cases.data ? goldRowDefs([...cases.data.values()]) : [];
  }, [set, cases.data]);
  const byType = useMemo(() => {
    if (!cases.data) return null;
    if (set === "challenge") {
      if (composed.runs.length === 0) return null;
      return composeTypeBreakdown(composed.runs, cases.data, rowDefs);
    }
    return run.data ? typeBreakdown(run.data.rows, cases.data, rowDefs) : null;
  }, [set, run.data, cases.data, composed.runs, rowDefs]);
  const composedFrom = useMemo(() => {
    if (!byType) return [];
    return [
      ...new Set(byType.flatMap((row) => (row.runId ? [row.runId] : []))),
    ];
  }, [byType]);
  const matrix = useMemo(
    () =>
      cases.data ? coverageMatrix([...cases.data.values()], rowDefs) : null,
    [cases.data, rowDefs]
  );
  const dimensionKey = useMemo(() => {
    if (!breakdown) return [...DIMENSION_DEFINITIONS];
    return DIMENSION_DEFINITIONS.map((definition) => {
      const count =
        definition.key === "pass"
          ? breakdown.pass
          : breakdown.byDimension[definition.key];
      return {
        ...definition,
        stat: breakdown.total
          ? `${fmtPct(count / breakdown.total, 0)}`
          : undefined,
      };
    });
  }, [breakdown]);
  const matrixKey = useMemo(
    () =>
      MATRIX_CATEGORY_DEFINITIONS.map((definition) => ({
        ...definition,
        color:
          definition.key === "robust"
            ? PASS_COLOR
            : definition.key === "thin"
              ? DIMENSION_COLORS.analysis
              : definition.key === "gap"
                ? DIMENSION_COLORS.retrieval
                : DIMENSION_COLORS.unattributed,
      })),
    []
  );

  return (
    <Flex direction="column" gap={4}>
      <Text
        fontSize="2xs"
        fontFamily="mono"
        textTransform="uppercase"
        letterSpacing="0.14em"
        color="#0F766E"
      >
        Offline eval · attempted-answer accuracy ·{" "}
        {set === "gold" ? "GOLD regression set" : "CHALLENGE quality set"}
      </Text>
      <Flex gap={3} align="center" wrap="wrap">
        <SetSwitcher value={set} onChange={onSetChange} />
        {headlineRun ? <RunTierBadge run={headlineRun} /> : null}
        {headlineRun ? (
          <Text fontSize="xs" color="fg.subtle">
            {headlineRun.runId} — {fmtRunDate(headlineRun.started)} · build
            &quot;{headlineRun.build}&quot; · {seriesLabel(headlineRun)}
          </Text>
        ) : null}
      </Flex>

      <QueryState
        isLoading={
          index.isLoading ||
          run.isLoading ||
          cases.isLoading ||
          composed.isLoading
        }
        error={
          (index.error ??
            run.error ??
            cases.error ??
            composed.error) as Error | null
        }
        what="the accuracy data"
      />
      {index.data && !headlineRun ? (
        <InlineAlert
          status="info"
          message="No committed runs for this set yet."
        />
      ) : null}

      {breakdown ? (
        <>
          <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} gap={3}>
            <KpiCard
              label="Pass rate"
              value={fmtPct(
                breakdown.total ? breakdown.pass / breakdown.total : null,
                0
              )}
              valueColor={PASS_COLOR}
              hint={
                `${breakdown.pass} / ${breakdown.total} cases` +
                (spread !== null
                  ? ` · ± ${spread < 0.05 ? "0" : spread.toFixed(1)} pts between repeats`
                  : "")
              }
            />
            {PRIMARY_DIMENSIONS.map((dimension) => (
              <KpiCard
                key={dimension}
                label={`${dimension} error`}
                value={fmtPct(
                  breakdown.total
                    ? breakdown.byDimension[dimension] / breakdown.total
                    : null,
                  0
                )}
                valueColor={DIMENSION_COLORS[dimension]}
                hint={`${breakdown.byDimension[dimension]} cases`}
              />
            ))}
          </SimpleGrid>
          {breakdown.error || breakdown.uncovered ? (
            <Text fontSize="xs" color="fg.subtle">
              Excluded from the flow: {breakdown.error} errored,{" "}
              {breakdown.uncovered} uncovered rows (still in the headline
              denominator, matching the HTML reports).
            </Text>
          ) : null}

          {set === "gold" ? (
            <ChartCard
              title="Overall outcome by failure dimension"
              description="Every scored case either passes — clearing every check that applied to it — or is attributed to the first stage it failed, in scope-first order. The green body is the cases still passing so far; each stage's failures peel off in sequence, and what survives every stage is the pass rate. Categories are mutually exclusive, so the segments sum to all scored cases."
            >
              <Grid
                templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 24rem" }}
                gap={8}
                alignItems="start"
              >
                <DimensionSankey breakdown={breakdown} />
                <DefinitionsList rows={dimensionKey} />
              </Grid>
            </ChartCard>
          ) : null}
        </>
      ) : null}

      {headlineRun?.buckets ? (
        <ChartCard
          title="Bucket pass rates (dedicated checks)"
          description="Per-check pass rates for this run, grouped by the bucket each dedicated check speaks for. Unlike the outcome above (one verdict per case), this counts every evaluated check; shared checks straddle two buckets and are not attributed here."
        >
          <BucketBar
            items={bucketRates(headlineRun.buckets).map((bucket) => ({
              label: bucket.bucket,
              value: bucket.rate,
              detail: `${bucket.evaluated} checks`,
            }))}
          />
        </ChartCard>
      ) : null}

      {byType ? (
        <ChartCard
          title="By query type"
          description={
            set === "challenge"
              ? `Each bar splits one query type's scored cases into passes (green) and primary failure dimensions, so a long coloured tail names where that type breaks. Composed from the latest run per set (diagnostics are set-scoped)${
                  composedFrom.length ? `: ${composedFrom.join(", ")}` : ""
                }. Grey rows have no case set yet — the taxonomy doubles as the authoring roadmap.`
              : "Each bar splits one GOLD group's scored cases into passes (green) and primary failure dimensions, so a long coloured tail names where that group breaks."
          }
        >
          {set === "challenge" ? (
            <Grid
              templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 24rem" }}
              gap={8}
              alignItems="start"
            >
              <TypeBars rows={byType} />
              <DefinitionsList rows={dimensionKey} />
            </Grid>
          ) : (
            <TypeBars rows={byType} />
          )}
        </ChartCard>
      ) : null}

      {matrix ? (
        <ChartCard
          title="Coverage matrix (type × dimension)"
          description="Whether each query type can be MEASURED in each failure dimension at all, from the harness's own implied-check logic — independent of any run. A rate is only as trustworthy as this matrix says: a GAP cell means failures of that kind would go unseen for that type. Hover a cell for the raw counts."
        >
          <Grid
            templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 24rem" }}
            gap={8}
            alignItems="start"
          >
            <CoverageMatrixGrid rows={matrix} />
            <DefinitionsList title="How to read it" rows={matrixKey} />
          </Grid>
        </ChartCard>
      ) : null}
    </Flex>
  );
}
