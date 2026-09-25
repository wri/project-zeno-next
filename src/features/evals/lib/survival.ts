/**
 * The compound effect: measured questions flowing through the five checks
 * in scope-first order, each stage peeling off the failures attributed to
 * it (primary, earliest-stage dimension). What survives every stage is the
 * pass count. Per the wireframe, the honest population is the questions
 * that exercise all five checks; when too few do, the funnel falls back
 * to every measured question and says so.
 */

import { ATTRIBUTION_ORDER, DEDICATED } from "../model/config";
import type { CaseIndexEntry, CaseRow } from "../model/types";
import { primaryDimension } from "./attribution";
import type { PrimaryDimension } from "./attribution";
import { rowVerdict } from "./verdict";

/** Below this many full-pipeline questions the funnel falls back. */
export const MIN_FULL_PIPELINE = 30;

export interface SurvivalStep {
  stage: PrimaryDimension;
  failed: number;
  survivors: number;
}

export interface Survival {
  population: "full-pipeline" | "all-measured";
  /** Questions entering the funnel. */
  start: number;
  steps: SurvivalStep[];
}

function spansAllDimensions(entry: CaseIndexEntry): boolean {
  const covered = new Set(
    entry.impliedChecks.flatMap((check) => DEDICATED[check] ?? [])
  );
  return ATTRIBUTION_ORDER.every((bucket) => covered.has(bucket));
}

export function survival(
  rows: readonly CaseRow[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>,
  { minFullPipeline = MIN_FULL_PIPELINE }: { minFullPipeline?: number } = {}
): Survival {
  const measured = rows.filter((row) => {
    const verdict = rowVerdict(row);
    return (
      casesByUid.has(row.uid) &&
      !row.staleCase &&
      (verdict === "pass" || verdict === "fail")
    );
  });
  const full = measured.filter((row) =>
    spansAllDimensions(casesByUid.get(row.uid)!)
  );
  const useFull = full.length >= minFullPipeline;
  const population = useFull ? full : measured;

  const failures = new Map<PrimaryDimension, number>();
  for (const row of population) {
    const dimension = primaryDimension(row);
    if (dimension) failures.set(dimension, (failures.get(dimension) ?? 0) + 1);
  }

  const stages: PrimaryDimension[] = [
    ...ATTRIBUTION_ORDER,
    ...(failures.get("unattributed") ? (["unattributed"] as const) : []),
  ];
  let survivors = population.length;
  const steps = stages.map((stage) => {
    const failed = failures.get(stage) ?? 0;
    survivors -= failed;
    return { stage, failed, survivors };
  });
  return {
    population: useFull ? "full-pipeline" : "all-measured",
    start: population.length,
    steps,
  };
}
