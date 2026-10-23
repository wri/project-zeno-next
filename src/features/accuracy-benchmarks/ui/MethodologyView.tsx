/**
 * The methodology view. Wording is the published accuracy page's, including
 * the team's in-page edits (its copy.json); counts come from the run.
 */

import { useEffect, type ReactNode } from "react";
import {
  Box,
  Grid,
  Heading,
  Link as ChakraLink,
  List,
  Text,
} from "@chakra-ui/react";
import { Link } from "@/src/shared/lib/router";
import { Swatch } from "@/src/shared/ui/Swatch";
import { STAGE_COPY, STAGE_LABELS, STAGE_ORDER } from "../model/config";
import type { BenchmarkPage, StageKey } from "../model/types";
import { STAGE_COLORS } from "./palette";
import { Eyebrow, Panel } from "./parts";

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
      <b>Checked</b>: chart complete; figures in the reply match the chart.{" "}
      <b>Not yet</b>: figures compared with the data service&rsquo;s own totals.
    </>,
  ],
  [
    "explanation",
    "“Fluctuating rather than showing a steady increase or decrease”, with the caveat that loss is not the same as deforestation.",
    <>
      <b>Checked</b>: no web sources used in place of the data. <b>Not yet</b>:
      required caveats.
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

function Block({
  id,
  title,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <Box as="section" id={id} py={6} borderTopWidth="1px" borderColor="border">
      <Heading as="h2" size="lg" mb={3}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function Bullets({ items }: { readonly items: readonly ReactNode[] }) {
  return (
    <List.Root gap={2.5} ps={5} color="fg.muted" fontSize="sm" maxW="72ch">
      {items.map((item, i) => (
        <List.Item key={i}>{item}</List.Item>
      ))}
    </List.Root>
  );
}

function BackLink({ href }: { readonly href: string }) {
  return (
    <ChakraLink asChild color="primary.solid" fontSize="sm">
      <Link href={href}>← Back to the dashboard</Link>
    </ChakraLink>
  );
}

function WorkedExamples() {
  return (
    <>
      <Text color="fg.muted" mb={4}>
        One benchmark question Horizon got right and one it got wrong, from the
        29 Sep run.
      </Text>
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
}: {
  readonly page: BenchmarkPage;
  readonly dashboardHref: string;
}) {
  const real = page.questions.filter((q) => !q.synthetic).length;
  const synthetic = page.questions.length - real;
  const drafted = page.questions.filter((q) => q.drafted).length;
  const unmeasured = page.unmeasuredTypes.map(
    (t) => `${t.label.toLowerCase()} (${t.description})`
  );
  // Links such as "Why question types?" open this view on a block.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <Box py={{ base: 6, md: 10 }} maxW="900px">
      <Eyebrow>Methodology</Eyebrow>
      <Heading as="h1" size="2xl" mt={1} textWrap="balance">
        What we measure, and why
      </Heading>
      <Text mt={3} fontSize="lg" color="fg.muted" maxW="65ch">
        The benchmark answers one question:{" "}
        <b>
          is Horizon getting more accurate on the questions that matter most for
          impact?
        </b>{" "}
        It is a fixed set of test questions, re-run over time, so a change in
        score means a change in the product. This page covers how the questions
        were chosen, what an answer has to get right, how the score is
        calculated, and the five checks behind it.
      </Text>
      <Box mt={3} mb={2}>
        <BackLink href={dashboardHref} />
      </Box>

      <Block title="How the questions were chosen">
        <Bullets
          items={[
            <>
              <b>Target users, not today&rsquo;s traffic.</b> Each question maps
              to at least one user task for each priority use case.
              Horizon&rsquo;s user base is still small, so priorities come from
              target-user evidence; live traffic shapes wording only.
            </>,
            <>
              <b>The benchmark is a fixed subset of the Challenge Set,</b> our
              larger, growing bank of test questions. {real} benchmark questions
              come from real user questions already in the Challenge Set;{" "}
              {synthetic} are new, written from user stories to fill gaps:
              near-real-time monitoring, many-area (portfolio) requests, causal
              and data questions, and analysis for protected areas, Indigenous
              territories and sub-national units. New questions are tagged
              synthetic and reviewed against real questions at each version.
            </>,
            <>
              <b>What a question needed to be included.</b> Every question had
              to meet three criteria: it reflects a priority use case; it can be
              scored the same way every time; and its correct answer won&rsquo;t
              change when new data is released, so results stay comparable from
              year to year. We also left out near-duplicates (one question per
              fact) and only used Challenge Set questions whose correct answers
              had already been checked.
            </>,
            ...(page.benchmark.draftLabel
              ? [
                  <>
                    <b>Draft status.</b> Selected questions need to be double
                    checked and expected answers for the new questions have not
                    been reviewed yet. The set is frozen as v
                    {page.benchmark.set} once the November baseline runs.
                  </>,
                ]
              : []),
          ]}
        />
      </Block>

      <Block title="What a right answer looks like">
        <WorkedExamples />
      </Block>

      <Block id="question-types" title="Why question types matter">
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
            <>
              <b>Use cases are a mix of question types.</b> Each use case draws
              on a different mix of question types, so its score reflects how
              well Horizon handles that mix.
            </>,
            <>
              <b>
                Question types will also be how we report on the full Challenge
                Set.
              </b>{" "}
              The Challenge Set is our larger bank of test questions. It keeps
              growing as we learn how Horizon is used, find new failures, and
              add questions we want Horizon to answer well. Future updates will
              report accuracy by question type across the whole set.
            </>,
          ]}
        />
      </Block>

      <Block title="How the score is calculated">
        <Bullets
          items={[
            <>
              <b>Fixed questions.</b> Benchmark questions are fixed between
              runs, so a change in score means a change in the product. Unlike
              the Challenge Set, which keeps growing, the benchmark set will be
              re-versioned when new questions are added, questions change, or
              the scoring approach is adjusted (no more than 1-2x per year).
            </>,
            <>
              <b>Three attempts.</b> Each question is asked three times.{" "}
              <b>Reliable AI accuracy on priority use cases</b>, our headline
              score, is the share of questions answered accurately on all three.
              We also report questions answered accurately on two of three (most
              of the time) and one of three (some of the time).
            </>,
            <>
              <b>Results by use case and question type</b> use the same measure
              as the headline: reliable AI accuracy, shown alongside the share
              of questions answered accurately most of the time, some of the
              time and never. The one exception is the flow chart under
              &ldquo;Where do wrong answers go wrong?&rdquo;, which still counts
              a question as accurate if it was right on at least two of three
              tries. We&rsquo;ll update it to match for the November baseline.
            </>,
            <>
              <b>Errors are reported separately.</b> A question that errors or
              times out is left out of the score and counted under availability
              instead.
            </>,
            <>
              <b>Where answers fail.</b> Each wrong answer is counted once, at
              the first check it fails, in the order scope, retrieval, analysis,
              explanation, output.
            </>,
            <>
              <b>Use cases overlap.</b> A question can belong to several use
              cases, so group counts add up to more than the total.
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

      <Block title="The five checks">
        <Box display="grid" gap={5}>
          {STAGE_ORDER.map((stage, i) => (
            <Grid
              key={stage}
              templateColumns={{ base: "1fr", md: "14rem minmax(0, 1fr)" }}
              gap={4}
            >
              <Box>
                <Heading
                  as="h3"
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
      </Block>

      <Block title="What the benchmark does not yet measure">
        <Bullets
          items={[
            <>
              <b>Questions about a user&rsquo;s own areas are not run yet.</b>{" "}
              {page.benchmark.excluded} questions in the set ask about a custom
              area or a saved portfolio of sites; they need a seeded test
              account, so they are left out of the score for now. Portfolio
              questions that name many places are run.
            </>,
            <>
              <b>Many expected answers are drafted, not reviewed.</b> {drafted}{" "}
              questions&rsquo; expected answers have not been reviewed yet, so
              some failures may be errors in the expected answer, not in
              Horizon.
            </>,
            <>
              <b>Numbers are not yet checked against source totals.</b> We
              confirm the chart is complete and the reply&rsquo;s figures match
              it, not yet that they match the data service&rsquo;s own totals.
            </>,
            ...(unmeasured.length
              ? [
                  <>
                    <b>{unmeasured.length} question types are not tested yet</b>
                    : {unmeasured.join(", ")}. The benchmark has no questions of
                    these types, so they have no score.
                  </>,
                ]
              : []),
            <>
              <b>Some capabilities are still being confirmed.</b> Questions
              asking for satellite imagery, alert clusters, alert coordinates or
              concession boundaries accept either a correct answer or a clear
              &ldquo;not available yet&rdquo; until engineering confirms what
              Horizon supports.
            </>,
            <>
              <b>Clarifying questions are scored separately.</b> The check for
              &ldquo;did it ask instead of guessing&rdquo; is not yet stable.
              Dataset caveats are required by Horizon&rsquo;s instructions but
              not yet scored.
            </>,
          ]}
        />
      </Block>

      <Block title="Additional documentation coming by November">
        <Bullets
          items={[
            <>
              <b>A reference for every check.</b> For each individual check
              (validator): what it looks for, how it decides pass or fail, which
              question types it applies to, and whether it is scored by code or
              by an AI reviewer.
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
