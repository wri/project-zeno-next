"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import useViewContextStore from "@/app/store/viewContextStore";
import {
  pendingInsightWidgetKey,
  pendingInsightWidgetsFor,
  usePendingInsightWidgetsStore,
  type PendingInsightWidget,
} from "../model/pending-insight-widgets-store";

/** The pending curated modules on one dashboard, oldest first (grid reader). */
export function usePendingInsightWidgets(
  dashboardId: string
): PendingInsightWidget[] {
  return usePendingInsightWidgetsStore(
    useShallow((s) => pendingInsightWidgetsFor(s.entries, dashboardId))
  );
}

export interface PendingInsightWidgetControls {
  /** Reactive: whether this card's analysis is currently pending on the dashboard. */
  isPending: boolean;
  /**
   * Non-reactive read for async handlers: whether the entry still exists at
   * the moment of asking. A handler that began an entry, awaited the run and
   * then finds it gone knows the user toggled the card off meanwhile, and
   * must not add.
   */
  isPendingNow: () => boolean;
  begin: (entry: {
    title: string;
    datasetName: string;
    chartCountHint: number;
  }) => void;
  attachInsightId: (insightId: string) => void;
  clear: () => void;
}

/**
 * Write side of the pending-module store for one curated card, scoped to the
 * dashboard the viewer is on (view context). Off a dashboard every method is
 * a no-op and `isPending` is false, so the map surface never shows a skeleton.
 */
export function usePendingInsightWidget(
  datasetId: number
): PendingInsightWidgetControls {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const key = pendingInsightWidgetKey(dashboardId, datasetId);
  const isPending = usePendingInsightWidgetsStore(
    (s) => !!dashboardId && s.entries.some((e) => e.key === key)
  );

  const isPendingNow = useCallback(
    () =>
      !!dashboardId &&
      usePendingInsightWidgetsStore
        .getState()
        .entries.some((e) => e.key === key),
    [dashboardId, key]
  );

  const begin = useCallback<PendingInsightWidgetControls["begin"]>(
    (entry) => {
      if (!dashboardId) return;
      usePendingInsightWidgetsStore
        .getState()
        .begin({ dashboardId, datasetId, ...entry });
    },
    [dashboardId, datasetId]
  );

  const attachInsightId = useCallback(
    (insightId: string) => {
      if (!dashboardId) return;
      usePendingInsightWidgetsStore.getState().attachInsightId(key, insightId);
    },
    [dashboardId, key]
  );

  const clear = useCallback(() => {
    if (!dashboardId) return;
    usePendingInsightWidgetsStore.getState().clear(key);
  }, [dashboardId, key]);

  return { isPending, isPendingNow, begin, attachInsightId, clear };
}
