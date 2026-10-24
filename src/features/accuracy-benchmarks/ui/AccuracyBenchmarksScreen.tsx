/**
 * The accuracy-benchmarks page: how accurately Horizon answers the
 * BENCHMARK questions, per run. Its views share one route
 * (`/accuracy-benchmarks?view=…&run=…`), so each view of a run can be
 * bookmarked. A standalone page: no app header, only a link home. Data is
 * precomputed page data from the public gnw-gold-evals repo; the superuser
 * gate lives in the route page and is UX-only.
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
import type { BenchmarkPage, BenchmarkRunRef } from "../model/types";
import { BENCHMARK_DATA_BRANCH } from "../api/github";
import { formatDay } from "../lib/format";
import { pickRun, trendRuns } from "../lib/runs";
import { ChecksView } from "./ChecksView";
import { FailureFlowSection } from "./dashboard/FailureFlowSection";
import { Hero } from "./dashboard/Hero";
import { QuestionTypesSection } from "./dashboard/QuestionTypesSection";
import type { TrendPoint } from "./dashboard/TrendChart";
import { UseCasesSection } from "./dashboard/UseCasesSection";
import { isView, pageHref, VIEW_LABELS, VIEWS, type View } from "./links";
import { MethodologyView } from "./MethodologyView";
import { QueryState } from "./QueryState";
import { QuestionsView } from "./QuestionsView";
import { HomeLink, Panel } from "./parts";
import {
  useBenchmarkPage,
  useBenchmarkRuns,
  useBenchmarkSummaries,
} from "./use-benchmark-data";

/** The headline of every canonical run of the page's version; a point
 * appears once its page has loaded. */
function useTrend(
  runs: readonly BenchmarkRunRef[],
  page: BenchmarkPage
): TrendPoint[] {
  const points = trendRuns(runs, page.benchmark.version);
  const summaries = useBenchmarkSummaries(points.map((r) => r.pagePath));
  return points.flatMap((run, i) => {
    const summary = summaries[i];
    return summary?.everyTime == null
      ? []
      : [
          {
            runId: run.runId,
            started: run.started,
            everyTime: summary.everyTime,
            majority: summary.majority,
            anyTime: summary.anyTime,
          },
        ];
  });
}

function Dashboard({
  page,
  runs,
}: {
  readonly page: BenchmarkPage;
  readonly runs: readonly BenchmarkRunRef[];
}) {
  const trend = useTrend(runs, page);
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

export function AccuracyBenchmarksScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get("view") ?? null;
  const view: View = isView(viewParam) ? viewParam : "dashboard";
  const runs = useBenchmarkRuns();
  const run = runs.data
    ? pickRun(runs.data, searchParams?.get("run") ?? null)
    : null;
  const page = useBenchmarkPage(run?.pagePath ?? null);
  const useCaseParam = searchParams?.get("uc") ?? "";

  function go(next: { view?: View; run?: string }) {
    router.replace(
      pageHref({ view: next.view ?? view, run: next.run ?? run?.runId }),
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
              colorPalette={data.benchmark.draftLabel ? "yellow" : "green"}
              variant="subtle"
            >
              {data.benchmark.draftLabel
                ? `${data.benchmark.draftLabel} · `
                : ""}
              Benchmark Set v{data.benchmark.set}
            </Badge>
          ) : null}
        </HStack>
        <HStack gap={3} wrap="wrap">
          {runs.data && runs.data.length > 1 && run ? (
            <NativeSelect.Root size="sm" width="auto">
              <NativeSelect.Field
                id="benchmark-run"
                aria-label="Run"
                value={run.runId}
                onChange={(e) => go({ run: e.target.value })}
              >
                {runs.data.toReversed().map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {formatDay(r.started)} · {r.versionLabel}
                    {r.canonical ? "" : " (not canonical)"}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          ) : null}
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

      <QueryState
        isLoading={runs.isLoading || page.isLoading}
        error={runs.error ?? page.error}
      />
      {runs.data && !run ? (
        <Text py={12} color="fg.muted">
          No benchmark run has page data on branch &ldquo;
          {BENCHMARK_DATA_BRANCH}&rdquo; yet.
        </Text>
      ) : null}

      {data && runs.data ? (
        <>
          {view === "dashboard" ? (
            <Dashboard page={data} runs={runs.data} />
          ) : null}
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
              dashboardHref={pageHref({ run: run?.runId })}
              checksHref={pageHref({ view: "checks", run: run?.runId })}
            />
          ) : null}
          {view === "checks" ? (
            <ChecksView
              page={data}
              dashboardHref={pageHref({ run: run?.runId })}
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
            {data.benchmark.draftLabel
              ? `, ${data.benchmark.draftLabel}`
              : ""}{" "}
            ({data.benchmark.members} questions). Run {data.run.runId} on
            production, default tools, {data.run.numTrials} attempts per
            question
            {data.run.harnessSha ? `, harness ${data.run.harnessSha}` : ""}.
            Source:{" "}
            <ChakraLink
              href={`https://github.com/wri/gnw-gold-evals/tree/${BENCHMARK_DATA_BRANCH}/results/benchmark`}
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
