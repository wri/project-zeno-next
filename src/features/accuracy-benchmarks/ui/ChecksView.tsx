/**
 * The checks view: every check the run's questions use, per step, in plain
 * words; then the checks that are tracked but not scored, and the ones no
 * question calls for yet. Wording lives in `model/checks.ts`.
 */

import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Text,
} from "@chakra-ui/react";
import { Swatch } from "@/src/shared/ui/Swatch";
import type { CheckInfo } from "../model/checks";
import { STAGE_COPY, STAGE_LABELS, STAGE_ORDER } from "../model/config";
import type { BenchmarkPage, StageKey } from "../model/types";
import { groupChecks } from "../lib/checks";
import { STAGE_COLORS } from "./palette";
import { BackLink, Block, Eyebrow, Panel } from "./parts";

const BASICS: readonly (readonly [string, string])[] = [
  [
    "A check runs only when it applies",
    "Each question switches on the checks it calls for. A check that does not apply is left out; it never counts as a pass.",
  ],
  [
    "One miss and the try is wrong",
    "A try is accurate only if every check that applies to it passes.",
  ],
  [
    "Code decides most checks",
    "The few that must read what a reply means use an AI reviewer. The AI reviewer is never asked to do arithmetic: where figures must match, code compares them.",
  ],
  [
    "A few checks count toward two steps",
    "When one of these fails, we cannot tell which step went wrong, so the dashboard counts it as unattributed.",
  ],
];

function CheckItem({
  check,
  stage,
}: {
  readonly check: CheckInfo;
  /** The step it is listed under; a shared check names its other step. */
  readonly stage?: StageKey;
}) {
  const others = check.stages.filter((s) => s !== stage);
  return (
    <Box
      as="li"
      py={3}
      borderTopWidth="1px"
      borderColor="border"
      _first={{ borderTopWidth: 0, pt: 0 }}
      _last={{ pb: 0 }}
    >
      <Flex gap={2} align="baseline" justify="space-between" wrap="wrap">
        <Text fontWeight="semibold">{check.label}</Text>
        <HStack gap={1.5}>
          {stage
            ? others.map((s) => (
                <Badge key={s} size="sm" variant="outline">
                  Shared with {STAGE_LABELS[s]}
                </Badge>
              ))
            : null}
          <Badge
            size="sm"
            variant="subtle"
            colorPalette={check.scoredBy === "ai" ? "purple" : "gray"}
          >
            {check.scoredBy === "ai" ? "AI reviewer" : "Code"}
          </Badge>
        </HStack>
      </Flex>
      <Text fontSize="sm" mt={1}>
        {check.what}
      </Text>
      {check.notScored ? (
        <Text fontSize="sm" mt={1} color="fg.muted">
          {check.notScored}
        </Text>
      ) : null}
      <Text fontSize="xs" color="fg.muted" mt={1.5}>
        Applies when {check.when}.{" "}
        <Text as="span" fontFamily="mono" color="fg.subtle">
          {check.key}
        </Text>
      </Text>
    </Box>
  );
}

function StageChecks({
  stage,
  checks,
}: {
  readonly stage: StageKey;
  readonly checks: readonly CheckInfo[];
}) {
  return (
    <Box
      as="section"
      id={`checks-${stage}`}
      py={6}
      borderTopWidth="1px"
      borderColor="border"
    >
      <Heading as="h2" size="lg" display="flex" alignItems="center" gap={2}>
        <Swatch color={STAGE_COLORS[stage]} width={12} height={12} />
        {STAGE_ORDER.indexOf(stage) + 1} · {STAGE_LABELS[stage]}
      </Heading>
      <Text color="fg.muted" fontSize="sm" mt={1} mb={4}>
        {STAGE_COPY[stage].question}
      </Text>
      <Panel borderLeftWidth="3px" borderLeftColor={STAGE_COLORS[stage]}>
        <Box as="ul" listStyleType="none" ps={0}>
          {checks.map((c) => (
            <CheckItem key={c.key} check={c} stage={stage} />
          ))}
        </Box>
      </Panel>
    </Box>
  );
}

export function ChecksView({
  page,
  dashboardHref,
}: {
  readonly page: BenchmarkPage;
  readonly dashboardHref: string;
}) {
  const { byStage, tracked, unused } = groupChecks(page.questions);
  return (
    <Box py={{ base: 6, md: 10 }} maxW="900px">
      <Eyebrow>Checks</Eyebrow>
      <Heading as="h1" size="2xl" mt={1} textWrap="balance">
        Every check, and what it looks for
      </Heading>
      <Text mt={3} fontSize="lg" color="fg.muted" maxW="65ch">
        Each of the five checks on the dashboard is made up of smaller checks.
        This page lists every one this benchmark uses: what it looks for, when
        it applies, and whether code or an AI reviewer decides.
      </Text>
      <Box mt={3} mb={6}>
        <BackLink href={dashboardHref} />
      </Box>

      <Grid
        as="ul"
        listStyleType="none"
        ps={0}
        gap={3}
        mb={4}
        templateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))" }}
      >
        {BASICS.map(([title, text]) => (
          <Panel as="li" key={title} p={3} fontSize="sm">
            <Text fontWeight="semibold">{title}</Text>
            <Text color="fg.muted" mt={0.5}>
              {text}
            </Text>
          </Panel>
        ))}
      </Grid>

      {byStage.map(({ stage, checks }) => (
        <StageChecks key={stage} stage={stage} checks={checks} />
      ))}

      {tracked.length ? (
        <Block title="Tracked, not scored yet">
          <Text color="fg.muted" fontSize="sm" mb={4} maxW="72ch">
            These checks run and are reported, but never decide whether an
            answer is right.
          </Text>
          <Panel>
            <Box as="ul" listStyleType="none" ps={0}>
              {tracked.map((c) => (
                <CheckItem key={c.key} check={c} />
              ))}
            </Box>
          </Panel>
        </Block>
      ) : null}

      {unused.length ? (
        <Block title="Not used by this benchmark yet">
          <Text color="fg.muted" fontSize="sm" mb={4} maxW="72ch">
            The test harness has {unused.length} more checks that no question in
            this benchmark calls for yet. They will count once questions that
            need them are added.
          </Text>
          <Box
            as="ul"
            listStyleType="none"
            ps={0}
            display="grid"
            gap={3}
            fontSize="sm"
          >
            {unused.map((c) => (
              <Box as="li" key={c.key}>
                <Text fontWeight="semibold">{c.label}</Text>
                <Text color="fg.muted">{c.what}</Text>
              </Box>
            ))}
          </Box>
        </Block>
      ) : null}

      <Box pt={6} borderTopWidth="1px" borderColor="border">
        <BackLink href={dashboardHref} />
      </Box>
    </Box>
  );
}
