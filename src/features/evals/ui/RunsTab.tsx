"use client";

/**
 * Run drill-down: pick a run, see the client-side rollup and every case
 * row — failing first — with reasons, actuals, per-trial verdicts and
 * Langfuse trace links. The uid join to the case store tolerates misses
 * (a run's caseset_version can lag the current store).
 */

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  Input,
  Link as ChakraLink,
  NativeSelect,
  SimpleGrid,
  Table,
  Text,
} from "@chakra-ui/react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { isInfoOnly } from "../lib/checks";
import { fmtCI, fmtLatency, fmtPct, fmtRunDate } from "../lib/format";
import { rollupRun } from "../lib/rollup";
import { seriesLabel } from "../lib/trends";
import { rowVerdict } from "../lib/verdict";
import type { CaseIndexEntry, CaseRow, EvalSet, Verdict } from "../model/types";
import { ChartCard } from "./primitives/ChartCard";
import { InlineAlert } from "./primitives/InlineAlert";
import { KpiCard } from "./primitives/KpiCard";
import { QueryState } from "./primitives/QueryState";
import { SetSwitcher } from "./primitives/SetSwitcher";
import { RunTierBadge, VerdictChip } from "./primitives/badges";
import { useCasesByUid, useRun, useRunIndex } from "./use-evals-data";

const VERDICT_ORDER: Record<Verdict, number> = {
  fail: 0,
  error: 1,
  uncovered: 2,
  pass: 3,
};

const VERDICT_FILTERS = ["all", "fail", "error", "uncovered", "pass"] as const;

function failedChecks(row: CaseRow): string[] {
  return Object.entries(row.checks)
    .filter(([name, value]) => value === 0 && !isInfoOnly(name))
    .map(([name]) => name)
    .sort();
}

function caseQueryText(entry: CaseIndexEntry | undefined): string | null {
  if (!entry) return null;
  if (entry.turns) return entry.turns.join("  →  ");
  return entry.query ?? null;
}

function RowDetail({
  row,
  caseEntry,
}: {
  readonly row: CaseRow;
  readonly caseEntry: CaseIndexEntry | undefined;
}) {
  const query = caseQueryText(caseEntry);
  return (
    <Box bg="bg.subtle" borderRadius="sm" p={3} fontSize="xs">
      <Text fontWeight="semibold" mb={1}>
        {query ?? "Case no longer in the current store (stale uid)."}
      </Text>
      {row.turnsDetail.length > 0 ? (
        <Flex direction="column" gap={1} mb={2}>
          {row.turnsDetail.map((turn, index) => (
            <Flex key={index} gap={2} align="baseline" wrap="wrap">
              <Badge variant="outline" colorPalette="gray">
                t{index + 1}
              </Badge>
              <Text>{turn.query}</Text>
              <Text color="fg.subtle">{fmtLatency(turn.latencyS)}</Text>
              {turn.traceUrl ? (
                <ChakraLink
                  href={turn.traceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  trace <ArrowSquareOutIcon size={12} />
                </ChakraLink>
              ) : null}
            </Flex>
          ))}
        </Flex>
      ) : null}
      {row.error ? (
        <Text color="red.fg" mb={1}>
          error: {row.error}
        </Text>
      ) : null}
      {Object.entries(row.reasons).map(([check, reason]) => (
        <Text key={check} mb={1}>
          <Text as="span" fontFamily="mono" color="fg.subtle">
            {check}:
          </Text>{" "}
          {reason}
        </Text>
      ))}
      {Object.keys(row.actuals).length > 0 ? (
        <Text color="fg.subtle">
          actuals:{" "}
          {Object.entries(row.actuals)
            .map(([check, actual]) => `${check} = ${actual}`)
            .join(" · ")}
        </Text>
      ) : null}
      {row.trials.length > 0 ? (
        <Flex gap={1} mt={2} wrap="wrap">
          {row.trials.map((trial, index) => {
            const failures = Object.entries(trial.checks).filter(
              ([name, value]) => value === 0 && !isInfoOnly(name)
            ).length;
            return (
              <Badge
                key={index}
                colorPalette={failures ? "red" : "green"}
                variant="subtle"
              >
                trial {index + 1}: {failures ? `${failures} failing` : "clean"}
              </Badge>
            );
          })}
        </Flex>
      ) : null}
    </Box>
  );
}

interface RunsTabProps {
  readonly set: EvalSet;
  readonly onSetChange: (set: EvalSet) => void;
  readonly runId: string | null;
  readonly onRunChange: (runId: string) => void;
}

export function RunsTab({
  set,
  onSetChange,
  runId,
  onRunChange,
}: RunsTabProps) {
  const index = useRunIndex();
  const runs = useMemo(
    () =>
      [...(index.data?.[set] ?? [])].sort((a, b) =>
        b.started.localeCompare(a.started)
      ),
    [index.data, set]
  );
  const selected = runs.find((run) => run.runId === runId) ?? runs[0] ?? null;
  const run = useRun(selected?.path ?? null);
  const cases = useCasesByUid(set);
  const rollup = useMemo(
    () =>
      run.data && cases.data ? rollupRun(run.data.rows, cases.data) : null,
    [run.data, cases.data]
  );

  const [verdictFilter, setVerdictFilter] =
    useState<(typeof VERDICT_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!run.data) return [];
    const needle = search.trim().toLowerCase();
    return run.data.rows
      .map((row) => ({
        row,
        verdict: rowVerdict(row),
        caseEntry: cases.data?.get(row.uid),
      }))
      .filter(
        ({ verdict }) => verdictFilter === "all" || verdict === verdictFilter
      )
      .filter(({ row, caseEntry }) => {
        if (!needle) return true;
        const haystack =
          `${row.id} ${caseQueryText(caseEntry) ?? ""}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort(
        (a, b) =>
          VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
          a.row.id.localeCompare(b.row.id)
      );
  }, [run.data, cases.data, verdictFilter, search]);

  return (
    <Flex direction="column" gap={4}>
      <Flex gap={3} align="center" wrap="wrap">
        <SetSwitcher value={set} onChange={onSetChange} />
        <NativeSelect.Root size="sm" width="30rem" maxW="100%">
          <NativeSelect.Field
            value={selected?.runId ?? ""}
            onChange={(event) => onRunChange(event.currentTarget.value)}
          >
            {runs.map((entry) => (
              <option key={entry.runId} value={entry.runId}>
                {fmtRunDate(entry.started)} · {entry.build} ·{" "}
                {seriesLabel(entry)}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {selected ? <RunTierBadge run={selected} /> : null}
      </Flex>

      <QueryState
        isLoading={index.isLoading || run.isLoading || cases.isLoading}
        error={(index.error ?? run.error ?? cases.error) as Error | null}
        what="the run"
      />
      {index.data && !selected ? (
        <InlineAlert
          status="info"
          message="No committed runs for this set yet."
        />
      ) : null}

      {rollup && selected ? (
        <SimpleGrid columns={{ base: 2, md: 5 }} gap={3}>
          <KpiCard
            label="Quality rate"
            value={fmtPct(rollup.overall.rate)}
            hint={`95% CI ${fmtCI(rollup.overall.ciLow, rollup.overall.ciHigh)} · n=${rollup.overall.n}`}
          />
          <KpiCard
            label="Strict rate"
            value={fmtPct(rollup.overall.strictRate)}
            hint="clean on every trial"
          />
          <KpiCard
            label="Availability"
            value={fmtPct(rollup.availability)}
            hint={`${rollup.errored.length} errored`}
          />
          <KpiCard
            label="Uncovered / stale"
            value={`${rollup.uncovered.length} / ${rollup.stale.length}`}
            hint="reported, never counted"
          />
          <KpiCard
            label="Verdicts"
            value={`${rollup.verdicts.pass}✓ ${rollup.verdicts.fail}✗`}
            hint={`${rollup.verdicts.error} error · ${rollup.verdicts.uncovered} uncovered`}
          />
        </SimpleGrid>
      ) : null}

      {run.data ? (
        <ChartCard
          title="Cases"
          description="Failing first. Click a row for the prompt, reasons, actuals and per-trial verdicts."
        >
          <Flex gap={3} mb={3} wrap="wrap">
            <NativeSelect.Root size="xs" width="10rem">
              <NativeSelect.Field
                value={verdictFilter}
                onChange={(event) =>
                  setVerdictFilter(
                    event.currentTarget
                      .value as (typeof VERDICT_FILTERS)[number]
                  )
                }
              >
                {VERDICT_FILTERS.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter === "all" ? "all verdicts" : filter}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Input
              size="xs"
              width="18rem"
              maxW="100%"
              placeholder="Filter by case id or prompt text"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
            <Text fontSize="xs" color="fg.subtle" alignSelf="center">
              {rows.length} of {run.data.rows.length} rows
            </Text>
          </Flex>
          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>case</Table.ColumnHeader>
                <Table.ColumnHeader>cohort</Table.ColumnHeader>
                <Table.ColumnHeader>verdict</Table.ColumnHeader>
                <Table.ColumnHeader>failing checks</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">latency</Table.ColumnHeader>
                <Table.ColumnHeader>trace</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map(({ row, verdict, caseEntry }) => {
                const failures = failedChecks(row);
                const expanded = expandedUid === row.uid;
                return [
                  <Table.Row
                    key={row.uid}
                    onClick={() => setExpandedUid(expanded ? null : row.uid)}
                    cursor="pointer"
                    bg={expanded ? "bg.subtle" : undefined}
                  >
                    <Table.Cell fontFamily="mono" fontSize="xs">
                      {row.id}
                      {row.slow ? (
                        <Badge ml={1} colorPalette="yellow" variant="subtle">
                          slow
                        </Badge>
                      ) : null}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="fg.subtle">
                      {caseEntry
                        ? [caseEntry.set, caseEntry.group, caseEntry.difficulty]
                            .filter(Boolean)
                            .join(" · ")
                        : "stale"}
                    </Table.Cell>
                    <Table.Cell>
                      <VerdictChip verdict={verdict} />
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap={1} wrap="wrap">
                        {failures.slice(0, 4).map((check) => (
                          <Badge
                            key={check}
                            colorPalette="red"
                            variant="outline"
                            fontSize="2xs"
                          >
                            {check}
                          </Badge>
                        ))}
                        {failures.length > 4 ? (
                          <Badge
                            colorPalette="red"
                            variant="subtle"
                            fontSize="2xs"
                          >
                            +{failures.length - 4}
                          </Badge>
                        ) : null}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell textAlign="end" fontSize="xs">
                      {fmtLatency(row.latencyS)}
                    </Table.Cell>
                    <Table.Cell>
                      {row.traceUrl ? (
                        <ChakraLink
                          href={row.traceUrl}
                          target="_blank"
                          rel="noreferrer"
                          fontSize="xs"
                          onClick={(event) => event.stopPropagation()}
                        >
                          open <ArrowSquareOutIcon size={12} />
                        </ChakraLink>
                      ) : null}
                    </Table.Cell>
                  </Table.Row>,
                  expanded ? (
                    <Table.Row key={`${row.uid}-detail`}>
                      <Table.Cell colSpan={6} p={2}>
                        <RowDetail row={row} caseEntry={caseEntry} />
                      </Table.Cell>
                    </Table.Row>
                  ) : null,
                ];
              })}
            </Table.Body>
          </Table.Root>
        </ChartCard>
      ) : null}
    </Flex>
  );
}
