/**
 * The methodology view, in five sections, with every check under "Show all
 * checks". Wording is the team's methodology draft, including its in-page
 * edits (its copy.json); counts come from the run.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  Collapsible,
  Grid,
  Heading,
  Link as ChakraLink,
  List,
  Table,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Swatch } from "@/src/shared/ui/Swatch";
import { pct, share } from "../lib/format";
import {
  STAGE_COPY,
  STAGE_LABELS,
  STAGE_ORDER,
  USE_CASES,
} from "../model/config";
import type { BenchmarkPage, MeasuredType, StageKey } from "../model/types";
import { AllChecks } from "./AllChecks";
import { STAGE_COLORS } from "./palette";
import { BackLink, Block, Eyebrow, Panel } from "./parts";

/** The block holding every check; `#checks` opens it. */
const CHECKS_ID = "checks";

const SECTIONS = [
  ["what-it-is", "What the benchmark is"],
  ["what-it-covers", "What it covers"],
  ["right-answer", "What counts as a right answer"],
  ["score", "How the score is calculated"],
  ["not-yet", "What it does not yet measure"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

const SECTION_TITLES = Object.fromEntries(SECTIONS) as Record<
  SectionId,
  string
>;

/** What each question type asks, with an example from the benchmark, in the
 * draft's order. */
const TYPE_ROWS: Readonly<Record<string, readonly [string, ReactNode]>> = {
  quantification: [
    "How much or how many",
    "“How many hectares of disturbance alerts were flagged across Brazil in 2024?”",
  ],
  comparison: [
    "How places or periods compare",
    "“Between Brazil and Indonesia, which had more disturbance alert area in 2024?”",
  ],
  monitoring: [
    "What has happened recently in an area",
    "“Have there been any new deforestation alerts in Équateur province in the last month?”",
  ],
  causal: [
    "Why something happened",
    "“Were any of last week’s alerts in Maranhão caused by fire?”",
  ],
  trend: [
    "How something has changed over time",
    "“Have alerts in Équateur province been rising over the last three months?”",
  ],
  geospatial: [
    "Finding and showing a place",
    "“Show me the Kayapó Indigenous Territory.”",
  ],
  portfolio: [
    "Several areas at once",
    "“Has deforestation since 2021 been worse in Rondônia or Mato Grosso? We source beef from both.”",
  ],
  dataset: [
    "Finding and showing the right data",
    "“Display deforestation alerts on the map.”",
  ],
  refusal: [
    "Requests Horizon should decline, or ask about before answering",
    "“Take me to the Congo Basin.” (which boundary?)",
  ],
};

const TYPE_ORDER = Object.keys(TYPE_ROWS);

/** The run's measured types in the draft's order; a type the draft does not
 * describe uses the run's own description and example. */
function typeRows(types: readonly MeasuredType[]) {
  const rank = (key: string) => {
    const i = TYPE_ORDER.indexOf(key);
    return i === -1 ? TYPE_ORDER.length : i;
  };
  return types
    .toSorted((a, b) => rank(a.key) - rank(b.key))
    .map((t) => {
      const [asks, example] = TYPE_ROWS[t.key] ?? [
        t.description.charAt(0).toUpperCase() + t.description.slice(1),
        t.examplePass ? `“${t.examplePass}”` : null,
      ];
      return { key: t.key, label: t.label, asks, example };
    });
}

/** A question the 29 Sep run got right, step by step: what Horizon did, and
 * which of it the benchmark checked. */
const RIGHT_EXAMPLE: readonly [StageKey, ReactNode, ReactNode][] = [
  [
    "scope",
    "Recognised a data question it could answer right away, without asking back.",
    <>
      <b>Not checked</b> for this question. Scope is checked only on questions
      where the assistant must choose between answering and asking.
    </>,
  ],
  [
    "retrieval",
    "Picked Brazil, the tree cover loss dataset, 2015 to 2023 and all forest types, then fetched the data.",
    <>
      <b>Checked</b>: place, dataset, forest filter, dates, data fetched.
    </>,
  ],
  [
    "analysis",
    "Built two annual series: loss in hectares, and emissions in tonnes of CO₂e.",
    <>
      <b>Checked</b>: chart has no missing values. <b>Not yet</b>: figures
      compared with the data service&rsquo;s own totals.
    </>,
  ],
  [
    "explanation",
    "“Fluctuating rather than showing a steady increase or decrease”, with the caveat that loss is not the same as deforestation.",
    <>
      <b>Checked</b>: no web sources used in place of the data. <b>Not yet</b>:
      required caveats; the reply&rsquo;s figures matched against the chart.
    </>,
  ],
  [
    "output",
    "Two bar charts, with emissions kept on a separate chart from area as the dataset requires.",
    <>
      <b>Checked</b>: charts well-formed.
    </>,
  ],
];

function Bullets({ items }: { readonly items: readonly ReactNode[] }) {
  return (
    <List.Root gap={2.5} ps={5} color="fg.muted" fontSize="sm" maxW="72ch">
      {items.map((item, i) => (
        <List.Item key={i}>{item}</List.Item>
      ))}
    </List.Root>
  );
}

/** An in-page link to a section or part of this view. */
function Jump({
  to,
  children,
}: {
  readonly to: string;
  readonly children: ReactNode;
}) {
  return (
    <ChakraLink href={`#${to}`} color="primary.solid">
      {children}
    </ChakraLink>
  );
}

function UseCaseCards() {
  return (
    <Grid
      as="ul"
      listStyleType="none"
      ps={0}
      gap={3}
      templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
    >
      {USE_CASES.map((uc) => (
        <Panel
          as="li"
          key={uc.key}
          p={4}
          borderTopWidth="3px"
          borderTopColor="primary.solid"
          fontSize="sm"
        >
          <Badge size="sm" variant="subtle" colorPalette="blue">
            {uc.key}
          </Badge>
          <Heading as="h4" size="sm" mt={2}>
            {uc.title}
          </Heading>
          <Text color="fg.muted" mt={1.5}>
            {uc.text}
          </Text>
          {uc.more ? (
            <Text color="fg.subtle" mt={1.5}>
              {uc.more}
            </Text>
          ) : null}
        </Panel>
      ))}
    </Grid>
  );
}

function QuestionTypesTable({
  types,
}: {
  readonly types: readonly MeasuredType[];
}) {
  return (
    <Panel p={0} overflowX="auto">
      <Table.Root size="sm" minW="36rem">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>What the user is asking</Table.ColumnHeader>
            <Table.ColumnHeader>Example from the benchmark</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {typeRows(types).map((row) => (
            <Table.Row key={row.key}>
              <Table.Cell fontWeight="semibold" whiteSpace="nowrap">
                {row.label}
              </Table.Cell>
              <Table.Cell whiteSpace="normal">{row.asks}</Table.Cell>
              <Table.Cell
                whiteSpace="normal"
                fontStyle="italic"
                color="fg.muted"
              >
                {row.example}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Panel>
  );
}

function FiveSteps() {
  return (
    <Box display="grid" gap={5}>
      {STAGE_ORDER.map((stage, i) => (
        <Grid
          key={stage}
          templateColumns={{ base: "1fr", md: "14rem minmax(0, 1fr)" }}
          gap={4}
        >
          <Box>
            <Heading
              as="h4"
              size="sm"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Swatch color={STAGE_COLORS[stage]} width={10} height={10} />
              {i + 1} · {STAGE_LABELS[stage]}
            </Heading>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              {STAGE_COPY[stage].question}
            </Text>
          </Box>
          <Box as="dl" fontSize="sm" display="grid" gap={2}>
            {(
              [
                ["What we check", STAGE_COPY[stage].what],
                ["Why it matters", STAGE_COPY[stage].why],
                ["Not yet tested", STAGE_COPY[stage].notYet],
              ] as const
            ).map(([term, text]) => (
              <Box key={term}>
                <Text as="dt" fontWeight="semibold">
                  {term}
                </Text>
                <Text as="dd" color="fg.muted">
                  {text}
                </Text>
              </Box>
            ))}
          </Box>
        </Grid>
      ))}
    </Box>
  );
}

function WorkedExamples() {
  return (
    <>
      <Grid
        templateColumns={{ base: "1fr", md: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
        gap={4}
      >
        <Panel p={4}>
          <Eyebrow>Got right · Trend</Eyebrow>
          <Text fontSize="lg" mt={2} mb={3}>
            &ldquo;Looking at Brazil&rsquo;s tree cover loss across all forest
            types from 2015 to 2023, has the annual trend been increasing or
            decreasing?&rdquo;
          </Text>
          <List.Root as="ol" listStyleType="none" gap={3}>
            {RIGHT_EXAMPLE.map(([stage, did, checked]) => (
              <List.Item
                key={stage}
                borderLeftWidth="3px"
                borderColor={STAGE_COLORS[stage]}
                pl={3}
                fontSize="sm"
              >
                <Text fontWeight="semibold">{STAGE_LABELS[stage]}</Text>
                <Text>{did}</Text>
                <Text color="fg.muted" fontSize="xs" mt={0.5}>
                  {checked}
                </Text>
              </List.Item>
            ))}
          </List.Root>
          <Text mt={3} fontWeight="semibold" color="fg.success">
            Accurate on all 3 attempts.
          </Text>
        </Panel>
        <Panel p={4} alignSelf="start">
          <Eyebrow>Got wrong · Quantification</Eyebrow>
          <Text fontSize="lg" mt={2} mb={3}>
            &ldquo;Using a 50% canopy cover threshold, what is Brazil&rsquo;s
            cumulative net forest GHG flux in MgCO2e since 2001?&rdquo;
          </Text>
          <Text
            fontSize="sm"
            bg="bg.muted"
            borderRadius="md"
            p={3}
            fontStyle="italic"
          >
            &ldquo;The Forest greenhouse gas net flux dataset is the best match
            for your request&hellip; Would you like to use this dataset for the
            analysis?&rdquo;
          </Text>
          <Text mt={3} fontSize="sm">
            <b>Failed at retrieval on all 3 attempts.</b> It found the right
            dataset, then asked permission instead of fetching the data. No
            data, no answer.
          </Text>
        </Panel>
      </Grid>
      <Text
        as="blockquote"
        mt={5}
        pl={4}
        borderLeftWidth="3px"
        borderColor="primary.solid"
        fontSize="lg"
        fontWeight="semibold"
        maxW="60ch"
      >
        If any part a user could rely on is wrong, the whole answer counts as
        wrong.
      </Text>
    </>
  );
}

export function MethodologyView({
  page,
  dashboardHref,
  openChecks,
}: {
  readonly page: BenchmarkPage;
  readonly dashboardHref: string;
  /** Open the checks list on arrival. */
  readonly openChecks: boolean;
}) {
  const [checksOpen, setChecksOpen] = useState(
    () => openChecks || window.location.hash === `#${CHECKS_ID}`
  );
  const synthetic = page.questions.filter((q) => q.synthetic).length;
  const measured = page.types.length;
  // Links such as "Why question types?" open this view on a block.
  useEffect(() => {
    const id = window.location.hash.slice(1) || (openChecks ? CHECKS_ID : "");
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [openChecks]);
  return (
    <Box py={{ base: 6, md: 10 }} maxW="900px">
      <Eyebrow>Methodology</Eyebrow>
      <Heading as="h1" size="2xl" mt={1} textWrap="balance">
        What we measure, and why
      </Heading>
      <Text mt={3} fontSize="lg" color="fg.muted" maxW="65ch">
        The benchmark test set answers one question:{" "}
        <b>
          is Horizon getting more accurate on the questions that matter most for
          impact?
        </b>{" "}
        It is a fixed set of test questions, re-run over time, so a change in
        score means a change in the product. This page covers how the questions
        were chosen, what an answer has to get right, how the score is
        calculated and the five checks behind it.
      </Text>
      <Wrap as="nav" aria-label="On this page" gap={2} mt={4} align="center">
        <Text
          fontFamily="mono"
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="0.08em"
          color="fg.subtle"
        >
          On this page
        </Text>
        {SECTIONS.map(([id, title]) => (
          <Button key={id} asChild size="xs" variant="outline" rounded="full">
            <a href={`#${id}`}>{title}</a>
          </Button>
        ))}
      </Wrap>
      <Box mt={4} mb={2}>
        <BackLink href={dashboardHref} />
      </Box>

      <Block
        id="what-it-is"
        title={SECTION_TITLES["what-it-is"]}
        lead="The benchmark is a fixed set of test questions that we ask Horizon at regular intervals. Because the questions stay the same between runs, a change in score reflects a change in Horizon, not in the test."
      >
        <Bullets
          items={[
            <>
              <b>It measures how Horizon uses the data, not the data itself.</b>{" "}
              It checks whether Horizon picks the right place, dataset and
              period, gets the figures right and describes them faithfully. How
              accurate each underlying dataset is, for example how well tree
              cover loss is detected, is documented separately for each dataset.
            </>,
            <>
              <b>Accurate means not misleading.</b> An answer counts as right
              only if every part a user could rely on is right. Helpfulness,
              tone and clarity are not scored.
            </>,
            <>
              <b>How it runs.</b> Each question is asked three times on the live
              version of Horizon with default settings. Every answer is scored
              automatically: by code where possible, and by an AI reviewer where
              the meaning of a reply has to be read. Correct figures come from
              the same data service Horizon uses.
            </>,
            <>
              <b>What it covers today.</b> Questions that best represent
              GNW&rsquo;s six priority use cases, limited to what Horizon can do
              now and what our checks can test (see{" "}
              <Jump to="how-chosen">How the questions were chosen</Jump>).
            </>,
            <>
              <b>How it will grow.</b> We will expand the set to cover all use
              cases, question types and datasets thoroughly, and add other
              languages as separate sets. A new version starts when questions
              are added or changed, or when the scoring approach is adjusted, no
              more than once or twice a year. Scores are only compared within a
              version.
            </>,
          ]}
        />
      </Block>

      <Block
        id="what-it-covers"
        title={SECTION_TITLES["what-it-covers"]}
        lead="Six priority use cases, the types of question within them and how the questions were chosen."
      />
      <Block
        id="use-cases"
        level="h3"
        title="Priority use cases"
        lead="Each use case is a job our target users need to get done. A question can belong to several use cases."
      >
        <UseCaseCards />
        <Text fontSize="sm" color="fg.muted" mt={3}>
          <b>Use cases overlap.</b> A question can belong to several use cases,
          so group counts add up to more than the total.
        </Text>
      </Block>
      <Block
        id="question-types"
        level="h3"
        title="What we mean by question types"
        lead={`A question type describes what a user is asking Horizon to do: give a number, compare places, show change over time, explain why something happened and so on, whatever the place or dataset. Getting each type right takes different things, so we define a right answer separately for each type and report accuracy by type. The benchmark currently measures ${measured} question types.`}
      >
        <QuestionTypesTable types={page.types} />
        <Box mt={4}>
          <Bullets
            items={[
              <>
                <b>Use cases are a mix of question types.</b> Each use case
                draws on a different mix of question types, so its score
                reflects how well Horizon handles that mix. For example, about a
                quarter of the questions under{" "}
                <i>Investigate change and build evidence</i> ask why something
                happened (causal questions), so how well Horizon explains causes
                has a big effect on that use case&rsquo;s score.
              </>,
              <>
                <b>Question types will grow with the benchmark.</b> As we expand
                the benchmark to cover more use cases and question types,
                accuracy by type will be reported across the whole set.
              </>,
            ]}
          />
        </Box>
      </Block>
      <Block id="how-chosen" level="h3" title="How the questions were chosen">
        <Bullets
          items={[
            <>
              <b>Target users, broader than today&rsquo;s traffic.</b> Each
              question maps to at least one of GNW&rsquo;s six priority use
              cases (above). Since Horizon&rsquo;s user base is still small and
              doesn&rsquo;t fully represent target use cases, we added other
              evidence about our target users to complete the picture.
            </>,
            <>
              <b>What a question needed to be included.</b> Every question
              reflects a priority use case, can be scored the same way every
              time and has a correct answer worked out the same way every time:
              fixed, recalculated for each run from a fixed rule (for
              recent-alert questions), or calculated by a fixed formula from the
              data Horizon fetched (for questions that ask for a figure). For
              now, the set also includes only questions that Horizon can answer
              with its current capabilities and that our current checks can
              test. We left out questions about features Horizon doesn&rsquo;t
              support yet. A clear &ldquo;not available yet&rdquo; would be the
              right answer today, and it wouldn&rsquo;t mislead anyone, but
              counting those as correct would overstate how well we support
              those use cases, and they would start failing as soon as the
              feature ships. We&rsquo;ll add them in future versions.
            </>,
            <>
              <b>Returning users, not only first questions.</b> Questions
              represent a user&rsquo;s first queries as well as follow up
              questions they might ask. About a third of questions come from
              people already monitoring an area, such as someone following up on
              an alert and asking about causes, imagery or confidence.
            </>,
            <>
              <b>English only.</b> All questions are in English; in the future,
              translated copies of the set will be scored separately for each
              language.
            </>,
          ]}
        />
      </Block>

      <Block
        id="right-answer"
        title={SECTION_TITLES["right-answer"]}
        lead="An answer is checked in five steps, in the order it is built."
      >
        <Bullets
          items={[
            <>
              <b>Accuracy is defined by type.</b> Each question type has its own
              checks for what a right answer must get right, and those checks
              decide how a question is scored.
            </>,
            <>
              <b>Not every check applies to every type.</b> A show-on-the-map
              request has no chart to check, and only some questions test scope.
              Analysis, explanation and output are checked whenever an answer
              includes a chart.
            </>,
          ]}
        />
      </Block>
      <Block id="five-steps" level="h3" title="The five steps">
        <FiveSteps />
      </Block>
      <Block
        id="example"
        level="h3"
        title="What a right answer looks like"
        lead="An example question Horizon got right and one it got wrong."
      >
        <WorkedExamples />
      </Block>
      <Block
        id={CHECKS_ID}
        level="h3"
        title="Every check, and what it looks for"
        lead="Each of the five steps is made up of smaller checks: what each one looks for, when it applies and whether code or an AI reviewer decides."
      >
        <Collapsible.Root
          open={checksOpen}
          onOpenChange={(e) => setChecksOpen(e.open)}
        >
          <Collapsible.Trigger asChild>
            <Button size="sm" variant="outline" rounded="full">
              {checksOpen ? <CaretDownIcon /> : <CaretRightIcon />}
              {checksOpen ? "Hide all checks" : "Show all checks"}
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box pt={4}>
              <AllChecks questions={page.questions} />
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </Block>

      <Block id="score" title={SECTION_TITLES.score}>
        <Bullets
          items={[
            <>
              <b>Three attempts.</b> Each question is asked three times.
              Reliable AI accuracy on priority use cases, our headline score, is
              the share of questions answered accurately on all three. We also
              report questions answered accurately on two of three (most of the
              time) and one of three (some of the time).
            </>,
            <>
              <b>Results by use case and question type</b> use the same measure
              as the headline: reliable AI accuracy, shown alongside the share
              of questions answered accurately most of the time, some of the
              time and never.
            </>,
            <>
              <b>No reply counts as wrong.</b> An attempt that gets no answer,
              because the reply stalls, breaks off or the service fails, is a
              wrong attempt: the user got nothing. An attempt the testing tool
              itself could not score is left out, and a question is reported
              separately as an error only when none of its attempts could be
              scored.
            </>,
            <>
              <b>Where answers fail.</b> Each wrong answer is counted once, at
              the first check it fails, in the order scope, retrieval, analysis,
              explanation, output.
            </>,
            <>
              <b>Recent-alert questions</b> (&ldquo;in the last month&rdquo;)
              are scored against a date window set on the day of the run, with a
              few days&rsquo; tolerance either side.
            </>,
            <>
              <b>Only comparable runs go on the trend line</b>: same question
              set, production, default tools, three attempts, every question
              present. A broken question is removed, never edited, and any
              change to how a check scores is marked on the chart.
            </>,
          ]}
        />
      </Block>

      <Block id="not-yet" title={SECTION_TITLES["not-yet"]}>
        <Bullets
          items={[
            <>
              <b>Questions about a user&rsquo;s own areas are not run yet.</b>{" "}
              Questions about a custom area or a saved set of sites need a
              seeded test account, so they are left out of the score for now.
              When they are added, that will start a new version so the trend
              line stays comparable.
            </>,
            <>
              <b>Expected answers are still being reviewed.</b> Some expected
              answers haven&rsquo;t been checked by a person yet, so a few
              failures may be errors in the expected answer rather than in
              Horizon. Questions with no single number to check are scored
              against a short must-say / must-not-say checklist by an AI
              reviewer.
            </>,
            <>
              <b>Protected-area analysis is failing upstream</b> right now
              because of a data service change. Those questions count as
              failures, as a user would see them.
            </>,
            <>
              <b>
                Numbers are checked against the data Horizon fetched, not an
                independent source.
              </b>{" "}
              Each asked figure is recalculated from the data Horizon itself
              pulled, which catches wrong arithmetic and misreported figures but
              assumes that data is right. Whether the data matches an
              independent fetch is tested in the internal regression suite, not
              here. Whether the reply&rsquo;s figures match the chart is tracked
              but not yet scored.
            </>,
            <>
              <b>Clarifying questions are scored separately.</b> The check for
              &ldquo;did it ask instead of guessing&rdquo; is not yet stable.
              Required caveats are scored on questions that list them; dataset
              caveats in general are required by Horizon&rsquo;s instructions
              but not yet scored.
            </>,
            <>
              <b>
                {pct(share(synthetic, page.questions.length))} of questions are
                synthetic.
              </b>{" "}
              They are written from user stories and research rather than taken
              from real Horizon traffic. They are tagged synthetic and replaced
              with real questions over time.
            </>,
            <>
              <b>Helpfulness is not scored.</b> Some questions involve practical
              help, such as prioritizing alerts or writing a short summary. Only
              the parts that could mislead are scored: the figures and any
              claims about what Horizon can do.
            </>,
            <>
              <b>Some question types are not measured yet.</b> The benchmark
              currently measures {measured} question types. Others will be added
              as we define what a right answer looks like for each.
            </>,
          ]}
        />
        <Box mt={5}>
          <BackLink href={dashboardHref} />
        </Box>
      </Block>
    </Box>
  );
}
