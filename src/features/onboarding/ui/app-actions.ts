/**
 * The tour's hands on the app: side effects that set the stage for a step,
 * and predicates that tell an action step the user has done the thing. This is
 * the only onboarding file that touches app stores, so the coupling is easy to
 * find when those stores change.
 */
import { NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import { getMapControlsLeftPx } from "@/app/explorationLayout";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import {
  getDefaultDatasetId,
  seedDefaultDatasetLayer,
} from "@/app/utils/defaultMapLayers";
import { useSelectionStore } from "@/src/features/analysis";
import { isFeatureEnabled } from "@/src/shared/lib/feature-flags";
import {
  TOUR_ANCHORS,
  tourAnchorSelector,
} from "@/src/shared/lib/tour-anchors";

import type { LngLatBounds } from "../model/tour";

export const GADM_BOUNDARY_LAYER = "GADM";

/** Kenya, padded slightly so the whole outline sits inside the spotlight. */
export const KENYA_BOUNDS: LngLatBounds = [
  [33.7, -4.9],
  [42.1, 5.2],
];

/* ------------------------------------------------------------------ */
/* Side effects                                                        */
/* ------------------------------------------------------------------ */

export function closeExplorationPanels(): void {
  const sidebar = useSidebarStore.getState();
  sidebar.setDataCatalogOpen(false);
  sidebar.setAreasPanelOpen(false);
  sidebar.setInsightsPanelOpen(false);
}

/**
 * Empty map: no dataset or area layers, no boundary layer, no insights. Used
 * before the hands-on part (the user adds each piece) and again before the
 * chat part (so the old Kenya selection isn't sent as context).
 */
export function clearMap(): void {
  closeExplorationPanels();
  const map = useMapStore.getState();
  // reset() clears layers, area geometry and the map's analysis selection.
  map.reset();
  map.setSelectAreaLayer(null);
  // The analysis feature keeps its own copy of the selection; clear it too or
  // the "View analysis" nudge re-offers the old area.
  useSelectionStore.getState().clear();
  useInsightStore.getState().clearInsights();
}

/**
 * Put back what a fresh /app shows (default dataset + admin boundaries) if
 * the tour left the map empty, e.g. when skipped midway.
 */
export function restoreMapDefaults(): void {
  const map = useMapStore.getState();
  if (map.selectAreaLayer === null) map.setSelectAreaLayer(GADM_BOUNDARY_LAYER);
  const params = new URLSearchParams(window.location.search);
  seedDefaultDatasetLayer(
    getDefaultDatasetId(isFeatureEnabled(params, NET_FLUX_FEATURE_FLAG))
  );
}

export function openDataCatalog(): void {
  useSidebarStore.getState().setDataCatalogOpen(true);
}

export function openAreasPanel(): void {
  useSidebarStore.getState().setAreasPanelOpen(true);
}

const FIT_GAP_PX = 32;

/**
 * Frame `bounds` in the open map area, clear of the chat panel on the left
 * and the Map layers legend on the right. Call after closing the exploration
 * panels: the left edge comes from the closed-panel layout, not the DOM,
 * because the chat panel is still sliding back when this runs.
 */
export function flyMapTo(bounds: LngLatBounds): void {
  const { isChatFullSize } = useSidebarStore.getState();
  const left = getMapControlsLeftPx(isChatFullSize, false) + FIT_GAP_PX;
  const legend = document
    .querySelector(tourAnchorSelector(TOUR_ANCHORS.mapLegend))
    ?.getBoundingClientRect();
  const right = legend
    ? Math.round(window.innerWidth - legend.left) + FIT_GAP_PX
    : 120;
  const [[west, south], [east, north]] = bounds;
  useMapStore.getState().flyToBounds(
    [
      [west, south],
      [east, north],
    ],
    {
      linear: false,
      padding: { top: 96, bottom: 96, left, right },
      duration: 900,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Predicates (polled by action steps)                                 */
/* ------------------------------------------------------------------ */

export const isDataCatalogOpen = () =>
  useSidebarStore.getState().dataCatalogOpen;

export const isAreasPanelOpen = () => useSidebarStore.getState().areasPanelOpen;

export const isDatasetOnMap = (datasetId: number) => () =>
  useMapStore
    .getState()
    .layers.some((l) => l.datasetId === datasetId && !l.parentLayerId);

export const isBoundaryLayerShown = (layerId: string) => () =>
  useMapStore.getState().selectAreaLayer === layerId;

export const hasSelectedArea = () =>
  useMapStore.getState().layers.some((l) => isAreaLayer(l) && l.visible);

export const hasAcceptedViewAnalysis = () =>
  useChatStore
    .getState()
    .messages.some(
      (m) =>
        m.type === "view-analysis-nudge" && m.viewAnalysisSuggestion?.accepted
    );

export const chatMessageCount = () => useChatStore.getState().messages.length;

export const insightCount = () => useInsightStore.getState().insights.length;

export const isChatLoading = () => useChatStore.getState().isLoading;

const messagesSince = (baseline: number) =>
  useChatStore.getState().messages.slice(baseline);

/** A user message was sent after the first `baseline` messages. */
export const sentMessageSince = (baseline: number) =>
  messagesSince(baseline).some((m) => m.type === "user");

/** The agent has picked an area (an area card arrived) since `baseline`. */
export const areaCardSince = (baseline: number) =>
  messagesSince(baseline).some((m) => m.type === "area-card");

/** The request started after `baseline` has finished streaming. */
export const chatSettledSince = (baseline: number) =>
  !isChatLoading() && sentMessageSince(baseline);
