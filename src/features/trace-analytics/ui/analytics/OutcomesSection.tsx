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
import { computeDailyOutcomeMix } from "../../lib/analytics/daily";
import {
  computeErrorOverlap,
  USER_VISIBLE_OUTCOMES,
} from "../../lib/analytics/aggregations";
import {
  computeFailureFollowUps,
  computeOutcomeFlow,
  refineOutcomes,
  REFINED_LABELS,
  type FlowMode,
  type OutcomeOverrides,
  type RefinedOutcome,
} from "../../lib/analytics/outcomeRefine";
import {
  outcomeMixByDimension,
  prettyLabel,
  tagTraces,
  tracesForDimensionValue,
  type OutcomeMixDimension,
  type TaggedTrace,
} from "../../lib/analytics/taxonomy";
import {
  computeIntentTopicMatrix,
  tracesForIntentTopic,
} from "../../lib/analytics/intentTopicMatrix";
import { useOpenTracesInExplorer } from "../useOpenTracesInExplorer";
import { looksLikeRefusal } from "../../lib/analytics/refusalNeedles";
import { fetchTraceDetail } from "../../api/zeno";
import { AUDIT_MAX_TRACES } from "../../model/config";
import { formatCount, formatPercent, languageName } from "../../lib/format";
import {
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  OUTCOME_SEVERITY_ORDER,
  OUTCOME_STACK_ORDER,
  REFINED_OUTCOME_COLORS,
  REFINED_SEVERITY_ORDER,
  REFINED_STACK_ORDER,
} from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { DailyOutcomeAreaChart } from "../charts/DailyOutcomeAreaChart";
import { IntentTopicHeatmap } from "../charts/IntentTopicHeatmap";
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

/** Display labels for the "Outcome mix by …" dimension selector. */
const MIX_DIM_LABEL: Readonly<Record<OutcomeMixDimension, string>> = {
  topic: "Topic",
  intent: "Intent",
  language: "Language",
  turn: "Turn",
};

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
  /**
   * Always the per-turn rows, whatever grain `rows` is at: failure follow-ups
   * ("what did the user do next") are defined on turn sequences within a
   * conversation and would degenerate on conversation-aggregated rows.
   */
  readonly turnRows: readonly TraceRow[];
}

export function OutcomesSection({
  rows,
  prevRows,
  daily,
  turnRows,
}: OutcomesSectionProps) {
  const [mode, setMode] = useState<FlowMode>("refined");
  const [mixDim, setMixDim] = useState<OutcomeMixDimension>("topic");
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
  const followUps = useMemo(
    () => computeFailureFollowUps(turnRows),
    [turnRows]
  );
  // Tag once for the dimension-agnostic outcome mix (topic / intent / language
  // / turn). The `mode` toggle (shared with the Sankey) swaps the outcome
  // definition used by the mix and the daily chart between the raw API labels
  // and the locally refined ones; the audit overrides flow through both.
  const tagged = useMemo(() => tagTraces(rows), [rows]);
  const refinedByTrace = useMemo(
    () =>
      new Map(
        refineOutcomes(rows, overrides).map((r) => [r.row.traceId, r.refined])
      ),
    [rows, overrides]
  );
  const refined = mode === "refined";

  const outcomeMix = useMemo(() => {
    const labelMap: Readonly<Record<string, string>> = refined
      ? REFINED_LABELS
      : OUTCOME_LABELS;
    const outcomeOf = refined
      ? (t: { row: TraceRow }) => refinedByTrace.get(t.row.traceId)
      : undefined;
    // Charts show prettified labels; keep the raw dimension value so a
    // clicked segment can be mapped back to its traces.
    const rawByPretty = new Map<string, string>();
    const data = outcomeMixByDimension(tagged, mixDim, { outcomeOf }).map(
      (mix) => {
        const pretty =
          mixDim === "language"
            ? languageName(mix.label)
            : mixDim === "topic"
              ? mix.label
              : prettyLabel(mix.label);
        rawByPretty.set(pretty, mix.label);
        return {
          label: pretty,
          total: mix.total,
          counts: Object.fromEntries(
            Object.entries(mix.counts).map(([code, count]) => [
              labelMap[code] ?? code,
              count,
            ])
          ),
        };
      }
    );
    return { data, rawByPretty };
  }, [tagged, mixDim, refined, refinedByTrace]);
  const mixOrder = refined ? REFINED_SEVERITY_ORDER : OUTCOME_SEVERITY_ORDER;
  const mixColors = refined ? REFINED_OUTCOME_COLORS : OUTCOME_COLORS;

  // Intent × topic grid, scored on the mode's outcome definition. ANSWER_KEYS
  // holds both the API and the refined "attempted answer" codes (they never
  // collide), so the same success set serves both modes.
  const intentTopicMatrix = useMemo(() => {
    const outcomeOf = refined
      ? (t: TaggedTrace) => refinedByTrace.get(t.row.traceId)
      : undefined;
    return computeIntentTopicMatrix(tagged, {
      outcomeOf,
      successKeys: ANSWER_KEYS,
    });
  }, [tagged, refined, refinedByTrace]);

  const openTraces = useOpenTracesInExplorer();

  /** One intent × topic cell of the heatmap → its traces. */
  function handleHeatmapCellClick(intent: string, topic: string) {
    openTraces(
      `Intent = ${prettyLabel(intent)} × Topic = ${topic}`,
      tracesForIntentTopic(tagged, intent, topic).map((t) => t.row)
    );
  }

  /** Display label of a turn's outcome under the current API/Refined mode. */
  function outcomeLabelOf(t: TaggedTrace): string | null {
    if (refined) {
      const code = refinedByTrace.get(t.row.traceId);
      return code ? REFINED_LABELS[code] : null;
    }
    return t.row.outcome
      ? (OUTCOME_LABELS[t.row.outcome] ?? t.row.outcome)
      : null;
  }

  /** One cohort × outcome cell of the mix chart → its traces. */
  function handleMixSegmentClick(rowLabel: string, outcome: string) {
    const raw = outcomeMix.rawByPretty.get(rowLabel);
    if (!raw) return;
    const picked = tracesForDimensionValue(tagged, mixDim, raw).filter(
      (t) => outcomeLabelOf(t) === outcome
    );
    openTraces(
      `${MIX_DIM_LABEL[mixDim]} = ${rowLabel} · outcome ${outcome} (${
        refined ? "refined" : "API"
      })`,
      picked.map((t) => t.row)
    );
  }

  function handleDayClick(date: string) {
    openTraces(
      `All traces on ${date}`,
      rows.filter((r) => r.date === date)
    );
  }

  /** Slice predicates matching computeErrorOverlap's four categories. */
  const overlapPredicates: Readonly<Record<string, (r: TraceRow) => boolean>> =
    {
      "No errors": (r) =>
        !r.hasInternalError && !USER_VISIBLE_OUTCOMES.has(String(r.outcome)),
      "Internal only": (r) =>
        r.hasInternalError && !USER_VISIBLE_OUTCOMES.has(String(r.outcome)),
      "User-visible only": (r) =>
        !r.hasInternalError && USER_VISIBLE_OUTCOMES.has(String(r.outcome)),
      Both: (r) =>
        r.hasInternalError && USER_VISIBLE_OUTCOMES.has(String(r.outcome)),
    };

  const dailyMix = useMemo(() => {
    const labelOf = refined
      ? (row: TraceRow) => {
          const code = refinedByTrace.get(row.traceId);
          return code ? REFINED_LABELS[code] : null;
        }
      : (row: TraceRow) =>
          row.outcome ? (OUTCOME_LABELS[row.outcome] ?? row.outcome) : null;
    return computeDailyOutcomeMix(rows, labelOf);
  }, [rows, refined, refinedByTrace]);
  const dailyOrder = refined ? REFINED_STACK_ORDER : OUTCOME_STACK_ORDER;
  const dailyColors = refined ? REFINED_OUTCOME_COLORS : OUTCOME_COLORS;

  const modeToggle = (
    <Flex gap={1}>
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
          <Flex justify="flex-end" mb={1}>
            {modeToggle}
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
              help={`Share of each day's traces by outcome (${
                refined ? "refined" : "API"
              } labels).`}
              info="Each day stacks to 100%, so a shrinking green band is a rising
                failure rate even if absolute volume grew. Isolated bad days point at
                incidents; a persistent warm band points at a systemic issue. Toggle
                API/Refined to switch between the raw server outcome and the locally
                re-derived one. Click a day to open all of its traces in the Trace
                Explorer."
            >
              <Flex justify="flex-end" mb={1}>
                {modeToggle}
              </Flex>
              <DailyOutcomeAreaChart
                data={dailyMix}
                order={dailyOrder}
                colors={dailyColors}
                onDayClick={handleDayClick}
              />
            </ChartCard>
          ) : null}
          <ChartCard
            title={`Outcome mix by ${MIX_DIM_LABEL[mixDim].toLowerCase()}`}
            help="How turns end, split by the selected taxonomy dimension. Click a segment to open its traces."
            info="Bars are 100% stacked best→worst, so a shrinking green segment
              means a higher failure rate for that cohort. Topics are multi-tag,
              so a turn counts under each of its topics; intent covers
              substantive turns only; turn splits by the turn's role. For
              language, soft-error detection is English-only, so non-English
              failure is understated — use the refusal audit above. Small cohorts
              swing wildly; check the trace count in the tooltip. Toggle
              API/Refined to switch the outcome definition; both the dimensions
              and the refined outcomes are derived locally and never modify the
              trace. Click any segment to open exactly those traces (cohort ×
              outcome) in the Trace Explorer."
          >
            <Flex
              justify="space-between"
              align="center"
              gap={2}
              mb={1}
              wrap="wrap"
            >
              <Flex gap={1} wrap="wrap">
                {(["topic", "intent", "language", "turn"] as const).map((d) => (
                  <Button
                    key={d}
                    size="xs"
                    variant={mixDim === d ? "solid" : "outline"}
                    onClick={() => setMixDim(d)}
                  >
                    {MIX_DIM_LABEL[d]}
                  </Button>
                ))}
              </Flex>
              {modeToggle}
            </Flex>
            {outcomeMix.data.length ? (
              <OutcomeMixBars
                data={outcomeMix.data}
                order={mixOrder}
                colors={mixColors}
                onSegmentClick={handleMixSegmentClick}
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No {MIX_DIM_LABEL[mixDim].toLowerCase()} data in this window.
              </Text>
            )}
          </ChartCard>
        </SimpleGrid>

        <ChartCard
          title="Intent × topic"
          help="Three views of one grid: where prompts land, how well each cohort is answered, and where failed turns concentrate. Click a cell to open its traces."
          info="Volume paints each intent × topic cell by prompt count (or its
            share of all pairs). Quality recolours the identical grid by the
            share of attempted answers, as distance from the window average —
            amber below, blue above; cells with too few resolved outcomes are
            greyed rather than shown as noise. Impact multiplies the two:
            failed turns per cell, either in absolute terms (where users feel
            the most pain) or as the shortfall vs the average (what would
            improve fastest if fixed). Rows and columns keep one order across
            views, so a dark Volume cell that turns amber in Quality is a
            high-volume, underperforming cohort. Topics are multi-tag, so a
            turn counts under each of its topics; intent covers substantive
            turns only. Toggle API/Refined to switch the outcome definition.
            Click any cell to open exactly those traces in the Trace Explorer."
        >
          {intentTopicMatrix.intents.length ? (
            <IntentTopicHeatmap
              matrix={intentTopicMatrix}
              successLabel={
                refined ? "attempted answers" : "successful answers"
              }
              actions={modeToggle}
              onCellClick={handleHeatmapCellClick}
            />
          ) : (
            <Text fontSize="sm" color="fg.muted">
              No substantive turns in this window.
            </Text>
          )}
        </ChartCard>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Internal errors"
            help="Traces where any tool or API call failed internally. Click a slice to open those traces."
            info="Internal errors are failures inside the agent's tool calls — the
              user may never see them if the agent recovers. This is the raw rate
              before recovery. Click a slice to inspect its traces in the Trace
              Explorer."
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
              onSliceClick={(label) =>
                openTraces(
                  label,
                  rows.filter(
                    (r) => (label === "Internal error") === r.hasInternalError
                  )
                )
              }
            />
          </ChartCard>
          <ChartCard
            title="Internal vs user-visible overlap"
            help="How internal failures relate to what users actually saw. Click a slice to open those traces."
            info="Internal only (amber) = the agent hit a tool error but recovered —
              invisible to the user, still worth fixing. User-visible only (red) =
              the user saw a failure with no internal error logged, usually a
              generation problem. Both (dark red) = a tool error surfaced all the
              way to the user. Click a slice to inspect its traces in the Trace
              Explorer."
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
              onSliceClick={(label) => {
                const predicate = overlapPredicates[label];
                if (predicate) {
                  openTraces(`Error overlap: ${label}`, rows.filter(predicate));
                }
              }}
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
