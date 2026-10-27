import type { ReactNode, Ref } from "react";
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
import type { BenchmarkPage, Count, UseCaseResult } from "../../model/types";
import { failureBreakdown, failurePhrase } from "../../lib/failures";
import { pct, share } from "../../lib/format";
import { mixSentence } from "../../lib/mix";
import { tierLines } from "../../lib/tiers";
import {
  Caption,
  DetailPanel,
  ReliabilitySentence,
  Section,
  SelectableRow,
  TierBar,
  TierFacts,
  TierLegend,
  useRowSelection,
} from "../parts";

function wrongAnswers(uc: UseCaseResult): string {
  const { failed } = uc.stats;
  const [first] = failureBreakdown(uc.stats);
  if (!failed || !first) return "";
  return failed === 1
    ? ` The 1 wrong answer failed at ${first.label.toLowerCase()}.`
    : ` Of the ${failed} wrong answers: ${failurePhrase(uc.stats)}.`;
}

function CountBars({
  title,
  aside,
  counts,
  total,
}: {
  readonly title: string;
  readonly aside?: ReactNode;
  readonly counts: readonly Count[];
  readonly total: number;
}) {
  return (
    <Box minW={0}>
      <Flex mb={2} gap={2} justify="space-between" align="baseline" wrap="wrap">
        <Caption>{title}</Caption>
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
            <Text truncate title={c.label}>
              {c.label}
            </Text>
            <Box h="6px" bg="bg.muted" borderRadius="full" overflow="hidden">
              <Box
                h="100%"
                bg="primary.solid"
                w={pct(share(c.count, total) ?? 0)}
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
function MixChips({ uc }: { readonly uc: UseCaseResult }) {
  const chips = [
    ...uc.composition.types.slice(0, 4),
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
          {c.label} <b>{pct(share(c.count, uc.stats.total))}</b>
        </Text>
      ))}
    </HStack>
  );
}

function UseCaseDetail({
  uc,
  all,
  onPick,
  questionsHref,
  methodologyHref,
  detailRef,
}: {
  readonly uc: UseCaseResult;
  readonly all: readonly UseCaseResult[];
  readonly onPick: (key: string) => void;
  readonly questionsHref: (key: string) => string;
  readonly methodologyHref: string;
  readonly detailRef: Ref<HTMLDivElement>;
}) {
  const { total } = uc.stats;
  return (
    <DetailPanel ref={detailRef}>
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
      <ReliabilitySentence subject={<b>{uc.label}</b>} stats={uc.stats} />
      <Text fontSize="sm" color="fg.muted" mt={1}>
        {mixSentence(uc)}
        {wrongAnswers(uc)}
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
    </DetailPanel>
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
  // By use-case number (UC1, UC2, ... UC10), so UC1 is selected by default.
  const ordered = [...page.useCases].sort((a, b) =>
    a.key.localeCompare(b.key, "en", { numeric: true })
  );
  const { selected, select, detailRef } = useRowSelection(ordered);
  if (!selected) return null;
  return (
    <Section
      id="usecases"
      title="Accuracy by use case"
      sub={
        <>
          Results grouped by GNW&rsquo;s <b>priority use cases</b>. A question
          can serve more than one use case. Each use case draws on its own mix
          of question types, places and datasets: select one to see it.
        </>
      }
    >
      <UseCaseDetail
        uc={selected}
        all={ordered}
        onPick={select}
        questionsHref={questionsHref}
        methodologyHref={methodologyHref}
        detailRef={detailRef}
      />
      <Box mt={4} mb={2}>
        <TierLegend />
      </Box>
      <Box display="grid" gap={2}>
        {ordered.map((uc) => {
          const isSelected = uc.key === selected.key;
          return (
            <SelectableRow
              key={uc.key}
              selected={isSelected}
              onSelect={() => select(uc.key)}
              ariaLabel={`${uc.label}, ${uc.stats.total} questions: ${tierLines(uc.stats).join(", ")}`}
              title={uc.label}
              sub={`${uc.key} · ${uc.stats.total} questions`}
              value={pct(uc.stats.everyTime)}
              caption="every time"
            >
              <Box display="grid" gap={2}>
                <TierBar stats={uc.stats} label={uc.label} />
                <Flex justify="space-between" align="center" gap={3}>
                  <MixChips uc={uc} />
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
            </SelectableRow>
          );
        })}
      </Box>
    </Section>
  );
}
