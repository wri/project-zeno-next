import { useState } from "react";
import {
  chakra,
  Box,
  Flex,
  Grid,
  Link as ChakraLink,
  NativeSelect,
  Text,
} from "@chakra-ui/react";
import { Link } from "@/src/shared/lib/router";
import { ATTRIBUTION_ORDER, STAGE_LABELS } from "../../model/config";
import type { BenchmarkPage, Count, UseCaseResult } from "../../model/types";
import { pct } from "../../lib/format";
import { mixSentence } from "../../lib/mix";
import { Section, TierBar, TierFacts, TierLegend, tierSummary } from "../parts";

function bySize(a: UseCaseResult, b: UseCaseResult): number {
  return b.stats.scored + b.stats.errors - (a.stats.scored + a.stats.errors);
}

function failureSummary(uc: UseCaseResult): string {
  const fails = uc.stats.scored - uc.stats.passed;
  const stages = ATTRIBUTION_ORDER.filter((k) => uc.stats.failureModes[k]);
  if (!fails || !stages.length) return "";
  if (fails === 1) {
    return ` The 1 wrong answer failed at ${STAGE_LABELS[stages[0]].toLowerCase()}.`;
  }
  const parts = stages.map(
    (k) => `${uc.stats.failureModes[k]} at ${STAGE_LABELS[k].toLowerCase()}`
  );
  return ` Of the ${fails} wrong answers: ${parts.join(", ")}.`;
}

function CountBars({
  title,
  counts,
  total,
  label = (k) => k,
}: {
  readonly title: string;
  readonly counts: readonly Count[];
  readonly total: number;
  readonly label?: (key: string) => string;
}) {
  return (
    <Box minW={0}>
      <Text
        fontFamily="mono"
        fontSize="xs"
        color="fg.subtle"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={2}
      >
        {title}
      </Text>
      <Box display="grid" gap={1.5}>
        {counts.map((c) => (
          <Grid
            key={c.key}
            templateColumns="minmax(0, 9rem) minmax(0, 1fr) 2.5rem"
            gap={2}
            alignItems="center"
            fontSize="xs"
          >
            <Text truncate title={label(c.key)}>
              {label(c.key)}
            </Text>
            <Box h="6px" bg="bg.muted" borderRadius="full" overflow="hidden">
              <Box
                h="100%"
                bg="primary.solid"
                w={`${total ? (c.count / total) * 100 : 0}%`}
              />
            </Box>
            <Text textAlign="right" fontVariantNumeric="tabular-nums">
              {c.count}
            </Text>
          </Grid>
        ))}
      </Box>
    </Box>
  );
}

function UseCaseDetail({
  uc,
  all,
  typeLabels,
  onPick,
  questionsHref,
}: {
  readonly uc: UseCaseResult;
  readonly all: readonly UseCaseResult[];
  readonly typeLabels: Readonly<Record<string, string>>;
  readonly onPick: (key: string) => void;
  readonly questionsHref: (key: string) => string;
}) {
  const total = uc.stats.scored + uc.stats.errors;
  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      bg="bg.panel"
      p={{ base: 4, md: 5 }}
      aria-live="polite"
    >
      <Flex align="center" gap={3} wrap="wrap" mb={3}>
        <chakra.label htmlFor="uc-pick" fontSize="sm" color="fg.muted">
          Showing
        </chakra.label>
        <NativeSelect.Root size="sm" width="auto" minW="16rem">
          <NativeSelect.Field
            id="uc-pick"
            value={uc.key}
            onChange={(e) => onPick(e.target.value)}
          >
            {all.map((u) => (
              <option key={u.key} value={u.key}>
                {u.key}: {u.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Text fontSize="sm" color="fg.subtle">
          {total} questions
        </Text>
      </Flex>
      <Text fontSize="lg">
        For <b>{uc.label}</b>, users can expect an accurate answer every time on{" "}
        <b>{pct(uc.stats.everyTime)} of questions</b>, and at least most of the
        time on {pct(uc.stats.majority)}.
      </Text>
      <Text fontSize="sm" color="fg.muted" mt={1}>
        {mixSentence(uc, typeLabels)}
        {failureSummary(uc)}
      </Text>
      <Grid
        mt={4}
        gap={5}
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
      >
        <CountBars
          title="Question types"
          counts={uc.composition.types}
          total={total}
          label={(k) => typeLabels[k] ?? k}
        />
        <CountBars
          title="Kinds of place"
          counts={uc.composition.places}
          total={total}
        />
        <CountBars
          title="Top datasets"
          counts={uc.composition.datasets}
          total={total}
        />
      </Grid>
      <Flex mt={4} gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
        <TierFacts stats={uc.stats} />
        {uc.composition.synthetic ? (
          <Text as="span">
            Synthetic (from user stories) <b>{uc.composition.synthetic}</b>
          </Text>
        ) : null}
        {uc.stats.errors ? (
          <Text as="span">
            Errored <b>{uc.stats.errors}</b>
          </Text>
        ) : null}
        <ChakraLink asChild color="primary.solid">
          <Link href={questionsHref(uc.key)}>
            See these {total} questions in All questions →
          </Link>
        </ChakraLink>
      </Flex>
    </Box>
  );
}

export function UseCasesSection({
  page,
  questionsHref,
}: {
  readonly page: BenchmarkPage;
  readonly questionsHref: (useCase: string) => string;
}) {
  const ordered = [...page.useCases].sort(bySize);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = ordered.find((u) => u.key === selectedKey) ?? ordered[0];
  const typeLabels = Object.fromEntries(
    page.types.map((t) => [t.key, t.label])
  );
  if (!selected) return null;
  return (
    <Section
      id="usecases"
      eyebrow="Priority use cases"
      title="Accuracy by use case"
      sub={
        <>
          Results grouped by GNW&rsquo;s six <b>priority use cases</b>. A
          question can serve more than one use case. Each use case draws on its
          own mix of question types, places and datasets: select one to see it.
        </>
      }
    >
      <UseCaseDetail
        uc={selected}
        all={ordered}
        typeLabels={typeLabels}
        onPick={setSelectedKey}
        questionsHref={questionsHref}
      />
      <Box mt={4} mb={2}>
        <TierLegend />
      </Box>
      <Box display="grid" gap={2}>
        {ordered.map((uc) => {
          const total = uc.stats.scored + uc.stats.errors;
          const isSelected = uc.key === selected.key;
          return (
            <chakra.button
              key={uc.key}
              type="button"
              onClick={() => setSelectedKey(uc.key)}
              aria-pressed={isSelected}
              aria-label={`${uc.label}, ${total} questions: ${tierSummary(uc.stats)}`}
              display="grid"
              gridTemplateColumns={{
                base: "minmax(0, 1fr) 5rem",
                md: "minmax(0, 16rem) 6rem minmax(0, 1fr)",
              }}
              gap={{ base: 2, md: 4 }}
              alignItems="center"
              textAlign="left"
              cursor="pointer"
              p={3}
              borderWidth="1px"
              borderColor={isSelected ? "primary.solid" : "border"}
              borderRadius="md"
              bg={isSelected ? "bg.subtle" : "bg.panel"}
              _hover={{ borderColor: "primary.solid" }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "primary.solid",
                outlineOffset: "2px",
              }}
            >
              <Box minW={0}>
                <Text fontWeight="semibold" truncate>
                  {uc.label}
                </Text>
                <Text fontSize="xs" color="fg.subtle">
                  {uc.key} · {total} questions
                </Text>
              </Box>
              <Box textAlign={{ base: "right", md: "left" }}>
                <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {pct(uc.stats.everyTime)}
                </Text>
                <Text fontSize="xs" color="fg.subtle">
                  every time
                </Text>
              </Box>
              <Box gridColumn={{ base: "1 / -1", md: "auto" }} minW={0}>
                <TierBar stats={uc.stats} label={uc.label} decorative />
              </Box>
            </chakra.button>
          );
        })}
      </Box>
    </Section>
  );
}
