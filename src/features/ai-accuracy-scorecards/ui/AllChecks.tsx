/**
 * Every check the run's questions use, per step, in plain words; then the
 * checks that are tracked but not scored, and the ones no question calls for
 * yet. Shown in the methodology under "Show all checks"; wording lives in
 * `model/checks.ts`.
 */

import type { ReactNode } from "react";
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
import type { Question, StageKey } from "../model/types";
import { groupChecks } from "../lib/checks";
import { STAGE_COLORS } from "./palette";
import { Panel } from "./parts";

const BASICS: readonly (readonly [string, string])[] = [
  [
    "A check runs only when it applies",
    "Each question is scored only on the checks that are relevant to it. Checks that aren't relevant are skipped, so they don't count toward the score as a pass or a fail.",
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

function CheckGroup({
  id,
  title,
  lead,
  color,
  children,
}: {
  readonly id?: string;
  readonly title: ReactNode;
  readonly lead: string;
  readonly color?: string;
  readonly children: ReactNode;
}) {
  return (
    <Box as="section" id={id} pt={6}>
      <Heading as="h4" size="md" display="flex" alignItems="center" gap={2}>
        {color ? <Swatch color={color} width={12} height={12} /> : null}
        {title}
      </Heading>
      <Text color="fg.muted" fontSize="sm" mt={1} mb={3} maxW="72ch">
        {lead}
      </Text>
      <Panel borderLeftWidth="3px" borderLeftColor={color ?? "border"}>
        <Box as="ul" listStyleType="none" ps={0}>
          {children}
        </Box>
      </Panel>
    </Box>
  );
}

export function AllChecks({
  questions,
}: {
  readonly questions: readonly Question[];
}) {
  const { byStage, tracked, unused } = groupChecks(questions);
  return (
    <>
      <Grid
        as="ul"
        listStyleType="none"
        ps={0}
        gap={3}
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
        <CheckGroup
          key={stage}
          id={`checks-${stage}`}
          title={`${STAGE_ORDER.indexOf(stage) + 1} · ${STAGE_LABELS[stage]}`}
          lead={STAGE_COPY[stage].question}
          color={STAGE_COLORS[stage]}
        >
          {checks.map((c) => (
            <CheckItem key={c.key} check={c} stage={stage} />
          ))}
        </CheckGroup>
      ))}

      {tracked.length ? (
        <CheckGroup
          title="Tracked, not scored yet"
          lead="These checks run and are reported, but never decide whether an answer is right."
        >
          {tracked.map((c) => (
            <CheckItem key={c.key} check={c} />
          ))}
        </CheckGroup>
      ) : null}

      {unused.length ? (
        <CheckGroup
          title="Not used by this benchmark yet"
          lead={`The test harness has ${unused.length} more checks. We use them in our internal evals; no benchmark question calls for them yet, and they will count here once questions that need them are added.`}
        >
          {unused.map((c) => (
            <Box
              as="li"
              key={c.key}
              py={3}
              borderTopWidth="1px"
              borderColor="border"
              _first={{ borderTopWidth: 0, pt: 0 }}
              _last={{ pb: 0 }}
            >
              <Text fontWeight="semibold">{c.label}</Text>
              <Text fontSize="sm" mt={1}>
                {c.what}
              </Text>
            </Box>
          ))}
        </CheckGroup>
      ) : null}
    </>
  );
}
