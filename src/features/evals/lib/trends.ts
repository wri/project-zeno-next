/**
 * Trend series over the run index: one line per comparability group, so a
 * profile or trial-count change never masquerades as a rate change.
 */

import type { RunSummary, VerdictCounts } from "../model/types";
import { comparabilityKey } from "./comparability";

export interface TrendPoint {
  runId: string;
  path: string;
  started: string;
  build: string;
  casesetVersion: string;
  /** pass / (pass + fail); null when nothing was measured. */
  passRate: number | null;
  /** (rows - errors) / rows over all rows the run recorded. */
  availability: number | null;
  measured: number;
  verdicts: VerdictCounts;
}

export interface TrendSeries {
  key: string;
  label: string;
  points: TrendPoint[];
}

function toPoint(run: RunSummary): TrendPoint | null {
  if (!run.buckets) return null;
  const { verdicts, rowsTotal } = run.buckets;
  const measured = verdicts.pass + verdicts.fail;
  return {
    runId: run.runId,
    path: run.path,
    started: run.started,
    build: run.build,
    casesetVersion: run.casesetVersion,
    passRate: measured ? verdicts.pass / measured : null,
    availability: rowsTotal ? (rowsTotal - verdicts.error) / rowsTotal : null,
    measured,
    verdicts,
  };
}

export function seriesLabel(run: RunSummary): string {
  const trials = run.numTrials === 1 ? "1 trial" : `${run.numTrials} trials`;
  return [run.caseset, run.environment, run.ff ?? "default", trials].join(
    " · "
  );
}

/** Group runs by comparability key; points sorted by start time. */
export function buildTrendSeries(runs: RunSummary[]): TrendSeries[] {
  const groups = new Map<string, { label: string; points: TrendPoint[] }>();
  for (const run of runs) {
    const point = toPoint(run);
    if (!point) continue;
    const key = comparabilityKey(run);
    let group = groups.get(key);
    if (!group) {
      group = { label: seriesLabel(run), points: [] };
      groups.set(key, group);
    }
    group.points.push(point);
  }
  return [...groups.entries()]
    .map(([key, { label, points }]) => ({
      key,
      label,
      points: [...points].sort((a, b) => a.started.localeCompare(b.started)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
