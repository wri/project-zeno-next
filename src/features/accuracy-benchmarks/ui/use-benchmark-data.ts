/**
 * Composition root for the slice's data (ADR 0003): TanStack Query over the
 * gateway port, with the GitHub adapter as the default. The run index
 * changes on a git push (and GitHub raw caches about 5 minutes); a run's
 * page file never changes once committed, so it is never refetched.
 */

import { useQueries, useQuery } from "@tanstack/react-query";
import type { BenchmarkGateway } from "../model/benchmark-gateway";
import type { GroupStats } from "../model/types";
import { GithubBenchmarkGateway } from "../api/github-benchmark-gateway";

const defaultGateway: BenchmarkGateway = new GithubBenchmarkGateway();

const benchmarkKeys = {
  runs: ["accuracy-benchmarks", "runs"] as const,
  page: (path: string) => ["accuracy-benchmarks", "page", path] as const,
};

const RUNS_OPTIONS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

const PAGE_OPTIONS = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export function useBenchmarkRuns(gateway: BenchmarkGateway = defaultGateway) {
  return useQuery({
    queryKey: benchmarkKeys.runs,
    queryFn: ({ signal }) => gateway.runs(signal),
    ...RUNS_OPTIONS,
  });
}

/** One run's page data; pass null to disable. */
export function useBenchmarkPage(
  path: string | null,
  gateway: BenchmarkGateway = defaultGateway
) {
  return useQuery({
    queryKey: benchmarkKeys.page(path ?? ""),
    queryFn: ({ signal }) => gateway.page(path!, signal),
    enabled: !!path,
    ...PAGE_OPTIONS,
  });
}

/**
 * The summaries of several runs' pages (the trend points of one version),
 * aligned with `paths`; undefined while a page loads. Combined so callers
 * re-render only when a summary arrives.
 */
export function useBenchmarkSummaries(
  paths: readonly string[],
  gateway: BenchmarkGateway = defaultGateway
): (GroupStats | undefined)[] {
  return useQueries({
    queries: paths.map((path) => ({
      queryKey: benchmarkKeys.page(path),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        gateway.page(path, signal),
      ...PAGE_OPTIONS,
    })),
    combine: (results) => results.map((r) => r.data?.summary),
  });
}
