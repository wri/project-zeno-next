/**
 * Primary-failure attribution for the Accuracy view (AJ, 2026-09-04): the
 * mockup wants one dimension per failed case, which the harness's scoring
 * deliberately does not provide. The rule here: the bucket of the earliest
 * failing DEDICATED check in ATTRIBUTION_ORDER (scope first — the wrong
 * kind of work outranks wrong data). Rows failing only shared/unknown
 * checks are "unattributed" rather than forced into a bucket. Label this
 * "primary (earliest-stage) failure dimension" wherever it renders.
 */

import { ATTRIBUTION_ORDER, DEDICATED } from "../model/config";
import type { BucketName } from "../model/config";
import type { CaseRow } from "../model/types";
import { baseCheckName, isInfoOnly } from "./checks";
import { rowVerdict } from "./verdict";

export type PrimaryDimension = BucketName | "unattributed";

export const PRIMARY_DIMENSIONS: readonly PrimaryDimension[] = [
  ...ATTRIBUTION_ORDER,
  "unattributed",
];

/** The failed row's primary dimension; null when the row is not a fail. */
export function primaryDimension(row: CaseRow): PrimaryDimension | null {
  const failing = Object.keys(row.checks).filter(
    (name) => row.checks[name] === 0 && !isInfoOnly(name)
  );
  if (failing.length === 0) return null;
  const dedicated = new Set<BucketName>();
  for (const name of failing) {
    const bucket = DEDICATED[baseCheckName(name)];
    if (bucket) dedicated.add(bucket);
  }
  for (const bucket of ATTRIBUTION_ORDER) {
    if (dedicated.has(bucket)) return bucket;
  }
  return "unattributed";
}

export interface AccuracyBreakdown {
  /** All rows the run recorded (the headline denominator, HTML-report parity). */
  total: number;
  pass: number;
  byDimension: Record<PrimaryDimension, number>;
  /** Rows outside the pass/fail flow, shown as exclusions when non-zero. */
  error: number;
  uncovered: number;
}

/** Score a run's rows into pass + primary failure dimensions. */
export function accuracyBreakdown(rows: CaseRow[]): AccuracyBreakdown {
  const byDimension = Object.fromEntries(
    PRIMARY_DIMENSIONS.map((dimension) => [dimension, 0])
  ) as Record<PrimaryDimension, number>;
  let pass = 0;
  let error = 0;
  let uncovered = 0;
  for (const row of rows) {
    const verdict = rowVerdict(row);
    if (verdict === "pass") pass += 1;
    else if (verdict === "error") error += 1;
    else if (verdict === "uncovered") uncovered += 1;
    else byDimension[primaryDimension(row) ?? "unattributed"] += 1;
  }
  return { total: rows.length, pass, byDimension, error, uncovered };
}
