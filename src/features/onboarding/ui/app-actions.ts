/**
 * The tour's hands on the app: side effects that set the stage for a step,
 * and predicates that tell an action step the user has done the thing. This is
 * the only onboarding file that touches app stores, so the coupling is easy to
 * find when those stores change.
 */
import { NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
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
  // The Areas panel reopens on its last tab; the tour needs the boundary
  // cards, which only the Boundaries tab lists.
  useSidebarStore.getState().setAreasPanelFilter("boundaries");
  // Likewise the Data Catalog: a category without Tree cover loss hides the
  // row the first step points at.
  useSidebarStore.getState().setCatalogCategory("all");
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
  const sidebar = useSidebarStore.getState();
  sidebar.setCatalogCategory("all");
  sidebar.setDataCatalogOpen(true);
}

/** Opens the Areas panel on Boundaries, the tab the tour's steps describe. */
export function openAreasPanel(): void {
  useSidebarStore.getState().openAreasPanel("boundaries");
}

/**
 * Frame `bounds` in the open map area. flyToBounds already keeps clear of the
 * chat panel, any open side panel and the legend, reading them from the store
 * a frame later, so call it after closing the exploration panels.
 */
export function flyMapTo(bounds: LngLatBounds): void {
  const [[west, south], [east, north]] = bounds;
  useMapStore.getState().flyToBounds([
    [west, south],
    [east, north],
  ]);
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

// Only the kinds the predicates below look for, which a conversation never
// removes. The whole list would make a shifting baseline: sending drops a
// transient profile ask and a pending nudge can be withdrawn, either of which
// moves the next message below a baseline counted while it was there.
const trackedMessages = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.type === "user" || m.type === "area-card");

/** The baseline for the `...Since` predicates. */
export const chatMessageCount = () => trackedMessages().length;

export const insightCount = () => useInsightStore.getState().insights.length;

export const isChatLoading = () => useChatStore.getState().isLoading;

const messagesSince = (baseline: number) => trackedMessages().slice(baseline);

/** A user message was sent since `baseline` (from `chatMessageCount`). */
export const sentMessageSince = (baseline: number) =>
  messagesSince(baseline).some((m) => m.type === "user");

/** The agent has picked an area (an area card arrived) since `baseline`. */
export const areaCardSince = (baseline: number) =>
  messagesSince(baseline).some((m) => m.type === "area-card");

/** The request started after `baseline` has finished streaming. */
export const chatSettledSince = (baseline: number) =>
  !isChatLoading() && sentMessageSince(baseline);
