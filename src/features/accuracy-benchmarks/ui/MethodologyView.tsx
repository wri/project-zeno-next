import type { ReactNode } from "react";
import { Box, Grid, Heading, List, Text } from "@chakra-ui/react";
import { STAGE_LABELS, STAGE_ORDER, STAGE_QUESTIONS } from "../model/config";
import type { BenchmarkPage, StageKey } from "../model/types";
import { STAGE_COLORS } from "./palette";
import { Eyebrow } from "./parts";

/** What each check covers, why it matters, and what it does not test yet.
 * Wording from the published accuracy page, including the team's edits. */
const CHECKS: Readonly<Record<StageKey, readonly [string, string, string]>> = {
  scope: [
    "Whether Horizon answers when it should, asks a clarifying question when a request is ambiguous, and declines when it cannot answer safely, rather than guessing.",
    "A confident answer to the wrong question looks exactly like a right answer, which makes scope failures the hardest to spot.",
    "Asking back when one dataset clearly fits currently counts as a retrieval failure, because no data was fetched. Scope across multi-turn conversations is not tested.",
  ],
  retrieval: [
    "Whether Horizon finds the right place, chooses the right dataset, applies the right settings (thresholds, forest filters), uses the requested dates, and fetches the data.",
    "Correct math on the wrong place, dataset or years gives a confident answer about the wrong thing, which is worse than no answer.",
    "User-drawn custom areas and saved-area portfolios are not in the benchmark yet; they need seeded test accounts.",
  ],
  analysis: [
    "Whether the figures hold together: the chart is complete and the figures in the reply match it. Checked by code, not by a model, whenever an answer includes a chart.",
    "Analysis failures produce precise-looking numbers that are wrong, which could lead to users confidently citing incorrect numbers.",
    "Comparing figures with the data service's own totals is not yet in the benchmark; it is being built before the November freeze.",
  ],
  explanation: [
    "Whether the written answer says what the data says: no web sources used in place of the data, and required statements present where a question needs them (for example, not naming a commodity the driver data does not identify).",
    "The text is the part users read. A correct chart under text that over-claims a cause misleads even a careful reader.",
    "Dataset caveats are required by the system's instructions but not yet scored everywhere.",
  ],
  output: [
    "Whether the answer includes the right chart or map layer, and whether charts are well-formed and match the answer.",
    "A missing or broken chart makes a right answer unusable; the wrong chart type invites the wrong conclusion from correct data.",
    "Chart readability is not scored, only structural validity.",
  ],
};

function Block({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <Box as="section" py={6} borderTopWidth="1px" borderColor="border">
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

export function MethodologyView({ page }: { readonly page: BenchmarkPage }) {
  const real = page.questions.filter((q) => !q.synthetic).length;
  const synthetic = page.questions.length - real;
  const drafted = page.questions.filter((q) => q.drafted).length;
  const unmeasured = page.unmeasuredTypes.map(
    (t) => `${t.label.toLowerCase()} (${t.description})`
  );
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
        score means a change in the product.
      </Text>

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
              year to year.
            </>,
            <>
              <b>Draft status.</b> Selected questions need to be double checked
              and expected answers for the new questions have not been reviewed
              yet. The set is frozen as v2026 once the November baseline runs.
            </>,
          ]}
        />
      </Block>

      <Block title="Why question types matter">
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
              The Challenge Set keeps growing as we learn how Horizon is used,
              find new failures, and add questions we want Horizon to answer
              well.
            </>,
          ]}
        />
      </Block>

      <Block title="How the score is calculated">
        <Bullets
          items={[
            <>
              <b>Fixed questions.</b> Benchmark questions are fixed between
              runs, so a change in score means a change in the product. The
              benchmark set is re-versioned when new questions are added,
              questions change, or the scoring approach is adjusted (no more
              than once or twice a year).
            </>,
            <>
              <b>Three attempts.</b> Each question is asked three times.
              Reliable AI accuracy on priority use cases, our headline score, is
              the share of questions answered accurately on all three. We also
              report questions answered accurately on two of three (most of the
              time) and one of three (some of the time).
            </>,
            <>
              <b>Results by use case and question type</b> use the same measure
              as the headline. The one exception is the flow chart under
              &ldquo;Where do wrong answers go wrong?&rdquo;, which still counts
              a question as accurate if it was right on at least two of three
              tries.
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
              present.
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
                  <Box
                    w="10px"
                    h="10px"
                    borderRadius="2px"
                    bg={STAGE_COLORS[stage]}
                  />
                  {i + 1} · {STAGE_LABELS[stage]}
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={1}>
                  {STAGE_QUESTIONS[stage]}
                </Text>
              </Box>
              <Box as="dl" fontSize="sm" display="grid" gap={2}>
                {(
                  ["What we check", "Why it matters", "Not yet tested"] as const
                ).map((term, j) => (
                  <Box key={term}>
                    <Text as="dt" fontWeight="semibold">
                      {term}
                    </Text>
                    <Text as="dd" color="fg.muted">
                      {CHECKS[stage][j]}
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
    </Box>
  );
}
