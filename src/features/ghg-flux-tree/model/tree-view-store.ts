import { create } from "zustand";
import type { InsightWidget } from "@/app/types/chat";
import type { FluxMeasure } from "./hierarchy";

export interface TreeView {
  measure: FluxMeasure;
  /** Ids of expanded nodes. Undefined until first seeded (fully expanded). */
  expanded?: string[];
}

/**
 * The design's default state: the MEASURE pill reads "Net" in both annual-average
 * frames. Net draws one signed bar per row and drops the gross-only chrome (the
 * value subtitle, the `n/a` markers, the net tick and its legend entry).
 */
export const DEFAULT_MEASURE: FluxMeasure = "net";

interface TreeViewState {
  byWidget: Record<string, TreeView>;
  setMeasure: (widgetId: string, measure: FluxMeasure) => void;
  /** Seeds the expansion set the first time a widget renders. */
  seedExpanded: (widgetId: string, ids: string[]) => void;
  toggleNode: (widgetId: string, nodeId: string) => void;
}

/**
 * Measure + tree-expansion state for the annual-average chart, keyed by widget
 * id.
 *
 * Shared rather than component-local because the design places the MEASURE pill
 * outside the widget card (on the workspace shell) while the chart reacting to
 * it renders inside — two components with no common ancestor that knows about
 * this chart. Keying by widget id keeps several such insights independent.
 */
const useTreeViewStore = create<TreeViewState>((set) => ({
  byWidget: {},
  setMeasure: (widgetId, measure) =>
    set((state) => ({
      byWidget: {
        ...state.byWidget,
        [widgetId]: { ...state.byWidget[widgetId], measure },
      },
    })),
  seedExpanded: (widgetId, ids) =>
    set((state) => {
      if (state.byWidget[widgetId]?.expanded) return state;
      return {
        byWidget: {
          ...state.byWidget,
          [widgetId]: {
            measure: state.byWidget[widgetId]?.measure ?? DEFAULT_MEASURE,
            expanded: ids,
          },
        },
      };
    }),
  toggleNode: (widgetId, nodeId) =>
    set((state) => {
      const view = state.byWidget[widgetId];
      const current = view?.expanded ?? [];
      const next = current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId];
      return {
        byWidget: {
          ...state.byWidget,
          [widgetId]: {
            measure: view?.measure ?? DEFAULT_MEASURE,
            expanded: next,
          },
        },
      };
    }),
}));

/** Stable key for a widget's view state; ids are set by `chartsToWidgets`. */
export function treeViewKey(widget: InsightWidget): string {
  return widget.id ?? widget.title;
}

export default useTreeViewStore;
