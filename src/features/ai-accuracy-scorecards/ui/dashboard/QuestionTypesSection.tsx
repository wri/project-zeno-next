import { useState, type Ref } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { Swatch } from "@/src/shared/ui/Swatch";
import { checkLabel } from "../../model/checks";
import { ATTRIBUTION_ORDER, STAGE_LABELS } from "../../model/config";
import type {
  BenchmarkPage,
  GroupStats,
  MeasuredType,
} from "../../model/types";
import { failureBreakdown, failurePhrase } from "../../lib/failures";
import { pct } from "../../lib/format";
import { tierLines } from "../../lib/tiers";
import { PASS_COLOR, STAGE_COLORS } from "../palette";
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

/** Accurate answers and each failure stage, for the "Where it failed" bars. */
const MODES = [
  { key: "pass", label: "Accurate", color: PASS_COLOR },
  ...ATTRIBUTION_ORDER.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    color: STAGE_COLORS[key],
  })),
];

function ModesBar({ t }: { readonly t: MeasuredType }) {
  const segments = [
    {
      key: "pass",
      label: "Accurate",
      count: t.stats.passed,
      color: PASS_COLOR,
    },
    ...failureBreakdown(t.stats).map((m) => ({
      ...m,
      color: STAGE_COLORS[m.key],
    })),
  ].filter((s) => s.count > 0);
  return (
    <Flex
      h="22px"
      borderRadius="4px"
      overflow="hidden"
      gap="1px"
      aria-hidden
      w="100%"
    >
      {segments.map((s) => (
        <Flex
          key={s.key}
          flex={`${s.count} 1 0`}
          bg={s.color}
          color="white"
          fontSize="2xs"
          fontWeight="semibold"
          align="center"
          justify="center"
          minW="3px"
          title={`${t.label} · ${s.label}: ${s.count} of ${t.stats.scored} questions${s.key === "pass" ? " answered accurately" : " failed here first"}`}
        >
          {s.count >= 2 ? s.count : null}
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
              <ModesBar t={t} />
            )}
          </SelectableRow>
        ))}
      </Box>
      <Text mt={3} fontSize="xs" color="fg.subtle">
        Types with fewer than 20 questions can swing a lot between runs.
        {page.unmeasuredTypes.length
          ? ` Not yet measured: ${page.unmeasuredTypes.map((t) => t.label.toLowerCase()).join(", ")}.`
          : ""}
      </Text>
    </Section>
  );
}
