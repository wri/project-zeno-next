/**
 * The deepest layer: what people ask (taxonomy intent) x which data
 * (dataset). Each cell carries performance (composed-run pass rate with a
 * Wilson range) and coverage:
 * - CHALLENGE: ROBUST needs >= CHALLENGE_CELL_FLOOR active cases AND
 *   dedicated coverage of every dimension the intent requires;
 * - BENCHMARK: sampled, so ROBUST needs the dimensions only;
 * - THIN otherwise; NONE with no cases (we don't know — no score claimed).
 * Cross-cutting intents (Spatial, Refusal, Conceptual) get one spanning
 * cell measured across every dataset; every row also carries a pooled
 * `total` for the collapsed, intent-only read.
 */

import {
  ATTRIBUTION_ORDER,
  CHALLENGE_CELL_FLOOR,
  DATASET_COLUMNS,
  DEDICATED,
  QUERY_TYPES,
} from "../model/config";
import type { BucketName, QueryTypeDef } from "../model/config";
import type { CaseIndexEntry, CaseRow } from "../model/types";
import { caseDatasetIds, caseIntentKey } from "./case-facets";
import { baseCheckName } from "./checks";
import { wilson } from "./stats";
import { rowVerdict } from "./verdict";

const ACTIVE_EXCLUDED = new Set(["not doing"]);

export type CellCoverage = "robust" | "thin" | "none";
export type MatrixMode = "challenge" | "benchmark";

export interface IntentCell {
  /** Null for a cross-cutting intent's spanning cell. */
  datasetId: string | null;
  cases: number;
  measured: number;
  passed: number;
  rate: number | null;
  ciLow: number;
  ciHigh: number;
  coverage: CellCoverage;
  /** Required dimensions no case in the cell can fail in. */
  missing: BucketName[];
  /** Dimensions whose dedicated checks were evaluated in the scored rows
   * (can exceed the implied coverage when a run produced the artefact). */
  evaluated: BucketName[];
  /** A real prompt from the cell, for the plain-language read. */
  example?: string;
}

export interface IntentRow {
  def: QueryTypeDef;
  cells: IntentCell[];
  /** The intent across every dataset: all its evals pooled into one cell.
   * On a BENCHMARK sampled evenly per dataset, pooling equals the plain
   * per-dataset average. */
  total: IntentCell;
  /** Dataset columns holding at least one case of this intent. */
  datasetsCovered: number;
  /** Dataset-bound cases whose dataset could not be resolved. */
  unmapped: number;
}

export interface IntentMatrix {
  rows: IntentRow[];
}

function caseQuery(entry: CaseIndexEntry): string | undefined {
  return entry.query ?? entry.turns?.[0];
}

function coverageOf(
  cellCases: readonly CaseIndexEntry[],
  def: QueryTypeDef,
  mode: MatrixMode
): { coverage: CellCoverage; missing: BucketName[] } {
  const covered = new Set(
    cellCases.flatMap((entry) =>
      entry.impliedChecks.flatMap((check) => DEDICATED[check] ?? [])
    )
  );
  const missing = def.requires.filter((bucket) => !covered.has(bucket));
  if (cellCases.length === 0) return { coverage: "none", missing };
  const enoughCases =
    mode === "benchmark" || cellCases.length >= CHALLENGE_CELL_FLOOR;
  return {
    coverage: enoughCases && missing.length === 0 ? "robust" : "thin",
    missing,
  };
}

function buildCell(
  datasetId: string | null,
  cellCases: readonly CaseIndexEntry[],
  rowsByUid: ReadonlyMap<string, CaseRow>,
  def: QueryTypeDef,
  mode: MatrixMode
): IntentCell {
  let measured = 0;
  let passed = 0;
  const ran = new Set<BucketName>();
  for (const entry of cellCases) {
    const row = rowsByUid.get(entry.uid);
    if (!row || row.staleCase) continue;
    const verdict = rowVerdict(row);
    if (verdict !== "pass" && verdict !== "fail") continue;
    measured += 1;
    if (verdict === "pass") passed += 1;
    for (const [name, value] of Object.entries(row.checks)) {
      const bucket = DEDICATED[baseCheckName(name)];
      if (bucket && value !== null) ran.add(bucket);
    }
  }
  const { low, high } = wilson(passed, measured);
  const example = cellCases.map(caseQuery).find(Boolean);
  return {
    datasetId,
    cases: cellCases.length,
    measured,
    passed,
    rate: measured ? passed / measured : null,
    ciLow: low,
    ciHigh: high,
    ...coverageOf(cellCases, def, mode),
    evaluated: ATTRIBUTION_ORDER.filter((bucket) => ran.has(bucket)),
    ...(example ? { example } : {}),
  };
}

export function intentMatrix({
  cases,
  rows,
  mode,
  uids,
}: {
  cases: readonly CaseIndexEntry[];
  /** Composed run rows (latest run per intent). */
  rows: readonly CaseRow[];
  mode: MatrixMode;
  /** BENCHMARK's frozen sample; ignored in CHALLENGE mode. */
  uids?: ReadonlySet<string>;
}): IntentMatrix {
  const active = cases.filter(
    (entry) =>
      !ACTIVE_EXCLUDED.has(entry.status.toLowerCase()) &&
      (mode !== "benchmark" || !uids || uids.has(entry.uid))
  );
  const rowsByUid = new Map(rows.map((row) => [row.uid, row]));
  return {
    rows: QUERY_TYPES.map((def) => {
      const intentCases = active.filter(
        (entry) => caseIntentKey(entry) === def.key
      );
      const total = buildCell(null, intentCases, rowsByUid, def, mode);
      if (def.crossCutting) {
        return {
          def,
          cells: [total],
          total,
          datasetsCovered: 0,
          unmapped: 0,
        };
      }
      const cells = DATASET_COLUMNS.map((column) =>
        buildCell(
          column.datasetId,
          intentCases.filter((entry) =>
            caseDatasetIds(entry).includes(column.datasetId)
          ),
          rowsByUid,
          def,
          mode
        )
      );
      const known = new Set(DATASET_COLUMNS.map((c) => c.datasetId));
      const unmapped = intentCases.filter(
        (entry) => !caseDatasetIds(entry).some((id) => known.has(id))
      ).length;
      return {
        def,
        cells,
        total,
        datasetsCovered: cells.filter((cell) => cell.cases > 0).length,
        unmapped,
      };
    }),
  };
}
