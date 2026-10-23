/**
 * Composition root for the slice's data (ADR 0003): TanStack Query over the
 * gateway port, with the GitHub adapter as the default. The data only
 * changes on a git push (and GitHub raw caches about 5 minutes), so queries
 * are long-lived and never refetch on focus.
 */

import { useQueries, useQuery } from "@tanstack/react-query";
import type { BenchmarkGateway } from "../model/benchmark-gateway";
import { GithubBenchmarkGateway } from "../api/github-benchmark-gateway";

const defaultGateway: BenchmarkGateway = new GithubBenchmarkGateway();

const QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const benchmarkKeys = {
  runs: ["accuracy-benchmarks", "runs"] as const,
  page: (path: string) => ["accuracy-benchmarks", "page", path] as const,
};

export function useBenchmarkRuns(gateway: BenchmarkGateway = defaultGateway) {
  return useQuery({
    queryKey: benchmarkKeys.runs,
    queryFn: ({ signal }) => gateway.runs(signal),
    ...QUERY_OPTIONS,
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
    ...QUERY_OPTIONS,
  });
}

/** Several runs' page data at once (the trend points of one version). */
export function useBenchmarkPages(
  paths: readonly string[],
  gateway: BenchmarkGateway = defaultGateway
) {
  return useQueries({
    queries: paths.map((path) => ({
      queryKey: benchmarkKeys.page(path),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        gateway.page(path, signal),
      ...QUERY_OPTIONS,
    })),
  });
}
