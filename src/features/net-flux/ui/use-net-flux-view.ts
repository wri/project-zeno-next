import { useCallback } from "react";

import useNetFluxViewStore, {
  DEFAULT_NET_FLUX_VIEW,
} from "../model/net-flux-view-store";
import type { InsightWidget } from "@/app/types/chat";
import type { NetFluxMeasure } from "../model/net-flux-variants";

/**
 * Driving adapter for the net-flux view store: binds the shared MEASURE
 * selection to React. Lives in `ui` rather than `model` because `model` is the
 * framework-free core (ADR 0010) — the store itself stays pure.
 */
export function useNetFluxView(widgetId: string) {
  const view = useNetFluxViewStore(
    (s) => s.byWidget[widgetId] ?? DEFAULT_NET_FLUX_VIEW
  );
  const setView = useNetFluxViewStore((s) => s.setView);

  const setMeasure = useCallback(
    (measure: NetFluxMeasure) => setView(widgetId, { measure }),
    [setView, widgetId]
  );

  return { ...view, setMeasure };
}

/**
 * The selected chart within a net-flux group, and a setter. Separate from
 * `useNetFluxView` because the measure is per widget while the detail choice
 * belongs to the group of sibling charts.
 */
export function useNetFluxDetail(
  groupKey: string | null,
  siblings: InsightWidget[]
) {
  const selectedId = useNetFluxViewStore((s) =>
    groupKey ? s.detailByGroup[groupKey] : undefined
  );
  const selectDetail = useNetFluxViewStore((s) => s.selectDetail);

  const selected =
    siblings.find((w) => w.id === selectedId) ?? siblings[0] ?? null;

  const select = useCallback(
    (widgetId: string) => {
      if (groupKey) selectDetail(groupKey, widgetId);
    },
    [selectDetail, groupKey]
  );

  return { selected, select };
}

/** The whole per-group detail selection, for collapsing the workspace pager. */
export function useNetFluxDetailSelection(): Record<string, string> {
  return useNetFluxViewStore((s) => s.detailByGroup);
}
