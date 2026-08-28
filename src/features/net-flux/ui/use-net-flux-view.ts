import { useCallback } from "react";

import useNetFluxViewStore, {
  DEFAULT_NET_FLUX_VIEW,
} from "../model/net-flux-view-store";
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
