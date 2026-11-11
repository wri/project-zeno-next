/**
 * The tour's hands on the app: side effects that set the stage for a step,
 * predicates that tell an action step the user has done the thing, and the
 * evidence that ticks checklist tasks. It holds nearly all of the tour's
 * coupling to app stores, so that is easy to find when those stores change.
 * Two components also read a store directly: `OnboardingTour` (chat and map
 * stores) and `OnboardingChecklist` (sidebar store, for where to sit).
 */
import { useCallback, useSyncExternalStore } from "react";

import {
  DATASET_CARD_BY_ID,
  INTEGRATED_ALERTS_DATASET_ID,
  NET_FLUX_FEATURE_FLAG,
} from "@/app/constants/datasets";
import { isQuotaExhausted } from "@/app/hooks/usePromptQuota";
import useAuthStore from "@/app/store/authStore";
import useChatStore, { isClarifyingTurn } from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import { isAreaLayer, type Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { showsWorking } from "@/app/components/WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";
import { CONCESSION_STYLES, type LayerId } from "@/app/types/map";
import {
  getDefaultDatasetId,
  seedDefaultDatasetLayer,
} from "@/app/utils/defaultMapLayers";
import {
  cancelRunningAnalyses,
  useSelectionStore,
} from "@/src/features/analysis";
import { isFeatureEnabled } from "@/src/shared/lib/feature-flags";

import type { ChecklistItemId } from "../model/onboarding-progress";

/* ------------------------------------------------------------------ */
/* Side effects                                                        */
/* ------------------------------------------------------------------ */

/** Put a ready-made question in the chat input, for the user to edit and send. */
export function prefillChatInput(text: string): void {
  useChatStore.getState().setDraftPrompt(text);
}

export function closeExplorationPanels(): void {
  const sidebar = useSidebarStore.getState();
  sidebar.setDataCatalogOpen(false);
  sidebar.setAreasPanelOpen(false);
  sidebar.setInsightsPanelOpen(false);
}

function clearSelectionAndCharts(): void {
  // The analysis feature keeps its own copy of the selection; clear it too or
  // the "View analysis" nudge re-offers the old area.
  useSelectionStore.getState().clear();
  // A chart still loading (e.g. the hand-run analysis, left before it
  // finished) would otherwise land on the cleared map, in the next question.
  cancelRunningAnalyses();
  useInsightStore.getState().clearInsights();
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
  clearSelectionAndCharts();
}

/**
 * Takes the areas and charts off the map but keeps the dataset, before the
 * chat question: its dataset chip shows what goes with a question, while the
 * place comes from what the user types (an old Kenya chip would contradict a
 * changed place).
 */
export function clearAreasAndCharts(): void {
  closeExplorationPanels();
  const map = useMapStore.getState();
  for (const layer of map.layers.filter(isAreaLayer)) {
    (layer.featureRefs ?? []).forEach(map.removeFromRegistry);
    map.removeLayer(layer.id);
  }
  map.clearAnalysis();
  clearSelectionAndCharts();
}

/** Takes every dataset layer off the map (and so its chip off the chat box). */
export function clearDatasetLayers(): void {
  useMapStore.getState().removeDatasetLayers();
}

/**
 * Put back what a fresh /app shows (default dataset + admin boundaries) if
 * the tour left the map empty, e.g. when skipped midway.
 */
export function restoreMapDefaults(): void {
  const map = useMapStore.getState();
  if (map.selectAreaLayer === null)
    map.setSelectAreaLayer(useMapStore.getInitialState().selectAreaLayer);
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

/** Shows a dataset on the map, unless one already shows. */
export function showDatasetOnMap(datasetId: number): void {
  seedDefaultDatasetLayer(datasetId);
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

export const hasSelectedArea = () =>
  useMapStore.getState().layers.some((l) => isAreaLayer(l) && l.visible);

export const hasAcceptedViewAnalysis = () =>
  useChatStore
    .getState()
    .messages.some(
      (m) =>
        m.type === "view-analysis-nudge" && m.viewAnalysisSuggestion?.accepted
    );

// Only the user's questions, which a conversation never removes. The whole
// list would make a shifting baseline: sending drops a transient profile ask
// and a pending nudge can be withdrawn, either of which moves the next
// message below a baseline counted while it was there.
const trackedMessages = () =>
  useChatStore.getState().messages.filter((m) => m.type === "user");

/** The baseline for the `...Since` predicates. */
export const chatMessageCount = () => trackedMessages().length;

export const insightCount = () => useInsightStore.getState().insights.length;

export const isChatLoading = () => useChatStore.getState().isLoading;

/** A chart is being made (the insight workspace shows its skeleton). */
export const isGeneratingInsight = () =>
  useChatStore.getState().isGeneratingInsight;

/** Answers finished in this conversation: the baseline for `answerFailedSince`. */
export const answeredCount = () => useChatStore.getState().completedAnswers;

/** A user message was sent since `baseline` (from `chatMessageCount`). */
export const sentMessageSince = (baseline: number) =>
  chatMessageCount() > baseline;

/** The request started after `baseline` has finished streaming. */
export const chatSettledSince = (baseline: number) =>
  !isChatLoading() && sentMessageSince(baseline);

/**
 * The question sent since `baseline` finished without an answer: an error, a
 * timeout, or a clarifying question instead. The chat store counts an answer
 * only when the turn ends with one (`completedAnswers`); `answerBaseline` is
 * that count from before the question (`answeredCount`).
 */
export const answerFailedSince = (baseline: number, answerBaseline: number) =>
  chatSettledSince(baseline) && answeredCount() === answerBaseline;

/**
 * The last question's turn ends by asking the user to choose (a nudge): the
 * assistant asked a question back. The chat store's rule (`isClarifyingTurn`),
 * which is also why `answerFailedSince` holds for such a turn.
 */
export const lastTurnAsksToChoose = () => {
  const { messages } = useChatStore.getState();
  const question = messages.findLastIndex((m) => m.type === "user");
  return question !== -1 && isClarifyingTurn(messages.slice(question + 1));
};

/** Today's prompts are used up, so the chat input is disabled. */
export const promptsExhausted = () => {
  const { usedPrompts, totalPrompts } = useAuthStore.getState();
  return isQuotaExhausted(usedPrompts, totalPrompts);
};

/**
 * The hand-run chart failed: nothing is loading any more and no chart
 * arrived. Meaningful once the user has accepted View analysis (check
 * `hasAcceptedViewAnalysis` first); accepting starts the load in the same
 * click, so this can't hold in between.
 */
export const handRunChartFailed = () =>
  !isGeneratingInsight() && insightCount() === 0;

/**
 * The chart that leads the map's card (the newest analysis; its charts share
 * one origin) offers Show working: it was made with code the AI wrote. A
 * curated chart has none. Same rule as `WidgetMessage`.
 */
export const leadChartShowsWorking = () => {
  const lead = useInsightStore.getState().insights.at(-1);
  return !!lead && showsWorking(lead);
};

/**
 * Reads app state in a step body and re-renders it when the chat, the
 * charts or the prompt allowance change. `read` must return a primitive
 * (compared by value).
 */
export function useAppValue<T extends boolean | number | string>(
  read: () => T
): T {
  const subscribe = useCallback((onChange: () => void) => {
    const stops = [
      useChatStore.subscribe(onChange),
      useInsightStore.subscribe(onChange),
      useAuthStore.subscribe(onChange),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);
  return useSyncExternalStore(subscribe, read, read);
}

/* ------------------------------------------------------------------ */
/* Checklist evidence                                                  */
/* ------------------------------------------------------------------ */

/** The checklist tasks the app can see being done; the rest are ticked by hand. */
export type DetectedChecklistItemId = Exclude<ChecklistItemId, "dashboard-pdf">;

// Typed so the build fails if the protected areas boundary layer goes.
const PROTECTED_AREAS_LAYER: LayerId = "WDPA";

/**
 * Area sources that are a protected area or a concession. A boundary click
 * names the source by its layer id ("WDPA", "OIL_PALM"); search and the
 * assistant use the backend key, which is that id lowercased.
 */
const PROTECTED_OR_CONCESSION_SOURCES: ReadonlySet<string> = new Set(
  [PROTECTED_AREAS_LAYER, ...Object.keys(CONCESSION_STYLES)].map((id) =>
    id.toLowerCase()
  )
);

const CUSTOM_AREA_SOURCE = "custom";

const areaSources = (layer: Layer): string[] =>
  [
    ...(layer.featureRefs ?? []).map((r) => r.source),
    ...(layer.aoiSelection?.aois ?? []).map((a) => a.source),
  ].map((source) => source.toLowerCase());

/** One key per place on a layer: an assistant selection can hold several. */
const placeKeys = (layer: Layer): string[] =>
  layer.aoiSelection?.aois.length
    ? layer.aoiSelection.aois.map(
        (a) => `${a.source.toLowerCase()}:${a.src_id}`
      )
    : (layer.featureRefs ?? []).map(
        (r) => `${r.source.toLowerCase()}:${r.srcId ?? r.name}`
      );

const chartKey = (w: InsightWidget): string => w.insightId ?? w.id ?? w.title;

/**
 * What on the map now shows each detectable task was done, as stable keys
 * (layer ids, chart ids). The watcher ticks a task when a key appears that it
 * has not seen before, so state left over from the first-run tour can't
 * tick anything.
 */
export function checklistEvidence(): Record<
  DetectedChecklistItemId,
  readonly string[]
> {
  const { layers } = useMapStore.getState();
  const areas = layers.filter((l) => l.visible && isAreaLayer(l));
  // Only the assistant's picks (`selectionName` is set by pick_aoi): a drawn
  // area kept beside a searched place is two places, but no comparison.
  const asked = areas.filter((l) => !!l.selectionName);
  const places = [...new Set(asked.flatMap(placeKeys))].sort();
  const alerts = DATASET_CARD_BY_ID[INTEGRATED_ALERTS_DATASET_ID].dataset_name;
  const { insights } = useInsightStore.getState();
  return {
    alerts: insights
      .filter((w) => (w.datasetName ?? w.analysisParams?.dataset) === alerts)
      .map(chartKey),
    "protected-area": areas
      .filter((l) =>
        areaSources(l).some((s) => PROTECTED_OR_CONCESSION_SOURCES.has(s))
      )
      .map((l) => l.id),
    "own-area": areas
      .filter((l) => areaSources(l).includes(CUSTOM_AREA_SOURCE))
      .map((l) => l.id),
    // Two places the assistant picked, in one selection or two. Keyed by
    // the places.
    compare: places.length >= 2 ? [places.join("|")] : [],
    "satellite-imagery": layers.filter((l) => !!l.imagery).map((l) => l.id),
  };
}

/** Calls `onChange` whenever the map or the charts change; returns the stop. */
export function subscribeToChecklistEvidence(onChange: () => void): () => void {
  const stops = [
    useMapStore.subscribe(onChange),
    useInsightStore.subscribe(onChange),
  ];
  return () => stops.forEach((stop) => stop());
}
