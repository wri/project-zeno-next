/**
 * The five checks, in the order an answer is made: each dimension's
 * dedicated-check pass rate with its Wilson range. Recomputed from rows
 * (summarizeBuckets) because composed and CHALLENGE views have no
 * precomputed buckets block to consume.
 */

import { ATTRIBUTION_ORDER } from "../model/config";
import type { BucketName } from "../model/config";
import type { CaseRow } from "../model/types";
import { summarizeBuckets } from "./buckets";
import { wilson } from "./stats";

export interface CheckRate {
  bucket: BucketName;
  passed: number;
  evaluated: number;
  /** Null when no dedicated check of this dimension was evaluated. */
  rate: number | null;
  ciLow: number;
  ciHigh: number;
}

export function checkRates(rows: CaseRow[]): CheckRate[] {
  const { buckets } = summarizeBuckets(rows);
  return ATTRIBUTION_ORDER.map((bucket) => {
    const { passed, evaluated } = buckets[bucket].dedicated;
    const { low, high } = wilson(passed, evaluated);
    return {
      bucket,
      passed,
      evaluated,
      rate: evaluated ? passed / evaluated : null,
      ciLow: low,
      ciHigh: high,
    };
  });
}
