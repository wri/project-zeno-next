import { create } from "zustand";
import type { InsightWidget } from "@/app/types/chat";
import type { NetFluxMeasure } from "./net-flux-variants";

export interface NetFluxView {
  measure: NetFluxMeasure;
}

/** Matches the design's default frame ("TS · Gross"). */
export const DEFAULT_NET_FLUX_VIEW: NetFluxView = { measure: "gross" };

export interface NetFluxViewState {
  byWidget: Record<string, NetFluxView>;
  setView: (widgetId: string, patch: Partial<NetFluxView>) => void;
}

/**
 * MEASURE selection for the net-flux insight, keyed by widget id.
 *
 * Shared rather than component-local because the design places the pill
 * *outside* the widget card (in the workspace shell) while the chart that
 * reacts to it renders inside — two components with no common ancestor that
 * knows about net flux. Keyed by widget id so several net-flux insights in the
 * workspace stack keep independent selections.
 */
const useNetFluxViewStore = create<NetFluxViewState>((set) => ({
  byWidget: {},
  setView: (widgetId, patch) =>
    set((state) => ({
      byWidget: {
        ...state.byWidget,
        [widgetId]: {
          ...DEFAULT_NET_FLUX_VIEW,
          ...state.byWidget[widgetId],
          ...patch,
        },
      },
    })),
}));

/** Stable key for a widget's view state; ids are set by `chartsToWidgets`. */
export function netFluxViewKey(widget: InsightWidget): string {
  return widget.id ?? widget.title;
}

export default useNetFluxViewStore;
