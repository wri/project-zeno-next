"use client";

/**
 * Composition root for the slice's data (ADR 0003): TanStack Query over the
 * gateway port, with the GitHub adapter as the default. The ledger only
 * changes on a git push (and GitHub raw caches ~5 minutes), so queries are
 * long-lived and never refetch on focus.
 */

import { useQueries, useQuery } from "@tanstack/react-query";
import type { EvalsGateway } from "../model/evals-gateway";
import type { CaseIndexEntry, EvalSet } from "../model/types";
import { RestEvalsGateway } from "../api/rest-evals-gateway";

const defaultGateway: EvalsGateway = new RestEvalsGateway();

const QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const evalsKeys = {
  index: ["evals", "index"] as const,
  run: (path: string) => ["evals", "run", path] as const,
  coverage: (set: EvalSet) => ["evals", "coverage", set] as const,
  casesIndex: (set: EvalSet) => ["evals", "cases", set] as const,
};

export function useRunIndex(gateway: EvalsGateway = defaultGateway) {
  return useQuery({
    queryKey: evalsKeys.index,
    queryFn: ({ signal }) => gateway.runIndex(signal),
    ...QUERY_OPTIONS,
  });
}

/** Fetch one run file by its repo-relative path; pass null to disable. */
export function useRun(
  path: string | null,
  gateway: EvalsGateway = defaultGateway
) {
  return useQuery({
    queryKey: evalsKeys.run(path ?? ""),
    queryFn: ({ signal }) => gateway.run(path!, signal),
    enabled: !!path,
    ...QUERY_OPTIONS,
  });
}

/**
 * Fetch several run files at once (the composed CHALLENGE by-type view).
 * Returns the loaded runs plus whether anything is still in flight.
 */
export function useRuns(
  paths: string[],
  gateway: EvalsGateway = defaultGateway
) {
  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: evalsKeys.run(path),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        gateway.run(path, signal),
      ...QUERY_OPTIONS,
    })),
  });
  return {
    runs: results.flatMap((result) => (result.data ? [result.data] : [])),
    isLoading: results.some((result) => result.isLoading),
    error: (results.find((result) => result.error)?.error ??
      null) as Error | null,
  };
}

export function useCoverage(
  set: EvalSet,
  gateway: EvalsGateway = defaultGateway
) {
  return useQuery({
    queryKey: evalsKeys.coverage(set),
    queryFn: ({ signal }) => gateway.coverage(set, signal),
    ...QUERY_OPTIONS,
  });
}

/** The set's cases keyed by uid — the join table for run rows. */
export function useCasesByUid(
  set: EvalSet,
  gateway: EvalsGateway = defaultGateway
) {
  return useQuery({
    queryKey: evalsKeys.casesIndex(set),
    queryFn: ({ signal }) => gateway.casesIndex(set, signal),
    select: (entries: CaseIndexEntry[]) =>
      new Map(entries.map((entry) => [entry.uid, entry])),
    ...QUERY_OPTIONS,
  });
}
