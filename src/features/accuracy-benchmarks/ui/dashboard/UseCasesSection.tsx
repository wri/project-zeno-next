import { useRef, useState, type ReactNode, type Ref } from "react";
import {
  chakra,
  Box,
  Flex,
  Grid,
  HStack,
  Link as ChakraLink,
  NativeSelect,
  Text,
} from "@chakra-ui/react";
import { Link } from "@/src/shared/lib/router";
import { ATTRIBUTION_ORDER, STAGE_LABELS } from "../../model/config";
import type { BenchmarkPage, Count, UseCaseResult } from "../../model/types";
import { pct } from "../../lib/format";
import { mixSentence } from "../../lib/mix";
import {
  revealIfAbove,
  Section,
  TierBar,
  TierFacts,
  TierLegend,
  tierSummary,
} from "../parts";

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
  aside,
  counts,
  total,
  label = (k) => k,
}: {
  readonly title: string;
  readonly aside?: ReactNode;
  readonly counts: readonly Count[];
  readonly total: number;
  readonly label?: (key: string) => string;
}) {
  return (
    <Box minW={0}>
      <Flex mb={2} gap={2} justify="space-between" align="baseline" wrap="wrap">
        <Text
          fontFamily="mono"
          fontSize="xs"
          color="fg.subtle"
          textTransform="uppercase"
          letterSpacing="0.06em"
        >
          {title}
        </Text>
        {aside}
      </Flex>
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

/** Top question types and places of a use case as share chips. */
function MixChips({
  uc,
  typeLabels,
}: {
  readonly uc: UseCaseResult;
  readonly typeLabels: Readonly<Record<string, string>>;
}) {
  const total = uc.stats.scored + uc.stats.errors;
  const chips = [
    ...uc.composition.types
      .slice(0, 4)
      .map((c) => ({ ...c, key: typeLabels[c.key] ?? c.key })),
    ...uc.composition.places.slice(0, 2),
  ];
  return (
    <HStack gap={1.5} wrap="wrap">
      {chips.map((c) => (
        <Text
          as="span"
          key={c.key}
          fontSize="2xs"
          px={1.5}
          py={0.5}
          borderRadius="sm"
          bg="bg.muted"
          color="fg.muted"
        >
          {c.key} <b>{total ? Math.round((c.count / total) * 100) : 0}%</b>
        </Text>
      ))}
    </HStack>
  );
}

function UseCaseDetail({
  uc,
  all,
  typeLabels,
  onPick,
  questionsHref,
  methodologyHref,
  detailRef,
}: {
  readonly uc: UseCaseResult;
  readonly all: readonly UseCaseResult[];
  readonly typeLabels: Readonly<Record<string, string>>;
  readonly onPick: (key: string) => void;
  readonly questionsHref: (key: string) => string;
  readonly methodologyHref: string;
  readonly detailRef: Ref<HTMLDivElement>;
}) {
  const total = uc.stats.scored + uc.stats.errors;
  return (
    <Box
      ref={detailRef}
      scrollMarginTop={4}
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
          aside={
            <ChakraLink asChild color="primary.solid" fontSize="xs">
              <Link href={methodologyHref}>Why question types? →</Link>
            </ChakraLink>
          }
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
  methodologyHref,
}: {
  readonly page: BenchmarkPage;
  readonly questionsHref: (useCase: string) => string;
  /** The methodology's "Why question types matter" block. */
  readonly methodologyHref: string;
}) {
  const ordered = [...page.useCases].sort(bySize);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
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
        methodologyHref={methodologyHref}
        detailRef={detailRef}
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
              onClick={() => {
                setSelectedKey(uc.key);
                revealIfAbove(detailRef.current);
              }}
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
              <Box
                gridColumn={{ base: "1 / -1", md: "auto" }}
                minW={0}
                display="grid"
                gap={2}
              >
                <TierBar stats={uc.stats} label={uc.label} />
                <Flex justify="space-between" align="center" gap={3}>
                  <MixChips uc={uc} typeLabels={typeLabels} />
                  <Text
                    as="span"
                    fontSize="xs"
                    color={isSelected ? "fg.muted" : "primary.solid"}
                    flexShrink={0}
                  >
                    {isSelected ? "Showing above" : "View details ›"}
                  </Text>
                </Flex>
              </Box>
            </chakra.button>
          );
        })}
      </Box>
    </Section>
  );
}
