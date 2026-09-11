/**
 * Type × dimension views for the Accuracy tab:
 * - coverageMatrix: which rows (query types or GOLD groups) can be
 *   MEASURED in which bucket, from the harness-stamped implied checks
 *   (cases_index.json) — the bucket_case_coverage recipe per row.
 * - typeBreakdown: pass + primary-failure mix per row from an actual run.
 * Rows with no cases render grey (n=0) — the taxonomy doubles as the
 * case-authoring roadmap.
 */

import { BUCKETS, DEDICATED, QUERY_TYPES, SHARED } from "../model/config";
import type { BucketName } from "../model/config";
import type { CaseIndexEntry, CaseRow } from "../model/types";
import { PRIMARY_DIMENSIONS, primaryDimension } from "./attribution";
import type { PrimaryDimension } from "./attribution";
import { rowVerdict } from "./verdict";

const ACTIVE_EXCLUDED = new Set(["not doing"]);

export interface RowDef {
  readonly label: string;
  readonly match: (entry: CaseIndexEntry) => boolean;
}

/** The mockup's 11-type taxonomy (CHALLENGE sets where they exist). */
export function challengeRowDefs(): RowDef[] {
  return QUERY_TYPES.map((type) => ({
    label: type.label,
    match: (entry) => !!type.set && entry.set === type.set,
  }));
}

/** GOLD has no query-type taxonomy; its rows are the store's groups. */
export function goldRowDefs(cases: CaseIndexEntry[]): RowDef[] {
  const groups = [...new Set(cases.map((entry) => entry.group))].sort();
  return groups.map((group) => ({
    label: group,
    match: (entry) => entry.group === group,
  }));
}

export interface MatrixCell {
  dedicated: number;
  sharedOnly: number;
}

export interface MatrixRow {
  label: string;
  /** Active cases matched; 0 renders the row grey. */
  n: number;
  cells: Record<BucketName, MatrixCell>;
}

/** Per-row bucket measurability from the stamped implied gating checks. */
export function coverageMatrix(
  cases: CaseIndexEntry[],
  rowDefs: readonly RowDef[]
): MatrixRow[] {
  const active = cases.filter(
    (entry) => !ACTIVE_EXCLUDED.has(entry.status.toLowerCase())
  );
  return rowDefs.map((def) => {
    const matched = active.filter(def.match);
    const cells = Object.fromEntries(
      BUCKETS.map((bucket) => [bucket, { dedicated: 0, sharedOnly: 0 }])
    ) as Record<BucketName, MatrixCell>;
    for (const entry of matched) {
      const dedicated = new Set<BucketName>();
      const shared = new Set<BucketName>();
      for (const check of entry.impliedChecks) {
        const bucket = DEDICATED[check];
        if (bucket) dedicated.add(bucket);
        for (const sharedBucket of SHARED[check] ?? []) {
          shared.add(sharedBucket);
        }
      }
      for (const bucket of BUCKETS) {
        if (dedicated.has(bucket)) cells[bucket].dedicated += 1;
        else if (shared.has(bucket)) cells[bucket].sharedOnly += 1;
      }
    }
    return { label: def.label, n: matched.length, cells };
  });
}

export interface TypeBreakdownRow {
  label: string;
  /** Measured rows (pass + fail) in the run; 0 renders grey. */
  n: number;
  pass: number;
  byDimension: Record<PrimaryDimension, number>;
  rate: number | null;
  /** Whether the store has active cases for this row at all — separates
   * "no case set yet" from "set exists but was not part of this run". */
  hasCases: boolean;
  /** The run this row's numbers came from (set on composed views). */
  runId?: string;
}

/** Pass + primary-failure mix per taxonomy row for one run's rows. */
export function typeBreakdown(
  rows: CaseRow[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>,
  rowDefs: readonly RowDef[]
): TypeBreakdownRow[] {
  return rowDefs.map((def) => {
    let n = 0;
    let pass = 0;
    const byDimension = Object.fromEntries(
      PRIMARY_DIMENSIONS.map((dimension) => [dimension, 0])
    ) as Record<PrimaryDimension, number>;
    for (const row of rows) {
      const entry = casesByUid.get(row.uid);
      if (!entry || row.staleCase || !def.match(entry)) continue;
      const verdict = rowVerdict(row);
      if (verdict !== "pass" && verdict !== "fail") continue;
      n += 1;
      if (verdict === "pass") pass += 1;
      else byDimension[primaryDimension(row) ?? "unattributed"] += 1;
    }
    const hasCases = [...casesByUid.values()].some(
      (entry) =>
        !ACTIVE_EXCLUDED.has(entry.status.toLowerCase()) && def.match(entry)
    );
    return {
      label: def.label,
      n,
      pass,
      byDimension,
      rate: n ? pass / n : null,
      hasCases,
    };
  });
}

export interface ComposableRun {
  runId: string;
  started: string;
  rows: CaseRow[];
}

/**
 * Compose one breakdown row per type from the LATEST run that measured it.
 * CHALLENGE diagnostics are set-scoped, so no single run covers every
 * type; composing per type is the analysis-side move the ledger doctrine
 * sanctions (compose_runs.py). Each lit row records the run it came from.
 */
export function composeTypeBreakdown(
  runs: ComposableRun[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>,
  rowDefs: readonly RowDef[]
): TypeBreakdownRow[] {
  const newestFirst = [...runs].sort((a, b) =>
    b.started.localeCompare(a.started)
  );
  return rowDefs.map((def) => {
    for (const run of newestFirst) {
      const [row] = typeBreakdown(run.rows, casesByUid, [def]);
      if (row.n > 0) return { ...row, runId: run.runId };
    }
    const [empty] = typeBreakdown([], casesByUid, [def]);
    return empty;
  });
}

export type MatrixCategory = "robust" | "thin" | "gap" | "none";

/**
 * Coverage floor of 3 mirrors audit_cases.py's report-only floor. A cell
 * with shared-only coverage is at best THIN: those failures can never be
 * attributed to the bucket.
 */
export const ROBUST_FLOOR = 3;

export function matrixCategory(cell: MatrixCell, n: number): MatrixCategory {
  if (n === 0) return "none";
  if (cell.dedicated >= ROBUST_FLOOR) return "robust";
  if (cell.dedicated > 0 || cell.sharedOnly > 0) return "thin";
  return "gap";
}
