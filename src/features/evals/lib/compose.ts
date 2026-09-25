/**
 * Composition across set-scoped runs. CHALLENGE runs each cover one set,
 * so a whole-store view takes every intent from the newest run that
 * measured it (the analysis-side move the ledger sanctions in
 * compose_runs.py). Snapshots replay that composition run by run, giving
 * the headline a history even though no single run covers every intent.
 */

import type { CaseIndexEntry, CaseRow } from "../model/types";
import { caseIntentKey } from "./case-facets";

export interface SnapshotRun {
  runId: string;
  started: string;
  build: string;
  casesetVersion: string;
  numTrials: number;
  rows: CaseRow[];
}

export interface IntentSource {
  intent: string;
  runId: string;
}

export interface Composition {
  /** Rows sorted by uid, one intent's rows per source run. */
  rows: CaseRow[];
  sources: IntentSource[];
}

export interface Snapshot extends Composition {
  /** The run whose arrival produced this snapshot. */
  runId: string;
  started: string;
  build: string;
  casesetVersion: string;
  numTrials: number;
}

const byStarted = (a: { started: string }, b: { started: string }) =>
  a.started.localeCompare(b.started);

function rowsByIntent(
  rows: readonly CaseRow[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>
): Map<string, CaseRow[]> {
  const grouped = new Map<string, CaseRow[]>();
  for (const row of rows) {
    const entry = casesByUid.get(row.uid);
    if (!entry || row.staleCase) continue;
    const intent = caseIntentKey(entry);
    if (!intent) continue;
    grouped.set(intent, [...(grouped.get(intent) ?? []), row]);
  }
  return grouped;
}

export function composeRowsByIntent(
  runs: readonly Pick<SnapshotRun, "runId" | "started" | "rows">[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>
): Composition {
  const taken = new Map<string, { runId: string; rows: CaseRow[] }>();
  for (const run of [...runs].sort(byStarted).reverse()) {
    for (const [intent, rows] of rowsByIntent(run.rows, casesByUid)) {
      if (!taken.has(intent)) taken.set(intent, { runId: run.runId, rows });
    }
  }
  const sources = [...taken.entries()]
    .map(([intent, { runId }]) => ({ intent, runId }))
    .sort((a, b) => a.intent.localeCompare(b.intent));
  const rows = [...taken.values()]
    .flatMap((source) => source.rows)
    .sort((a, b) => a.uid.localeCompare(b.uid));
  return { rows, sources };
}

/** One cumulative composition per run, oldest first. */
export function compositionSnapshots(
  runs: readonly SnapshotRun[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>
): Snapshot[] {
  const ordered = [...runs].sort(byStarted);
  return ordered.map((run, index) => ({
    ...composeRowsByIntent(ordered.slice(0, index + 1), casesByUid),
    runId: run.runId,
    started: run.started,
    build: run.build,
    casesetVersion: run.casesetVersion,
    numTrials: run.numTrials,
  }));
}
