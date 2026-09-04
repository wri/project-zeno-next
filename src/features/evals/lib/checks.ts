/**
 * Check-name helpers, ported from gnw-gold-evals `src/goldset/buckets.py`.
 */

import { DEDICATED, INFO_ONLY_CHECKS, SHARED } from "../model/config";
import type { BucketName } from "../model/config";

const TURN_PREFIX = /^t\d+\./;

/** `t2.aoi_id_match` -> `aoi_id_match` (multi-turn rows prefix per turn). */
export function baseCheckName(check: string): string {
  return check.replace(TURN_PREFIX, "");
}

/** Info-only checks are reported for diagnosis but never enter a verdict. */
export function isInfoOnly(check: string): boolean {
  return INFO_ONLY_CHECKS.has(baseCheckName(check));
}

/** The bucket(s) a check speaks for: one (dedicated), two (shared) or none. */
export function bucketsFor(check: string): readonly BucketName[] {
  const base = baseCheckName(check);
  const dedicated = DEDICATED[base];
  if (dedicated) return [dedicated];
  return SHARED[base] ?? [];
}
