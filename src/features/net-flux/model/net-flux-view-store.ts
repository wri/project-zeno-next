import { create } from "zustand";
import type { InsightWidget } from "@/app/types/chat";
import type { NetFluxDetail, NetFluxMeasure } from "./net-flux-variants";

export interface NetFluxView {
  detail: NetFluxDetail;
  measure: NetFluxMeasure;
}

/** Matches the design's default frame ("TS · Gross · Full detail"). */
export const DEFAULT_NET_FLUX_VIEW: NetFluxView = {
  detail: "full",
  measure: "gross",
};

export interface NetFluxViewState {
  byWidget: Record<string, NetFluxView>;
  setView: (widgetId: string, patch: Partial<NetFluxView>) => void;
}

/**
 * DETAIL/MEASURE selection for the net-flux insight, keyed by widget id.
 *
 * Shared rather than component-local because the design places the toggle
 * pills *outside* the widget card (in the workspace shell) while the chart
 * that reacts to them renders inside it — two components with no common
 * ancestor that knows about net flux. Keyed by widget id so several net-flux
 * insights in the workspace stack keep independent selections.
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
