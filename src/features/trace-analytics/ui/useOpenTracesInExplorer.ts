"use client";

/**
 * Drill-down from an analytics aggregate to the Trace Explorer.
 *
 * Analytics categories (taxonomy axes, outcome cohorts, dataset/AOI buckets…)
 * are derived client-side, so they cannot be expressed as explorer fetch
 * filters. Instead, the exact rows behind a category are handed straight to
 * the explorer store (no refetch — the analytics window already holds them)
 * and the view switches to the Traces tab, where a banner explains the loaded
 * selection.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TraceRow } from "../model/types";
import { useExplorerStore } from "../model/dataStores";
import { EXPLORER_MAX_TRACES } from "../model/config";
import { tabHref } from "./links";

/** Sort key: newest first; rows without a timestamp go last. */
function tsKey(row: TraceRow): string {
  return row.timestamp ?? "";
}

/**
 * Returns `openTraces(label, rows)`: loads `rows` into the Trace Explorer as a
 * named selection and navigates to the Traces tab. `label` should say what the
 * selection is, e.g. `Topic = Fire · outcome Soft error`.
 */
export function useOpenTracesInExplorer(): (
  label: string,
  rows: readonly TraceRow[]
) => void {
  const router = useRouter();

  return useCallback(
    (label, rows) => {
      const entries = [...rows]
        .sort((a, b) => tsKey(b).localeCompare(tsKey(a)))
        .slice(0, EXPLORER_MAX_TRACES)
        .map((row) => ({
          id: row.traceId,
          prompt: row.prompt,
          traceTimestamp: row.timestamp,
          sessionId: row.sessionId,
        }));
      const capped = rows.length > entries.length;
      useExplorerStore
        .getState()
        .loadSelection(
          entries,
          capped
            ? `${label} (first ${entries.length} of ${rows.length})`
            : label
        );
      router.push(tabHref("traces"));
    },
    [router]
  );
}
