"use client";

import { useMemo } from "react";
import type { HeadlineSource } from "../../model/benchmark";
import { eligibleRuns } from "../../lib/north-star";
import { useCasesByUid, useRunIndex, useRuns } from "../use-evals-data";
import { buildNorthStarModel } from "./model";

/** The North Star view model for a headline source (CHALLENGE store). */
export function useNorthStar(source: HeadlineSource) {
  const index = useRunIndex();
  const cases = useCasesByUid("challenge");
  const runs = useMemo(
    () => eligibleRuns(index.data?.challenge ?? [], source),
    [index.data, source]
  );
  const details = useRuns(runs.map((run) => run.path));
  const loaded = details.runs.length === runs.length;

  const model = useMemo(
    () =>
      cases.data && loaded && runs.length > 0
        ? buildNorthStarModel({
            runs: details.runs,
            casesByUid: cases.data,
            source,
          })
        : null,
    [cases.data, loaded, runs.length, details.runs, source]
  );

  return {
    model,
    headlineRun: runs.at(-1) ?? null,
    hasRuns: runs.length > 0,
    isLoading: index.isLoading || cases.isLoading || details.isLoading,
    error: (index.error ?? cases.error ?? details.error) as Error | null,
  };
}
