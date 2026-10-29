/**
 * The AI accuracy scorecards page: how accurately Horizon answers the
 * BENCHMARK questions, per run. Its views share one route
 * (`/ai-accuracy-scorecards?view=…&run=…`), so each view of a run can be
 * bookmarked. A standalone page: no app header, only a link home. Data is
 * precomputed page data from the public gnw-gold-evals repo, for the runs
 * `model/releases.ts` lists. Open to everyone, signed in or not (AJ,
 * 2026-10-29).
 */

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Link as ChakraLink,
  NativeSelect,
  Text,
} from "@chakra-ui/react";
import { Link, useRouter, useSearchParams } from "@/src/shared/lib/router";
import { RELEASES } from "../model/releases";
import type { BenchmarkPage, TrendPoint } from "../model/types";
import { resultsUrl } from "../api/github";
import { pickRun, releasedRuns, trendPoints } from "../lib/runs";
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

/** The headline of every released run of the page's version; a point
 * appears once its page has loaded. */
function useTrend(page: BenchmarkPage): TrendPoint[] {
  return trendPoints(useBenchmarkPages(RUNS), page.benchmark.version);
}

function Dashboard({ page }: { readonly page: BenchmarkPage }) {
  const trend = useTrend(page);
  const runId = page.run.runId;
  return (
    <>
      <Hero
        page={page}
        trend={trend}
        methodologyHref={pageHref({ view: "methodology", run: runId })}
      />
      <FailureFlowSection page={page} />
      <UseCasesSection
        page={page}
        questionsHref={(useCase) =>
          pageHref({ view: "questions", run: runId, useCase })
        }
        methodologyHref={pageHref({
          view: "methodology",
          run: runId,
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
          <Link href={pageHref({ view: "methodology", run: runId })}>
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
  const run = pickRun(RUNS, searchParams?.get("run") ?? null);
  const page = useBenchmarkPage(run);
  const useCaseParam = searchParams?.get("uc") ?? "";

  function go(next: { view?: View; run?: string }) {
    router.replace(
      pageHref({ view: next.view ?? view, run: next.run ?? run.runId }),
      {
        scroll: next.view !== undefined && next.view !== view,
      }
    );
  }

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
          {RUNS.length > 1 ? (
            <NativeSelect.Root size="sm" width="auto">
              <NativeSelect.Field
                id="benchmark-run"
                aria-label="Run"
                value={run.runId}
                onChange={(e) => go({ run: e.target.value })}
              >
                {RUNS.toReversed().map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              {run.label}
            </Text>
          )}
          <HStack as="nav" aria-label="Views" gap={1}>
            {VIEWS.map((v) => (
              <Button
                key={v}
                size="sm"
                variant={v === view ? "subtle" : "ghost"}
                aria-current={v === view ? "page" : undefined}
                onClick={() => go({ view: v })}
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
              dashboardHref={pageHref({ run: run.runId })}
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
              href={resultsUrl(run.ref)}
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
