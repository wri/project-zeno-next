/**
 * Session-level journey funnel: conversation → area selected → dataset
 * analysed → insight delivered. Stages are cumulative (a session only counts
 * in stage N if it passed every earlier stage), so counts are monotonically
 * decreasing and read as a true funnel.
 *
 * `datasetsAnalysed` is thread-cumulative server-side, which is exactly what
 * makes "any turn in the session has datasets" a valid session-level flag.
 */

import type { TraceRow } from "../../model/types";

export type FunnelStageKey = "sessions" | "aoi" | "dataset" | "insight";

export interface FunnelStage {
  readonly key: FunnelStageKey;
  readonly label: string;
  readonly count: number;
  /** Share of all sessions that reached this stage (0..1). */
  readonly shareOfTotal: number;
  /** Conversion from the previous stage (0..1; stage 0 is always 1). */
  readonly conversionFromPrev: number;
}

export interface JourneyFunnel {
  readonly totalSessions: number;
  readonly stages: readonly FunnelStage[];
  /**
   * False when no row in the window reported `hasInsight` — older traces
   * predate the flag, and the insight stage should render as unavailable.
   */
  readonly insightKnown: boolean;
  /**
   * Session keys that cleared the previous stage but stalled before this one
   * (the drop-off the funnel visualises). Keys match `sessionKey()`: a real
   * sessionId, or `trace:<id>` for rows without one.
   */
  readonly droppedBefore: Readonly<{
    aoi: readonly string[];
    dataset: readonly string[];
    insight: readonly string[];
  }>;
}

/** Funnel grouping key: the sessionId, or a per-trace pseudo-session. */
export function sessionKey(row: TraceRow): string {
  return String(row.sessionId ?? "").trim() || `trace:${row.traceId}`;
}

interface SessionFlags {
  aoi: boolean;
  dataset: boolean;
  insight: boolean;
}

/** Group rows into sessions and compute the cumulative journey funnel. */
export function computeJourneyFunnel(rows: readonly TraceRow[]): JourneyFunnel {
  const bySession = new Map<string, SessionFlags>();
  let insightKnown = false;

  for (const row of rows) {
    // Rows without a session id are their own single-turn pseudo-session.
    const key = sessionKey(row);
    const flags = bySession.get(key) ?? {
      aoi: false,
      dataset: false,
      insight: false,
    };
    flags.aoi ||= row.aoiName.trim() !== "" || row.isGlobal === true;
    flags.dataset ||= row.datasetsAnalysed.trim() !== "";
    flags.insight ||= row.hasInsight === true;
    if (row.hasInsight !== null) insightKnown = true;
    bySession.set(key, flags);
  }

  // One counting pass — a session only advances a stage if it cleared every
  // earlier one, so counts are monotonically decreasing (a true funnel). The
  // sessions that stall before a stage are kept so the UI can open them.
  let aoi = 0;
  let dataset = 0;
  let insight = 0;
  const droppedBeforeAoi: string[] = [];
  const droppedBeforeDataset: string[] = [];
  const droppedBeforeInsight: string[] = [];
  for (const [key, flags] of bySession.entries()) {
    if (!flags.aoi) {
      droppedBeforeAoi.push(key);
      continue;
    }
    aoi += 1;
    if (!flags.dataset) {
      droppedBeforeDataset.push(key);
      continue;
    }
    dataset += 1;
    if (flags.insight) {
      insight += 1;
    } else {
      droppedBeforeInsight.push(key);
    }
  }
  const total = bySession.size;

  const ordered: ReadonlyArray<{
    key: FunnelStageKey;
    label: string;
    count: number;
  }> = [
    { key: "sessions", label: "Conversations", count: total },
    { key: "aoi", label: "Area selected", count: aoi },
    { key: "dataset", label: "Dataset analysed", count: dataset },
    { key: "insight", label: "Insight delivered", count: insight },
  ];

  const stages = ordered.map((stage, i) => {
    const prev = i === 0 ? stage.count : ordered[i - 1].count;
    return {
      ...stage,
      shareOfTotal: total ? stage.count / total : 0,
      conversionFromPrev: prev ? stage.count / prev : i === 0 ? 1 : 0,
    };
  });

  return {
    totalSessions: total,
    stages,
    insightKnown,
    droppedBefore: {
      aoi: droppedBeforeAoi,
      dataset: droppedBeforeDataset,
      insight: droppedBeforeInsight,
    },
  };
}
