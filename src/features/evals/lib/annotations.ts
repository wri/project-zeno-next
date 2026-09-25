/**
 * Trend markers derived from the ledger itself (AJ, 2026-09-25: no
 * hand-kept annotation file here). A marker says *that* something changed
 * — a new build, a new caseset or benchmark version, or a move large
 * enough that consecutive Wilson intervals separate — and dips are marked
 * as faithfully as rises. Narrative text can later come from a ledger
 * annotations file keyed by run id.
 */

import { wilson } from "./stats";

export type MarkerKind =
  | "baseline"
  | "build"
  | "caseset"
  | "benchmark"
  | "rise"
  | "dip";

export interface MarkerPoint {
  runId: string;
  started: string;
  build: string;
  casesetVersion: string;
  benchmarkVersion?: string;
  passed: number;
  n: number;
}

export interface Marker {
  runId: string;
  started: string;
  kinds: MarkerKind[];
  /** Rate change from the previous point; absent on the baseline. */
  delta?: number;
}

const rate = (point: MarkerPoint) => (point.n ? point.passed / point.n : 0);

function movement(prev: MarkerPoint, cur: MarkerPoint): MarkerKind | null {
  if (!prev.n || !cur.n) return null;
  const a = wilson(prev.passed, prev.n);
  const b = wilson(cur.passed, cur.n);
  if (b.low > a.high) return "rise";
  if (b.high < a.low) return "dip";
  return null;
}

/** Markers for the points that warrant one, in input (time) order. */
export function deriveMarkers(points: readonly MarkerPoint[]): Marker[] {
  return points.flatMap((cur, index): Marker[] => {
    if (index === 0) {
      return [{ runId: cur.runId, started: cur.started, kinds: ["baseline"] }];
    }
    const prev = points[index - 1];
    const kinds: MarkerKind[] = [];
    if (cur.build !== prev.build) kinds.push("build");
    if (cur.casesetVersion !== prev.casesetVersion) kinds.push("caseset");
    if (cur.benchmarkVersion !== prev.benchmarkVersion) kinds.push("benchmark");
    const move = movement(prev, cur);
    if (move) kinds.push(move);
    if (kinds.length === 0) return [];
    return [
      {
        runId: cur.runId,
        started: cur.started,
        kinds,
        delta: rate(cur) - rate(prev),
      },
    ];
  });
}
