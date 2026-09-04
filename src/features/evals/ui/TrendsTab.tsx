"use client";

/**
 * Rates across the run history, one line per comparability group (env, ff,
 * trial count) — profile changes never masquerade as rate changes. The run
 * table below the charts deep-links into the Runs tab.
 */

import { Flex, Link as ChakraLink, Table, Text } from "@chakra-ui/react";
import { buildTrendSeries } from "../lib/trends";
import { fmtPct, fmtRunDate } from "../lib/format";
import type { EvalSet } from "../model/types";
import { TrendLineChart } from "./charts/TrendLineChart";
import { ChartCard } from "./primitives/ChartCard";
import { InlineAlert } from "./primitives/InlineAlert";
import { QueryState } from "./primitives/QueryState";
import { SetSwitcher } from "./primitives/SetSwitcher";
import { useRunIndex } from "./use-evals-data";

interface TrendsTabProps {
  readonly set: EvalSet;
  readonly onSetChange: (set: EvalSet) => void;
  readonly onOpenRun: (runId: string) => void;
}

export function TrendsTab({ set, onSetChange, onOpenRun }: TrendsTabProps) {
  const index = useRunIndex();
  const runs = index.data?.[set] ?? [];
  const series = buildTrendSeries(runs);

  return (
    <Flex direction="column" gap={4}>
      <SetSwitcher value={set} onChange={onSetChange} />
      <QueryState
        isLoading={index.isLoading}
        error={index.error as Error | null}
        what="the run index"
      />
      {index.data && runs.length === 0 ? (
        <InlineAlert
          status="info"
          message="No committed runs for this set yet."
        />
      ) : null}
      {runs.length > 0 ? (
        <>
          <ChartCard
            title="Measured pass rate"
            description="pass / (pass + fail) per run. Lines never mix environments, tool profiles or trial counts; 1-trial series are smoke and read as directional only."
          >
            <TrendLineChart series={series} metric="passRate" />
          </ChartCard>
          <ChartCard
            title="Availability"
            description="Share of rows that did not error (errors are infrastructure, not quality)."
          >
            <TrendLineChart series={series} metric="availability" />
          </ChartCard>
          <ChartCard title="Runs" description="Newest first.">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>date</Table.ColumnHeader>
                  <Table.ColumnHeader>build</Table.ColumnHeader>
                  <Table.ColumnHeader>profile</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    pass rate
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">rows</Table.ColumnHeader>
                  <Table.ColumnHeader />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[...runs]
                  .sort((a, b) => b.started.localeCompare(a.started))
                  .map((run) => {
                    const verdicts = run.buckets?.verdicts;
                    const measured = verdicts
                      ? verdicts.pass + verdicts.fail
                      : 0;
                    return (
                      <Table.Row key={run.runId}>
                        <Table.Cell>{fmtRunDate(run.started)}</Table.Cell>
                        <Table.Cell>
                          <Text lineClamp={1} title={run.build}>
                            {run.build}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          {run.environment} · {run.ff ?? "default"} ·{" "}
                          {run.numTrials}t
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {fmtPct(
                            verdicts && measured
                              ? verdicts.pass / measured
                              : null
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {run.buckets?.rowsTotal ?? "–"}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          <ChakraLink
                            fontSize="xs"
                            onClick={() => onOpenRun(run.runId)}
                          >
                            inspect
                          </ChakraLink>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
              </Table.Body>
            </Table.Root>
          </ChartCard>
        </>
      ) : null}
    </Flex>
  );
}
