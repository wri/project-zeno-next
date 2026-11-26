import { create } from "zustand";

interface RankingViewStore {
  /** 0-based page of each ranking chart, keyed by widget. */
  pageByWidget: Record<string, number>;
  setPage: (widgetKey: string, page: number) => void;
}

/**
 * The page of each ranking chart, keyed by widget (`widgetViewKey`).
 *
 * Shared rather than component state for the reason the other per-widget view
 * stores are: full-screen mounts a second copy of the chart that should open
 * on the page the card shows, and the map workspace swaps the widget on one
 * mounted card, which would carry one chart's page onto the next.
 */
const useRankingViewStore = create<RankingViewStore>((set) => ({
  pageByWidget: {},
  setPage: (widgetKey, page) =>
    set((state) => ({
      pageByWidget: { ...state.pageByWidget, [widgetKey]: page },
    })),
}));

export default useRankingViewStore;
