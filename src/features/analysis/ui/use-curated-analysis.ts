"use client";

import { useCallback, useMemo } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnalysisJobFailedError } from "../model/analysis-error";
import type { AnalysisResult } from "../model/analysis-result";
import type { AnalysisSelection } from "../model/analysis-selection";
import type { AnalysisService } from "../model/analysis-service";
import { analysisService } from "./analysis-service";

/**
 * Query options for one curated analysis, keyed on everything that changes
 * the answer (area identity, dataset, window). The query cache is the
 * session cache: a result lives for the SPA session and is never refetched
 * on its own.
 *
 * Deliberately NOT forwarding the query's abort `signal` to the service: the
 * backend job runs on regardless and persists an insight, so cancelling the
 * client poll when the pane closes would only lose the result and make the
 * next open start a second job (a duplicate row). Left unconsumed, TanStack
 * lets the in-flight fetch finish and settle into the cache with no observer,
 * and a re-opened card resubscribes to it.
 *
 * `retry: false`: a TanStack retry would re-submit a whole new job (another
 * persisted row and another wait), so failures surface once and wait for the
 * user. `gcTime: Infinity`: the default 5 min GC after the last observer
 * leaves would drop a finished result while the pane is closed, and the next
 * open would run the job again.
 */
export function curatedAnalysisQueryOptions(
  selection: AnalysisSelection,
  service: AnalysisService = analysisService
) {
  return queryOptions({
    queryKey: [
      "curatedAnalysis",
      selection.area.source,
      selection.area.srcId ?? null,
      selection.area.subtype ?? null,
      selection.dataset.id,
      selection.startDate,
      selection.endDate,
    ] as const,
    queryFn: () => service.run(selection),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

/**
 * - `not-run`: never started this session.
 * - `running`: submitted, polling (or a retry in flight).
 * - `ready`: completed with at least one chart.
 * - `no-data`: completed, but the backend produced no charts for this area.
 * - `unavailable`: the analysis job itself failed (backend gave up).
 * - `error`: transport failure (HTTP, incl. 401; network; client timeout).
 */
export type CuratedAnalysisState =
  | "not-run"
  | "running"
  | "ready"
  | "no-data"
  | "unavailable"
  | "error";

/**
 * Classifies a query's state: reactive (`useQuery` result) and imperative
 * (`queryClient.getQueryState`) callers must agree, so both go through here.
 */
function classify(query: {
  fetchStatus: "fetching" | "paused" | "idle";
  status: "pending" | "error" | "success";
  error: unknown;
  data: AnalysisResult | undefined;
}): CuratedAnalysisState {
  if (query.fetchStatus === "fetching") return "running";
  if (query.status === "error") {
    return query.error instanceof AnalysisJobFailedError
      ? "unavailable"
      : "error";
  }
  if (query.status === "success" && query.data) {
    return query.data.charts.length === 0 ? "no-data" : "ready";
  }
  return "not-run";
}

export interface UseCuratedAnalysis {
  state: CuratedAnalysisState;
  /**
   * Non-reactive read of the current state, for async handlers that have just
   * awaited `start`/`retry` and need to know how the run ended without waiting
   * for a render (a component's `state` is stale inside such a closure).
   */
  readState: () => CuratedAnalysisState;
  /** The completed analysis (charts may be empty); null until it completes. */
  result: AnalysisResult | null;
  /** The persisted insight id once the analysis has completed; else null. */
  insightId: string | null;
  /**
   * Runs the analysis unless a result is already cached or a run is already
   * in flight (both are reused). Resolves to the result, or null when the run
   * failed — the failure is reflected in `state`, so callers need not catch.
   */
  start: () => Promise<AnalysisResult | null>;
  /** Forces a fresh run, discarding a failed or empty result. Same contract as `start`. */
  retry: () => Promise<AnalysisResult | null>;
}

/**
 * Runs one curated analysis on demand and caches it for the session. The
 * `useQuery` observer is `enabled: false`: it only mirrors cache state (which
 * also switches off focus/reconnect/mount refetches, so an errored card never
 * silently re-runs); `start`/`retry` drive the fetch imperatively through the
 * QueryClient. Returns the raw `AnalysisResult`; presenting it (as insight
 * widgets, a dashboard module, ...) is the caller's concern. `service` is
 * injectable for tests.
 */
export function useCuratedAnalysis(
  selection: AnalysisSelection,
  service: AnalysisService = analysisService
): UseCuratedAnalysis {
  const queryClient = useQueryClient();
  const options = useMemo(
    () => curatedAnalysisQueryOptions(selection, service),
    [selection, service]
  );
  const query = useQuery({ ...options, enabled: false });

  const start = useCallback(async () => {
    try {
      return await queryClient.ensureQueryData(options);
    } catch {
      return null;
    }
  }, [queryClient, options]);

  const retry = useCallback(async () => {
    try {
      // staleTime 0 so a cached (empty) result is refetched rather than
      // returned; the observer's Infinity still governs everything else.
      return await queryClient.fetchQuery({ ...options, staleTime: 0 });
    } catch {
      return null;
    }
  }, [queryClient, options]);

  const readState = useCallback(() => {
    const cached = queryClient.getQueryState<AnalysisResult>(options.queryKey);
    return classify({
      fetchStatus: cached?.fetchStatus ?? "idle",
      status: cached?.status ?? "pending",
      error: cached?.error,
      data: cached?.data,
    });
  }, [queryClient, options]);

  return {
    state: classify(query),
    readState,
    result: query.data ?? null,
    insightId: query.data?.id ?? null,
    start,
    retry,
  };
}
