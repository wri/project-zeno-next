/**
 * Bucket summaries. Prefer CONSUMING the precomputed `run.buckets` block
 * (Overview, Trends, unfiltered run detail) — `summarizeBuckets` recomputes
 * it from rows and exists only for filtered views; a test asserts the two
 * agree on a full run. Ported from `src/goldset/buckets.py`.
 */

import { BUCKETS, DEDICATED, SHARED } from "../model/config";
import type { BucketName } from "../model/config";
import type {
  BucketEntry,
  BucketsBlock,
  CaseRow,
  VerdictCounts,
} from "../model/types";
import { baseCheckName, bucketsFor } from "./checks";
import { rowVerdict } from "./verdict";

function tally(
  rows: CaseRow[],
  names: ReadonlySet<string>,
  bucket: BucketName
): { passed: number; evaluated: number } {
  let passed = 0;
  let evaluated = 0;
  for (const row of rows) {
    for (const [name, value] of Object.entries(row.checks)) {
      if (
        names.has(baseCheckName(name)) &&
        bucketsFor(name).includes(bucket) &&
        value !== null
      ) {
        evaluated += 1;
        if (value === 1) passed += 1;
      }
    }
  }
  return { passed, evaluated };
}

/** Recompute the per-run bucket block from rows (for filtered views). */
export function summarizeBuckets(rows: CaseRow[]): BucketsBlock {
  // Errored rows are errors, not measurements: they leave bucket tallies
  // and coverage, but still count in the verdicts.
  const scored = rows.filter((row) => !row.error);
  const dedicatedNames = new Set(Object.keys(DEDICATED));
  const sharedNames = new Set(Object.keys(SHARED));
  const buckets = {} as Record<BucketName, BucketEntry>;
  for (const bucket of BUCKETS) {
    buckets[bucket] = {
      dedicated: tally(scored, dedicatedNames, bucket),
      shared: tally(scored, sharedNames, bucket),
      rowsCovered: scored.filter((row) =>
        Object.entries(row.checks).some(
          ([name, value]) => value !== null && bucketsFor(name).includes(bucket)
        )
      ).length,
    };
  }
  const verdicts: VerdictCounts = { pass: 0, fail: 0, error: 0, uncovered: 0 };
  for (const row of rows) verdicts[rowVerdict(row)] += 1;
  return { buckets, rowsTotal: rows.length, verdicts };
}

/** Dedicated pass rate per bucket, null where nothing was evaluated. */
export function bucketRates(
  block: BucketsBlock
): { bucket: BucketName; rate: number | null; evaluated: number }[] {
  return BUCKETS.map((bucket) => {
    const { passed, evaluated } = block.buckets[bucket].dedicated;
    return {
      bucket,
      rate: evaluated ? passed / evaluated : null,
      evaluated,
    };
  });
}
