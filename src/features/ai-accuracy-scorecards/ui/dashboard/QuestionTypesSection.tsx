import { useMemo, useState, type Ref } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { Swatch } from "@/src/shared/ui/Swatch";
import { checkLabel } from "../../model/checks";
import { ATTRIBUTION_ORDER, STAGE_LABELS } from "../../model/config";
import type {
  AttributionKey,
  BenchmarkPage,
  GroupStats,
  MeasuredType,
} from "../../model/types";
import { failurePhrase } from "../../lib/failures";
import { pct } from "../../lib/format";
import { tierLines } from "../../lib/tiers";
import { PASS_COLOR, STAGE_COLORS } from "../palette";
import {
  DIMMED,
  FADE,
  MOTION_SAFE,
  TipKey,
  TipNote,
  TipRule,
  TipValue,
  useChartHover,
  type ChartHover,
} from "../chart-hover";
import {
  Caption,
  DetailPanel,
  Legend,
  ReliabilitySentence,
  Section,
  Segmented,
  SelectableRow,
  TierBar,
  TierFacts,
  TierLegend,
  useRowSelection,
} from "../parts";

type BarView = "rate" | "modes";

const BAR_VIEWS: readonly (readonly [BarView, string])[] = [
  ["rate", "Pass rate"],
  ["modes", "Where it failed"],
];

type ModeKey = "pass" | AttributionKey;

/** Accurate answers and each failure stage, for the "Where it failed" bars. */
const MODES: readonly {
  readonly key: ModeKey;
  readonly label: string;
  readonly color: string;
}[] = [
  { key: "pass", label: "Accurate", color: PASS_COLOR },
  ...ATTRIBUTION_ORDER.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    color: STAGE_COLORS[key],
  })),
];

/** A mode's count across every measured type, for scale in its tooltip. */
function modeTotals(types: readonly MeasuredType[]): Record<ModeKey, number> {
  return Object.fromEntries(
    MODES.map((m) => [
      m.key,
      types.reduce(
        (sum, t) =>
          sum +
          (m.key === "pass" ? t.stats.passed : t.stats.failureModes[m.key]),
        0
      ),
    ])
  ) as Record<ModeKey, number>;
}

function ModeTip({
  t,
  mode,
  count,
  total,
}: {
  readonly t: MeasuredType;
  readonly mode: (typeof MODES)[number];
  readonly count: number;
  readonly total: number;
}) {
  const pass = mode.key === "pass";
  return (
    <>
      <TipValue>
        {count} of {t.stats.scored} · {pct(count / t.stats.scored, 1)}
      </TipValue>
      <TipKey color={mode.color}>
        {t.label}:{" "}
        {pass
          ? "accurate at least most of the time"
          : `failed first at ${mode.label.toLowerCase()}`}
      </TipKey>
      <TipRule />
      <TipNote>
        {pass
          ? `${total} accurate across all types`
          : `${total} ${mode.label.toLowerCase()} failures across all types`}
      </TipNote>
    </>
  );
}

/** Accurate answers and each failure stage of a type as one bar. Hovering
 * a segment lights that stage in every row. The bar sits inside a row
 * button, which carries the same facts as its label, so it takes no
 * focus. */
function ModesBar({
  t,
  hover,
  totals,
}: {
  readonly t: MeasuredType;
  readonly hover: ChartHover<ModeKey>;
  readonly totals: Readonly<Record<ModeKey, number>>;
}) {
  const counts: Record<ModeKey, number> = {
    pass: t.stats.passed,
    ...t.stats.failureModes,
  };
  const segments = MODES.filter((m) => counts[m.key] > 0);
  return (
    <Flex
      h="22px"
      borderRadius="4px"
      overflow="hidden"
      gap="1px"
      aria-hidden
      w="100%"
      css={MOTION_SAFE}
    >
      {segments.map((m) => (
        <Flex
          key={m.key}
          flex={`${counts[m.key]} 1 0`}
          bg={m.color}
          color="white"
          fontSize="2xs"
          fontWeight="semibold"
          align="center"
          justify="center"
          minW="3px"
          opacity={hover.dimmed(m.key) ? DIMMED : 1}
          transition={FADE}
          {...hover.target(
            m.key,
            <ModeTip
              t={t}
              mode={m}
              count={counts[m.key]}
              total={totals[m.key]}
            />
          )}
        >
          {counts[m.key] >= 2 ? counts[m.key] : null}
        </Flex>
      ))}
    </Flex>
  );
}

function TypeDetail({
  t,
  detailRef,
}: {
  readonly t: MeasuredType;
  readonly detailRef: Ref<HTMLDivElement>;
}) {
  return (
    <DetailPanel ref={detailRef}>
      <Caption>
        If a user asks a question like this, how likely are they to be misled?
      </Caption>
      <Box mt={2}>
        <ReliabilitySentence
          subject={
            <>
              <b>{t.label.toLowerCase()}</b> questions ({t.description})
            </>
          }
          stats={t.stats}
        />
      </Box>
      <Grid
        mt={3}
        gap={5}
        templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
        fontSize="sm"
        color="fg.muted"
      >
        <Box minW={0}>
          <Caption>Got right</Caption>
          <Text>
            {t.examplePass ? (
              <>&ldquo;{t.examplePass}&rdquo;</>
            ) : (
              "None in this run."
            )}
          </Text>
        </Box>
        <Box minW={0}>
          <Caption>Got wrong</Caption>
          {t.exampleFail ? (
            <Text>
              &ldquo;{t.exampleFail.query}&rdquo;
              <br />
              Failed: {t.exampleFail.failedChecks.map(checkLabel).join("; ")}
            </Text>
          ) : (
            <Text>None in this run.</Text>
          )}
        </Box>
      </Grid>
      <Flex mt={4} gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
        <TierFacts stats={t.stats} />
        {t.stats.failed ? (
          <Text as="span">
            Failed: <b>{failurePhrase(t.stats)}</b>
          </Text>
        ) : null}
      </Flex>
    </DetailPanel>
  );
}

function rowValue(view: BarView, stats: GroupStats): string {
  return view === "rate" ? pct(stats.everyTime) : pct(stats.majority);
}

export function QuestionTypesSection({
  page,
}: {
  readonly page: BenchmarkPage;
}) {
  const [view, setView] = useState<BarView>("rate");
  const { selected, select, detailRef } = useRowSelection(page.types);
  const hover = useChartHover<ModeKey>();
  const totals = useMemo(() => modeTotals(page.types), [page.types]);
  if (!selected) return null;
  return (
    <Section
      id="types"
      title="Accuracy by question type"
      sub="Each question type has its own definition of a right answer. Select a type for examples."
      action={
        <Segmented
          label="Bar view"
          options={BAR_VIEWS}
          value={view}
          onChange={setView}
        />
      }
    >
      <TypeDetail t={selected} detailRef={detailRef} />
      <Box mt={4} mb={2}>
        {view === "rate" ? (
          <TierLegend />
        ) : (
          <Legend
            hover={hover}
            items={MODES.map((m) => ({
              key: m.key,
              label: m.label,
              swatch: <Swatch color={m.color} width={10} height={10} />,
            }))}
          />
        )}
      </Box>
      <Box display="grid" gap={2}>
        {page.types.map((t) => (
          <SelectableRow
            key={t.key}
            selected={t.key === selected.key}
            onSelect={() => select(t.key)}
            ariaLabel={`${t.label}, ${t.stats.scored} questions: ${tierLines(t.stats).join(", ")}`}
            title={t.label}
            sub={`${t.description} · ${t.stats.scored}`}
            value={rowValue(view, t.stats)}
            caption={view === "rate" ? "every time" : "2 of 3 tries"}
          >
            {view === "rate" ? (
              <TierBar stats={t.stats} label={t.label} />
            ) : (
              <ModesBar t={t} hover={hover} totals={totals} />
            )}
          </SelectableRow>
        ))}
      </Box>
      {hover.tooltip}
      <Text mt={3} fontSize="xs" color="fg.subtle">
        Types with fewer than 20 questions can swing a lot between runs.
        {page.unmeasuredTypes.length
          ? ` Not yet measured: ${page.unmeasuredTypes.map((t) => t.label.toLowerCase()).join(", ")}.`
          : ""}
      </Text>
    </Section>
  );
}
