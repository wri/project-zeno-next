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

const benchmarkKeys = {
  page: (run: BenchmarkRunRef | null) =>
    ["ai-accuracy-scorecards", "page", run?.ref, run?.runId] as const,
};

const PAGE_OPTIONS = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

/** One run's page data; pass null to disable. */
export function useBenchmarkPage(
  run: BenchmarkRunRef | null,
  gateway: BenchmarkGateway = defaultGateway
) {
  return useQuery({
    queryKey: benchmarkKeys.page(run),
    queryFn: ({ signal }) => gateway.page(run!, signal),
    enabled: !!run,
    ...PAGE_OPTIONS,
  });
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
    queries: runs.map((run) => ({
      queryKey: benchmarkKeys.page(run),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        gateway.page(run, signal),
      ...PAGE_OPTIONS,
    })),
    combine: (results) => results.map((r) => r.data),
  });
}
