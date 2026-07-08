"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import type { DailyMetrics } from "../../lib/analytics/daily";
import { computeErrorOverlap } from "../../lib/analytics/aggregations";
import {
  computeFailureFollowUps,
  computeOutcomeFlow,
  refineOutcomes,
  type FlowMode,
  type OutcomeOverrides,
  type RefinedOutcome,
} from "../../lib/analytics/outcomeRefine";
import { computeOutcomeMixByLanguage } from "../../lib/analytics/language";
import { looksLikeRefusal } from "../../lib/analytics/refusalNeedles";
import { fetchTraceDetail } from "../../api/zeno";
import { AUDIT_MAX_TRACES } from "../../model/config";
import { formatCount, formatPercent, languageName } from "../../lib/format";
import { OUTCOME_LABELS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { DailyOutcomeAreaChart } from "../charts/DailyOutcomeAreaChart";
import { OutcomeMixBars } from "../charts/OutcomeMixBars";
import { OutcomeSankey } from "../charts/OutcomeSankey";
import { Expander } from "../primitives/Expander";
import { InfoCallout } from "../primitives/InfoCallout";
import { InlineAlert } from "../primitives/InlineAlert";
import { StatCards } from "../primitives/StatCards";

/**
 * Mirrors derive_outcome() in project-zeno
 * (src/api/services/langfuse/parse.py); rules apply top to bottom.
 */
const OUTCOME_RULES = [
  [
    "Empty",
    "No AI message in the turn at all (crash, timeout, dropped request)",
  ],
  ["Error", "The turn has an AI message but its final answer text is empty"],
  [
    "Soft error",
    "Answer contains refusal/apology phrases (“I can't”, “I'm sorry”, “unable to”…) — English-only heuristic",
  ],
  [
    "Defer",
    "Non-empty answer but the turn used no tools — clarification requests, but also chitchat and answers served from earlier context",
  ],
  ["Success", "Non-empty answer and the turn made at least one tool call"],
] as const;

/** Neutral / warning / serious / critical steps for the error-overlap donuts. */
const OVERLAP_COLORS = {
  none: "#CDD2D8",
  internalOnly: "#D97D05",
  userVisibleOnly: "#E23A22",
  both: "#8C2332",
} as const;

const ANSWER_KEYS = new Set(["ANSWER", "ANSWER_CLEAN", "ANSWER_DEGRADED"]);
const AUDIT_CONCURRENCY = 4;

interface AuditState {
  readonly status: "idle" | "running" | "done";
  readonly done: number;
  readonly total: number;
  readonly flagged: number;
  readonly failed: number;
}

const AUDIT_IDLE: AuditState = {
  status: "idle",
  done: 0,
  total: 0,
  flagged: 0,
  failed: 0,
};

interface OutcomesSectionProps {
  readonly rows: readonly TraceRow[];
  readonly prevRows: readonly TraceRow[] | null;
  readonly daily: readonly DailyMetrics[];
}

export function OutcomesSection({
  rows,
  prevRows,
  daily,
}: OutcomesSectionProps) {
  const [mode, setMode] = useState<FlowMode>("refined");
  const [overrides, setOverrides] = useState<OutcomeOverrides>(new Map());
  const [audit, setAudit] = useState<AuditState>(AUDIT_IDLE);
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Reset audit results when the underlying window changes.
  useEffect(() => {
    setOverrides(new Map());
    setAudit(AUDIT_IDLE);
  }, [rows]);

  const flow = useMemo(
    () => computeOutcomeFlow(rows, prevRows, mode, overrides),
    [rows, prevRows, mode, overrides]
  );
  const overlap = useMemo(() => computeErrorOverlap(rows), [rows]);
  const followUps = useMemo(() => computeFailureFollowUps(rows), [rows]);
  const languageMix = useMemo(
    () =>
      computeOutcomeMixByLanguage(rows).map((mix) => ({
        label: languageName(mix.label),
        total: mix.total,
        counts: Object.fromEntries(
          Object.entries(mix.counts).map(([outcome, count]) => [
            OUTCOME_LABELS[outcome] ?? outcome,
            count,
          ])
        ),
      })),
    [rows]
  );
  // Audit candidates come from the un-overridden refinement so the count
  // stays stable after reclassification.
  const auditCandidates = useMemo(
    () =>
      refineOutcomes(rows)
        .filter((r) => r.lowConfidence)
        .map((r) => r.row.traceId),
    [rows]
  );

  async function runAudit() {
    const ids = auditCandidates.slice(0, AUDIT_MAX_TRACES);
    setAudit({
      status: "running",
      done: 0,
      total: ids.length,
      flagged: 0,
      failed: 0,
    });
    const found = new Map<string, RefinedOutcome>(overrides);
    const queue = [...ids];
    let done = 0;
    let flagged = 0;
    let failed = 0;

    const worker = async () => {
      for (;;) {
        const id = queue.shift();
        if (!id || cancelled.current) return;
        try {
          const detail = await fetchTraceDetail(id);
          if (looksLikeRefusal(detail.answer).matched) {
            found.set(id, "SOFT_ERROR");
            flagged += 1;
          }
        } catch {
          failed += 1;
        }
        done += 1;
        setAudit((prev) => ({ ...prev, done, flagged, failed }));
      }
    };
    await Promise.all(
      Array.from({ length: AUDIT_CONCURRENCY }, () => worker())
    );
    if (cancelled.current) return;
    setOverrides(found);
    setAudit({ status: "done", done, total: ids.length, flagged, failed });
  }

  const attempted = flow.viaResponse
    .filter((t) => ANSWER_KEYS.has(t.key))
    .reduce((acc, t) => acc + t.count, 0);
  const headline = flow.total
    ? `${formatPercent(flow.respondedShare, 0)} of queries get a response back; ${formatPercent(
        attempted / flow.total,
        0
      )} are attempted answers.`
    : "";

  return (
    <Box>
      <Heading as="h3" size="md" mb={3}>
        Outcomes
      </Heading>
      <Flex direction="column" gap={3}>
        <InfoCallout title="What do the outcome categories mean?">
          <Table.Root size="sm" bg="transparent">
            <Table.Header>
              <Table.Row bg="transparent">
                <Table.ColumnHeader>Outcome</Table.ColumnHeader>
                <Table.ColumnHeader>Rule</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {OUTCOME_RULES.map(([outcome, rule]) => (
                <Table.Row key={outcome} bg="transparent">
                  <Table.Cell fontWeight="medium">{outcome}</Table.Cell>
                  <Table.Cell>{rule}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Text fontSize="xs" color="fg.muted" mt={2}>
            The <b>Refined</b> view re-derives these locally from signals the
            API already exposes: successes that recovered from internal tool
            errors, no-tool answers served from earlier turns&apos; results
            (thread context), UI-event turns without a prompt, and suspected
            timeouts. The API labels themselves are never modified — refined
            numbers are a derived view, and will defer to the server&apos;s
            richer taxonomy once it ships.
          </Text>
        </InfoCallout>

        <ChartCard
          title={`What happens to ${formatCount(flow.total)} user queries`}
          help={headline}
          info="Follow the flow left to right: queries either fail before the
            user sees anything (hard error) or produce a response, which splits
            into refusals, clarifications and genuine attempted answers. Δ
            chips compare each share against the previous window in percentage
            points. Toggle API to see the raw server labels; Refined re-groups
            them with the local corrections."
        >
          <Flex justify="flex-end" gap={1} mb={1}>
            {(["api", "refined"] as const).map((m) => (
              <Button
                key={m}
                size="xs"
                variant={mode === m ? "solid" : "outline"}
                onClick={() => setMode(m)}
              >
                {m === "api" ? "API" : "Refined"}
              </Button>
            ))}
          </Flex>
          <OutcomeSankey flow={flow} />
          {auditCandidates.length ? (
            <Flex align="center" gap={3} mt={2} wrap="wrap">
              <Text fontSize="xs" color="fg.muted">
                {formatCount(auditCandidates.length)} non-English defer
                {auditCandidates.length === 1 ? "" : "s"} could be refusals the
                English-only heuristic missed.
                {auditCandidates.length > AUDIT_MAX_TRACES
                  ? ` Auditing checks the first ${formatCount(AUDIT_MAX_TRACES)}.`
                  : ""}
              </Text>
              {audit.status === "running" ? (
                <Flex align="center" gap={2}>
                  <Spinner size="xs" />
                  <Text fontSize="xs" color="fg.muted">
                    Checking answers… {audit.done}/{audit.total}
                  </Text>
                </Flex>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => void runAudit()}
                >
                  Audit answers
                </Button>
              )}
            </Flex>
          ) : null}
          {audit.status === "done" ? (
            <Box mt={2}>
              <InlineAlert
                status={audit.flagged ? "warning" : "success"}
                message={`${formatCount(audit.flagged)} of ${formatCount(audit.total)} audited answers match multilingual refusal phrases${
                  audit.flagged
                    ? " — reclassified as Soft error in the Refined view."
                    : "."
                }${audit.failed ? ` ${formatCount(audit.failed)} trace(s) could not be fetched.` : ""}`}
              />
            </Box>
          ) : null}
        </ChartCard>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          {daily.length ? (
            <ChartCard
              title="Daily outcomes"
              help="Share of each day's traces by outcome (API labels)."
              info="Each day stacks to 100%, so a shrinking green band is a rising
                failure rate even if absolute volume grew. Isolated bad days point at
                incidents; a persistent warm band points at a systemic issue."
            >
              <DailyOutcomeAreaChart data={daily} />
            </ChartCard>
          ) : null}
          {languageMix.length >= 2 ? (
            <ChartCard
              title="Outcome mix by language"
              help="How turns end, split by detected prompt language."
              info="Soft errors are detected with English-only phrases, so
                non-English failure rates are understated by construction — treat a
                clean-looking non-English row with suspicion and use the refusal
                audit above. Small totals swing wildly; check the trace count in the
                tooltip."
            >
              <OutcomeMixBars data={languageMix} />
            </ChartCard>
          ) : null}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Internal errors"
            help="Traces where any tool or API call failed internally."
            info="Internal errors are failures inside the agent's tool calls — the
              user may never see them if the agent recovers. This is the raw rate
              before recovery."
          >
            <DonutChart
              data={[
                {
                  label: "No internal error",
                  count: overlap.total - overlap.internalErrors,
                },
                { label: "Internal error", count: overlap.internalErrors },
              ]}
              colors={{
                "No internal error": OVERLAP_COLORS.none,
                "Internal error": OVERLAP_COLORS.userVisibleOnly,
              }}
              centerLabel="traces"
            />
          </ChartCard>
          <ChartCard
            title="Internal vs user-visible overlap"
            help="How internal failures relate to what users actually saw."
            info="Internal only (amber) = the agent hit a tool error but recovered —
              invisible to the user, still worth fixing. User-visible only (red) =
              the user saw a failure with no internal error logged, usually a
              generation problem. Both (dark red) = a tool error surfaced all the
              way to the user."
          >
            <DonutChart
              data={[
                { label: "No errors", count: overlap.noErrors },
                { label: "Internal only", count: overlap.internalOnly },
                { label: "User-visible only", count: overlap.userVisibleOnly },
                { label: "Both", count: overlap.both },
              ]}
              colors={{
                "No errors": OVERLAP_COLORS.none,
                "Internal only": OVERLAP_COLORS.internalOnly,
                "User-visible only": OVERLAP_COLORS.userVisibleOnly,
                Both: OVERLAP_COLORS.both,
              }}
              centerLabel="traces"
            />
          </ChartCard>
        </SimpleGrid>

        <Expander title="Error metrics">
          <StatCards
            items={[
              {
                label: "Internal errors",
                value: formatCount(overlap.internalErrors),
                hint: formatPercent(
                  overlap.internalErrors / Math.max(1, overlap.total)
                ),
              },
              {
                label: "User-visible errors",
                value: formatCount(overlap.userVisibleErrors),
                hint: formatPercent(
                  overlap.userVisibleErrors / Math.max(1, overlap.total)
                ),
              },
              {
                label: "Agent recovered",
                value: formatCount(overlap.recovered),
              },
              {
                label: "Failure → user retried",
                value: formatCount(followUps.retriedSamePrompt),
                hint: `of ${formatCount(followUps.failures)} failures`,
              },
              {
                label: "Failure ended session",
                value: formatCount(followUps.endedSession),
                hint: `of ${formatCount(followUps.failures)} failures`,
              },
            ]}
            columns={5}
          />
        </Expander>
      </Flex>
    </Box>
  );
}
