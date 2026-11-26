/**
 * The AI accuracy scorecards page: how accurately Horizon answers the
 * BENCHMARK questions. Its views share one route
 * (`/ai-accuracy-scorecards?view=…`), so each view can be bookmarked. A
 * standalone page: no app header, only a link home. Data is precomputed
 * page data from the public gnw-gold-evals repo, for the runs
 * `model/releases.ts` lists: the newest fills the page, and the trend
 * plots them all. Open to everyone, signed in or not (AJ, 2026-10-29).
 */

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import { Link, useRouter, useSearchParams } from "@/src/shared/lib/router";
import { RELEASES } from "../model/releases";
import type { BenchmarkPage } from "../model/types";
import { resultsUrl } from "../api/github";
import { formatReleaseName } from "../lib/format";
import { releasedRuns, trendPoints } from "../lib/runs";
import { FailureFlowSection } from "./dashboard/FailureFlowSection";
import { Hero } from "./dashboard/Hero";
import { QuestionTypesSection } from "./dashboard/QuestionTypesSection";
import { UseCasesSection } from "./dashboard/UseCasesSection";
import { isView, pageHref, VIEW_LABELS, VIEWS, type View } from "./links";
import { MethodologyView } from "./MethodologyView";
import { QueryState } from "./QueryState";
import { QuestionsView } from "./QuestionsView";
import { HomeLink, Panel } from "./parts";
import { useBenchmarkPage, useBenchmarkPages } from "./use-benchmark-data";

const RUNS = releasedRuns(RELEASES);
// The newest release fills the page (AJ, 2026-11-19); older ones show only
// on the trend.
const RUN = RUNS[RUNS.length - 1];

function Dashboard({ page }: { readonly page: BenchmarkPage }) {
  // The headline of every released run; a point appears once its page
  // has loaded.
  const trend = trendPoints(RUNS, useBenchmarkPages(RUNS));
  return (
    <>
      <Hero
        page={page}
        trend={trend}
        methodologyHref={pageHref({ view: "methodology" })}
      />
      <FailureFlowSection page={page} />
      <UseCasesSection
        page={page}
        questionsHref={(useCase) => pageHref({ view: "questions", useCase })}
        methodologyHref={pageHref({
          view: "methodology",
          hash: "question-types",
        })}
      />
      <QuestionTypesSection page={page} />
      <Panel
        my={8}
        display="flex"
        gap={4}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
      >
        <Text color="fg.muted" fontSize="sm" maxW="60ch">
          How the questions were chosen, what an answer has to get right, and
          how the score is calculated.
        </Text>
        <Button asChild size="sm" colorPalette="primary">
          <Link href={pageHref({ view: "methodology" })}>
            Read the methodology →
          </Link>
        </Button>
      </Panel>
    </>
  );
}

export function AiAccuracyScorecardsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get("view") ?? null;
  // The checks had their own view until they moved into the methodology.
  const legacyChecks = viewParam === "checks";
  const view: View = legacyChecks
    ? "methodology"
    : isView(viewParam)
      ? viewParam
      : "dashboard";
  const page = useBenchmarkPage(RUN);
  const useCaseParam = searchParams?.get("uc") ?? "";

  const data = page.data;
  return (
    <Box maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} pb={12}>
      <Flex
        as="header"
        py={4}
        gap={4}
        align="center"
        justify="space-between"
        wrap="wrap"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <HStack gap={3} wrap="wrap">
          <HomeLink />
          <Text color="fg.muted">AI accuracy: priority use cases</Text>
          {data ? (
            <Badge
              colorPalette={data.run.draft ? "yellow" : "green"}
              variant="subtle"
            >
              {data.run.draft ? "Draft · " : ""}Benchmark Set v
              {data.benchmark.set}
            </Badge>
          ) : null}
        </HStack>
        <HStack gap={3} wrap="wrap">
          <Text fontSize="sm" color="fg.muted">
            {formatReleaseName(RUN.name)}
          </Text>
          <HStack as="nav" aria-label="Views" gap={1}>
            {VIEWS.map((v) => (
              <Button
                key={v}
                size="sm"
                variant={v === view ? "subtle" : "ghost"}
                aria-current={v === view ? "page" : undefined}
                onClick={() =>
                  router.replace(pageHref({ view: v }), { scroll: v !== view })
                }
              >
                {VIEW_LABELS[v]}
              </Button>
            ))}
          </HStack>
        </HStack>
      </Flex>

      <QueryState isLoading={page.isLoading} error={page.error} />

      {data ? (
        <>
          {view === "dashboard" ? <Dashboard page={data} /> : null}
          {view === "questions" ? (
            <QuestionsView
              key={useCaseParam}
              page={data}
              initialUseCase={useCaseParam}
            />
          ) : null}
          {view === "methodology" ? (
            <MethodologyView
              page={data}
              dashboardHref={pageHref({})}
              openChecks={legacyChecks}
            />
          ) : null}
          <Text
            as="footer"
            fontSize="xs"
            color="fg.subtle"
            pt={6}
            borderTopWidth="1px"
            borderColor="border"
          >
            Benchmark Set v{data.benchmark.set}
            {data.run.draft ? ", draft" : ""} ({data.benchmark.members}{" "}
            questions). Run {data.run.runId} on production, default tools,{" "}
            {data.run.numTrials} attempts per question
            {data.run.harnessSha ? `, harness ${data.run.harnessSha}` : ""}.
            Source:{" "}
            <ChakraLink
              href={resultsUrl(RUN.ref)}
              target="_blank"
              rel="noopener noreferrer"
            >
              gnw-gold-evals results
            </ChakraLink>
            .
          </Text>
        </>
      ) : null}
    </Box>
  );
}
