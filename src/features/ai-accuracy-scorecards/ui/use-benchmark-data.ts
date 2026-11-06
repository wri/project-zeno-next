/**
 * Composition root for the slice's data (ADR 0003): TanStack Query over the
 * gateway port, with the GitHub adapter as the default. Each page is read at
 * the commit its release pins, so it never changes and is never refetched.
 */

import { useQueries, useQuery } from "@tanstack/react-query";
import type { BenchmarkGateway } from "../model/benchmark-gateway";
import type { BenchmarkPage, BenchmarkRunRef } from "../model/types";
import { GithubBenchmarkGateway } from "../api/github-benchmark-gateway";

const defaultGateway: BenchmarkGateway = new GithubBenchmarkGateway();

function pageQuery(run: BenchmarkRunRef, gateway: BenchmarkGateway) {
  return {
    queryKey: ["ai-accuracy-scorecards", "page", run.ref, run.runId],
    queryFn: ({ signal }: { signal: AbortSignal }) => gateway.page(run, signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  } as const;
}

/** One run's page data. */
export function useBenchmarkPage(
  run: BenchmarkRunRef,
  gateway: BenchmarkGateway = defaultGateway
) {
  return useQuery(pageQuery(run, gateway));
}

/**
 * Several runs' pages (the trend's candidates), aligned with `runs`;
 * undefined while a page loads. Combined so callers re-render only when a
 * page arrives.
 */
export function useBenchmarkPages(
  runs: readonly BenchmarkRunRef[],
  gateway: BenchmarkGateway = defaultGateway
): (BenchmarkPage | undefined)[] {
  return useQueries({
    queries: runs.map((run) => pageQuery(run, gateway)),
    combine: (results) => results.map((r) => r.data),
  });
}
