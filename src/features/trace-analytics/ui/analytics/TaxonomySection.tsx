"use client";

import { useMemo, useState } from "react";
import { Box, Button, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import type { TaggedTrace } from "../../lib/analytics/taxonomy";
import {
  complexitySummary,
  continuationDistribution,
  flagDistribution,
  intentDistribution,
  languageReconciliation,
  prettyLabel,
  tagTraces,
  topicCoarseDistribution,
  turnRoleDistribution,
  type AxisCount,
} from "../../lib/analytics/taxonomy";
import { formatCount, formatPercent, languageName } from "../../lib/format";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { InfoCallout } from "../primitives/InfoCallout";
import { StatCards } from "../primitives/StatCards";
import { useOpenTracesInExplorer } from "../useOpenTracesInExplorer";

interface TaxonomySectionProps {
  /**
   * Raw, pre-language-merge trace rows (server `language` nulls preserved) so
   * the language axis can compare the API value against independent detection.
   */
  readonly rows: readonly TraceRow[];
}

function toBars(counts: readonly AxisCount[]): AxisCount[] {
  return counts.map((c) => ({ label: prettyLabel(c.label), count: c.count }));
}

type Scope = "organic" | "all";

export function TaxonomySection({ rows }: TaxonomySectionProps) {
  // Tag once; the toggles below only change how the tags are aggregated.
  const tagged = useMemo<TaggedTrace[]>(() => tagTraces(rows), [rows]);

  const [scope, setScope] = useState<Scope>("organic");
  const [langMode, setLangMode] = useState<"api" | "refined">("refined");
  const organic = scope === "organic";
  const openTraces = useOpenTracesInExplorer();
  const scopeTag = organic ? "organic" : "all traffic";
  const pool = useMemo(
    () => (organic ? tagged.filter((t) => t.flag === "organic") : tagged),
    [tagged, organic]
  );

  /**
   * Click handler factory for one taxonomy axis. Charts display prettified
   * labels, so `byPretty` maps them back to the raw code before matching;
   * axes whose labels are already raw (topics) pass an empty map.
   */
  function axisClick(
    axis: string,
    byPretty: ReadonlyMap<string, string>,
    match: (t: TaggedTrace, raw: string) => boolean,
    opts: {
      readonly source?: readonly TaggedTrace[];
      readonly note?: string;
    } = {}
  ): (datum: { label: string }) => void {
    return (datum) => {
      const raw = byPretty.get(datum.label) ?? datum.label;
      openTraces(
        `${axis} = ${datum.label} (${opts.note ?? scopeTag})`,
        (opts.source ?? pool).filter((t) => match(t, raw)).map((t) => t.row)
      );
    };
  }

  /** pretty label -> raw code, for reversing chart labels on click. */
  const byPretty = (counts: readonly AxisCount[]) =>
    new Map(counts.map((c) => [prettyLabel(c.label), c.label]));

  const flags = useMemo(() => flagDistribution(tagged), [tagged]);
  const intents = useMemo(
    () => intentDistribution(tagged, { organic }),
    [tagged, organic]
  );
  const topics = useMemo(
    () => topicCoarseDistribution(tagged, { organic }),
    [tagged, organic]
  );
  const turnRoles = useMemo(
    () => turnRoleDistribution(tagged, { organic }),
    [tagged, organic]
  );
  const continuation = useMemo(
    () => continuationDistribution(tagged, { organic }),
    [tagged, organic]
  );
  const cx = useMemo(
    () => complexitySummary(tagged, { organic }),
    [tagged, organic]
  );
  const lang = useMemo(() => languageReconciliation(tagged), [tagged]);
  const langCounts =
    langMode === "refined" ? lang.finalCounts : lang.systemCounts;

  const total = tagged.length;
  const organicCount = useMemo(
    () => tagged.filter((t) => t.flag === "organic").length,
    [tagged]
  );
  const substantive = intents.reduce((a, b) => a + b.count, 0);

  const headline = [
    {
      label: "Turns tagged",
      value: formatCount(total),
      hint: "All traces in the filtered window",
    },
    {
      label: "Organic",
      value: formatCount(organicCount),
      hint: total
        ? `${formatPercent(organicCount / total, 0)} · real user prompts`
        : undefined,
    },
    {
      label: `Substantive (${organic ? "organic" : "all"})`,
      value: formatCount(substantive),
      hint: "Turns with an analytical intent",
    },
    {
      label: "Mean complexity",
      value: cx.mean === null ? "—" : cx.mean.toFixed(2),
      hint: `0–10 constraint count (${organic ? "organic" : "all"})`,
    },
  ];

  return (
    <Box>
      <Heading as="h3" size="md" mb={3}>
        Prompt Taxonomy
      </Heading>
      <Flex direction="column" gap={3}>
        <InfoCallout title="What is the prompt taxonomy?">
          <Text mb={2}>
            Every turn is classified on five axes plus a complexity score by a
            deterministic rule tagger (ported from the GNW taxonomy project) —
            no LLM and no server call, so the same window always yields the same
            numbers.
          </Text>
          <Text>
            These are a <b>derived view</b>: the trace data is never modified,
            and the categories will defer to a server-side taxonomy if one
            ships. The rules were tuned on a ~360-turn sample, so treat the
            figures as indicative and watch the <b>Other</b> intent and{" "}
            <b>Unclassified</b> topic shares on a fresh window — if either
            climbs, the data has surfaced patterns the rules do not cover.
          </Text>
        </InfoCallout>

        <Flex align="center" gap={2} wrap="wrap">
          <Text fontSize="xs" color="fg.muted">
            Population
          </Text>
          {(["organic", "all"] as const).map((s) => (
            <Button
              key={s}
              size="xs"
              variant={scope === s ? "solid" : "outline"}
              onClick={() => setScope(s)}
            >
              {s === "organic" ? "Organic only" : "All traffic"}
            </Button>
          ))}
          <Text fontSize="xs" color="fg.subtle">
            Excludes templated, test and system turns when set to organic. The
            cleaning breakdown below always shows all traffic.
          </Text>
        </Flex>

        <StatCards items={headline} columns={4} />

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Analytical intent"
            help="The single analytical goal of each substantive turn. Click a bar to open those traces."
            info="Intent is the review-heavy axis: precedence is load-bearing
              (comparison, trend, causal, monitoring, quantification, …) and
              'Spatial' is view-only. A rising 'Other' share means the rules are
              hitting prompts they cannot place — hand-check before quoting
              per-intent figures. Click any bar to inspect its traces in the
              Trace Explorer."
          >
            {intents.length ? (
              <HorizontalBarChart
                data={toBars(intents)}
                onBarClick={axisClick(
                  "Intent",
                  byPretty(intents),
                  (t, raw) => t.intent === raw
                )}
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No substantive turns in this window.
              </Text>
            )}
          </ChartCard>

          <ChartCard
            title="Topic (coarse)"
            help="Subject of the turn, rolled up. Turns can carry more than one topic, so occurrences can exceed the turn count. Click a bar to open those traces."
            info="Topics are tagged from the prompt text and carried across a
              session's continuation turns (topic inheritance). 'Unclassified'
              collects genuinely topic-free turns (confirmations, navigation)
              plus any subject the vocabulary misses. Click any bar to inspect
              its traces in the Trace Explorer."
          >
            {topics.length ? (
              <HorizontalBarChart
                data={topics.map((t) => ({ label: t.label, count: t.count }))}
                onBarClick={axisClick("Topic", new Map(), (t, raw) =>
                  t.topicCoarse.split("|").includes(raw)
                )}
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No topics in this window.
              </Text>
            )}
          </ChartCard>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Prompt complexity"
            help={`Constraint count per prompt (0–10), banded. Mean ${
              cx.mean === null ? "—" : cx.mean.toFixed(2)
            }.`}
            info="Complexity counts prompt-intrinsic constraints (area, time,
              metric, dataset named, comparison, aggregation, …). It is the
              interim per-type difficulty signal until graded accuracy exists.
              Click a slice to inspect its traces in the Trace Explorer."
          >
            {cx.bands.length ? (
              <DonutChart
                data={cx.bands.map((b) => ({
                  label: prettyLabel(b.label),
                  count: b.count,
                }))}
                centerLabel="turns"
                onSliceClick={(label) =>
                  axisClick(
                    "Complexity",
                    byPretty(cx.bands),
                    (t, raw) => t.cxBand === raw
                  )({ label })
                }
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No scored prompts in this window.
              </Text>
            )}
          </ChartCard>

          <ChartCard
            title="Turn role"
            help="What each turn is doing in the conversation."
            info="New queries vs refinements, confirmations, dataset
              disambiguation, insight/report operations and platform/meta
              questions. Non-analytical roles are gated to 'not applicable'
              intent by design. Click any bar to inspect its traces in the
              Trace Explorer."
          >
            {turnRoles.length ? (
              <HorizontalBarChart
                data={toBars(turnRoles)}
                onBarClick={axisClick(
                  "Turn role",
                  byPretty(turnRoles),
                  (t, raw) => t.turnRole === raw
                )}
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No turns in this window.
              </Text>
            )}
          </ChartCard>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="In-session behaviour"
            help="How later turns (after the first) relate to the conversation so far."
            info="Only turns at position > 0 are counted. A high 'Refinement'
              share means users iterate on an answer; 'New question' means they
              pivot within the same session. Click a slice to inspect its
              traces in the Trace Explorer."
          >
            {continuation.length ? (
              <DonutChart
                data={toBars(continuation)}
                centerLabel="turns"
                onSliceClick={(label) =>
                  axisClick(
                    "In-session behaviour",
                    byPretty(continuation),
                    (t, raw) => t.continuation === raw,
                    { source: pool.filter((t) => t.turnPos > 0) }
                  )({ label })
                }
              />
            ) : (
              <Text fontSize="sm" color="fg.muted">
                No in-session turns (every session is a single turn).
              </Text>
            )}
          </ChartCard>

          <ChartCard
            title="Traffic cleaning"
            help="Segments the raw traffic so non-organic turns can be excluded. Always shows all traffic."
            info="Organic = real user prompts (the population reported above).
              Templated = welcome 'Analyse X in Y' prompts. Internal/junk/system
              = test scaffolding, gibberish and platform-generated text. Null =
              empty prompts. Click a slice to inspect its traces in the Trace
              Explorer."
          >
            <DonutChart
              data={flags.map((f) => ({
                label: prettyLabel(f.label),
                count: f.count,
              }))}
              centerLabel="turns"
              onSliceClick={(label) =>
                axisClick(
                  "Traffic segment",
                  byPretty(flags),
                  (t, raw) => t.flag === raw,
                  { source: tagged, note: "all traffic" }
                )({ label })
              }
            />
          </ChartCard>
        </SimpleGrid>

        <ChartCard
          title="Prompt language"
          help="Reconciles the API's language field against independent detection."
          info="API shows the raw server language (blank on some turns). Refined
            keeps the server value where present, backfills blanks from
            detection, and flags disagreements for review — it never overwrites
            a server value. Soft-error detection is English-only, so a
            meaningful non-English share means non-English failures are
            undercounted elsewhere. Click any bar to inspect its traces in the
            Trace Explorer."
        >
          <Flex
            justify="space-between"
            align="center"
            gap={2}
            mb={1}
            wrap="wrap"
          >
            <Text fontSize="xs" color="fg.muted">
              {langMode === "refined"
                ? `Detection backfilled ${formatCount(lang.backfilled)} blank server value${
                    lang.backfilled === 1 ? "" : "s"
                  }; flagged ${formatCount(lang.disagreements)} disagreement${
                    lang.disagreements === 1 ? "" : "s"
                  } for review.`
                : "Raw server language field (organic turns; blanks omitted)."}
            </Text>
            <Flex gap={1}>
              {(["api", "refined"] as const).map((m) => (
                <Button
                  key={m}
                  size="xs"
                  variant={langMode === m ? "solid" : "outline"}
                  onClick={() => setLangMode(m)}
                >
                  {m === "api" ? "API" : "Refined"}
                </Button>
              ))}
            </Flex>
          </Flex>
          {langCounts.length ? (
            <HorizontalBarChart
              data={langCounts.map((l) => ({
                label: languageName(l.label),
                count: l.count,
              }))}
              onBarClick={axisClick(
                `Language (${langMode === "refined" ? "reconciled" : "API"})`,
                new Map(
                  langCounts.map((c) => [languageName(c.label), c.label])
                ),
                (t, raw) =>
                  (langMode === "refined" ? t.langFinal : t.langSystem) === raw,
                {
                  source: tagged.filter((t) => t.flag === "organic"),
                  note: "organic",
                }
              )}
            />
          ) : (
            <Text fontSize="sm" color="fg.muted">
              No language data in this window.
            </Text>
          )}
        </ChartCard>
      </Flex>
    </Box>
  );
}
