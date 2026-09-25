/**
 * Assembles the North Star view model from eligible runs and the case
 * index. Pure: every piece is a tested lib function; this only wires them
 * over the composition snapshots so each layer reads the same rows.
 */

import type { HeadlineSource } from "../../model/benchmark";
import type { CaseIndexEntry, RateStat, RunDetail } from "../../model/types";
import type { Marker } from "../../lib/annotations";
import { deriveMarkers } from "../../lib/annotations";
import type { CheckRate } from "../../lib/check-rates";
import { checkRates } from "../../lib/check-rates";
import type { IntentSource } from "../../lib/compose";
import { compositionSnapshots } from "../../lib/compose";
import type { IntentMatrix } from "../../lib/intent-matrix";
import { intentMatrix } from "../../lib/intent-matrix";
import type { NorthStar } from "../../lib/north-star";
import { northStar, rowsInSource } from "../../lib/north-star";
import { rollupRun } from "../../lib/rollup";
import type { Survival } from "../../lib/survival";
import { survival } from "../../lib/survival";

export interface TrendPoint {
  runId: string;
  started: string;
  build: string;
  casesetVersion: string;
  stat: RateStat;
  marker?: Marker;
}

export interface NorthStarModel {
  star: NorthStar;
  trend: TrendPoint[];
  checks: CheckRate[];
  /** Per-dimension rate history across snapshots, oldest first. */
  checkHistory: Record<CheckRate["bucket"], (number | null)[]>;
  survival: Survival;
  matrix: IntentMatrix;
  sources: IntentSource[];
  lastRun: string;
  /** Fewest trials among the runs the headline reads. */
  trials: number;
  casesetVersion: string;
}

export function buildNorthStarModel({
  runs,
  casesByUid,
  source,
}: {
  runs: readonly RunDetail[];
  casesByUid: ReadonlyMap<string, CaseIndexEntry>;
  source: HeadlineSource;
}): NorthStarModel | null {
  const snapshots = compositionSnapshots(runs, casesByUid);
  const last = snapshots.at(-1);
  if (!last) return null;
  const scoped = snapshots.map((snapshot) => ({
    ...snapshot,
    rows: rowsInSource(snapshot.rows, source),
  }));
  const current = scoped.at(-1)!;

  const points = scoped.map((snapshot) => ({
    runId: snapshot.runId,
    started: snapshot.started,
    build: snapshot.build,
    casesetVersion: snapshot.casesetVersion,
    stat: rollupRun(snapshot.rows, casesByUid).overall,
  }));
  // Composed CHALLENGE snapshots switch build with every set-scoped run,
  // so build changes only mean something for whole-benchmark runs.
  const markers = deriveMarkers(
    points.map((point) => ({
      ...point,
      passed: point.stat.passed,
      n: point.stat.n,
    }))
  )
    .map((marker) => ({
      ...marker,
      kinds:
        source.kind === "benchmark"
          ? marker.kinds
          : marker.kinds.filter((kind) => kind !== "build"),
    }))
    .filter((marker) => marker.kinds.length > 0);
  const markerByRun = new Map(markers.map((m) => [m.runId, m]));

  const history = scoped.map((snapshot) => checkRates(snapshot.rows));
  const checks = history.at(-1)!;
  const checkHistory = Object.fromEntries(
    checks.map((check, index) => [
      check.bucket,
      history.map((rates) => rates[index].rate),
    ])
  ) as NorthStarModel["checkHistory"];

  const sourceRuns = runs.filter((run) =>
    last.sources.some((s) => s.runId === run.runId)
  );
  return {
    star: northStar({ rows: current.rows, casesByUid, source }),
    trend: points.map((point) => ({
      ...point,
      ...(markerByRun.has(point.runId)
        ? { marker: markerByRun.get(point.runId) }
        : {}),
    })),
    checks,
    checkHistory,
    survival: survival(current.rows, casesByUid),
    matrix: intentMatrix({
      cases: [...casesByUid.values()],
      rows: current.rows,
      mode: source.kind,
      ...(source.kind === "benchmark" ? { uids: source.uids } : {}),
    }),
    sources: last.sources,
    lastRun: last.started,
    trials: Math.min(...sourceRuns.map((run) => run.numTrials)),
    casesetVersion: last.casesetVersion,
  };
}
