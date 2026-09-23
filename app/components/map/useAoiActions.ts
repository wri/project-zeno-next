import { useEffect } from "react";
import { useRouter } from "@/src/shared/lib/router";

import { toaster } from "@/app/components/ui/toaster";
import { DATASET_BY_ID, isViewOnlyDataset } from "@/app/constants/datasets";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import { runAnalysis } from "@/app/lib/analysis/runAnalysis";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { toPolygons } from "@/app/utils/selectionPolygons";
import {
  isAnalysableForSource,
  useAnalysis,
  useSelectionStore,
  resolveAnalysisWindow,
} from "@/src/features/analysis";
import { useCreateDashboardForArea } from "@/src/features/dashboards";

/**
 * The area an actions menu is attached to.
 *
 * Passed in rather than read from `mapStore.analysisSelection`, because the
 * menu lives on the map's bbox label, which renders for every area layer. That
 * includes AOIs the agent picked, which never populate `analysisSelection`
 * (only a manual GADM click does — see `VectorAreasLayer`).
 */
export interface AoiActionsTarget {
  /** The managed layer this label belongs to; what "remove from map" drops. */
  layerId: string;
  areaName: string;
  source: string;
  /** Absent when the source feature carried no id/subtype. */
  srcId?: string;
  subtype?: string;
}

export interface AoiActions {
  areaName: string;
  /** True when a dataset is active, so the ANALYSIS group applies. */
  hasDataset: boolean;
  /** False when the active dataset's analysis doesn't cover this kind of area. */
  canViewAnalysis: boolean;
  /** False for areas the user already owns — a custom area is already saved. */
  canSaveArea: boolean;
  /** False when the AOI has no resolvable id, or while dashboards resolve. */
  canUseDashboard: boolean;
  dashboardLabel: "Open Dashboard" | "Create Dashboard";
  isCreatingDashboard: boolean;
  isSavingArea: boolean;
  generateInsights: () => void;
  viewAnalysis: () => void;
  openOrCreateDashboard: () => void;
  saveArea: () => Promise<void>;
  removeFromMap: () => void;
}

/**
 * Everything the AOI label's menu can do, independent of how it's presented.
 *
 * Split from the menu component so the behaviour is testable without driving a
 * third-party menu widget's pointer choreography. Returns null without a target.
 */
export function useAoiActions(
  target: AoiActionsTarget | null
): AoiActions | null {
  const router = useRouter();
  const datasetLayer = useMapStore((state) =>
    state.layers.find(
      (l) => typeof l.datasetId === "number" && !l.parentLayerId
    )
  );
  const dateRange = useChatStore((state) => state.dateRange);
  const { run: runDirectAnalysis, status: analysisStatus } = useAnalysis();
  const { createAreaAsync, isCreating: isSavingArea } = useCustomAreasCreate();

  const datasetId = datasetLayer?.datasetId;
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    datasetId !== undefined
      ? (DATASET_BY_ID[datasetId]?.dataset_name ?? datasetLayer?.name)
      : undefined;
  const activeDataset =
    datasetId !== undefined && datasetName
      ? { id: datasetId, name: datasetName }
      : null;

  const { startDate, endDate } = resolveAnalysisWindow(datasetId, dateRange);

  // A dashboard needs the full AOI identity; a label whose area resolved no id
  // can't be turned into one.
  const dashboardInput =
    target?.srcId && target.subtype
      ? {
          areaName: target.areaName,
          // Canonical lowercase: the target carries the map layer id ("GADM").
          source: target.source.toLowerCase(),
          srcId: target.srcId,
          subtype: target.subtype,
          datasetId,
          datasetName,
          startDate,
          endDate,
        }
      : null;
  const {
    existing: existingDashboard,
    isResolving: isResolvingDashboards,
    isCreating: isCreatingDashboard,
    create: createDashboardForArea,
  } = useCreateDashboardForArea(dashboardInput);

  // useAnalysis reports a failed run through its status only; without this the
  // skeleton would vanish and the click would look like it did nothing.
  useEffect(() => {
    if (analysisStatus !== "error") return;
    toaster.create({
      title: "Couldn't run this analysis",
      description: "Something went wrong analysing this area. Try again.",
      type: "error",
      duration: 4000,
    });
  }, [analysisStatus]);

  if (!target?.areaName) return null;
  const { areaName, source, layerId } = target;
  // Same gate as the View Analysis nudge: view-only datasets have no analytics
  // endpoint, and the catalogue withholds analyses a source can't run.
  const canViewAnalysis =
    activeDataset !== null &&
    !isViewOnlyDataset(activeDataset.id) &&
    isAnalysableForSource(activeDataset.id, source);

  /**
   * The registry entry for this area, matched case-insensitively on source.
   *
   * The two sides disagree on casing: `VectorAreasLayer` registers the entry
   * with `ref.source` set to the map layer id ("GADM"), while the selection it
   * derives alongside it lowercases that into `source` ("gadm"). Callers must
   * therefore look the entry up loosely and reuse its own `ref` for anything
   * that matches strictly (`removeFromRegistry` does).
   */
  const registryEntry = () =>
    useMapStore
      .getState()
      .geoJsonRegistry.find(
        (e) =>
          e.ref.name === areaName &&
          e.ref.source.toLowerCase() === source.toLowerCase()
      );

  const removeFromMap = () => {
    const {
      clearAnalysis,
      removeLayer,
      removeFromRegistry,
      analysisSelection,
    } = useMapStore.getState();
    const entry = registryEntry();
    removeLayer(layerId);
    // Dropped by its own ref, since removeFromRegistry compares source exactly.
    if (entry) removeFromRegistry(entry.ref);
    // Only clear the ephemeral selection when it is *this* area, so removing
    // one label doesn't silently retract the nudges for another.
    if (analysisSelection?.name === areaName) {
      clearAnalysis();
      useSelectionStore.getState().clear();
    }
  };

  const saveArea = async () => {
    const entry = registryEntry();
    const geometries = entry ? toPolygons(entry.data) : [];
    if (geometries.length === 0) {
      toaster.create({
        title: "Couldn't save this area",
        description: "Its boundary isn't available yet. Try reselecting it.",
        type: "error",
        duration: 4000,
      });
      return;
    }
    try {
      await createAreaAsync({ name: areaName, geometries });
      toaster.create({
        title: "Area saved",
        description: `"${areaName}" is now in your areas.`,
        type: "success",
        duration: 3000,
      });
    } catch {
      // useCustomAreasCreate's own onError already surfaces the API failure.
    }
  };

  return {
    areaName,
    hasDataset: activeDataset !== null,
    canViewAnalysis,
    canSaveArea: source.toLowerCase() !== "custom",
    canUseDashboard: dashboardInput !== null && !isResolvingDashboards,
    dashboardLabel: existingDashboard ? "Open Dashboard" : "Create Dashboard",
    isCreatingDashboard,
    isSavingArea,
    generateInsights: () => {
      if (!activeDataset) return;
      runAnalysis({
        areaName,
        datasetId: activeDataset.id,
        datasetName: activeDataset.name,
      });
    },
    viewAnalysis: () => {
      if (!activeDataset || !canViewAnalysis) return;
      // Without a backend id the job cannot be addressed; say so rather than
      // submit one that fails.
      if (!target.srcId) {
        toaster.create({
          title: "Analysis isn't available for this area",
          description: "We couldn't match this area to our records.",
          type: "error",
          duration: 4000,
        });
        return;
      }
      runDirectAnalysis({
        area: {
          name: areaName,
          // The target carries the map layer id ("GADM", "WDPA"); the backend
          // expects its canonical lowercase source.
          source: source.toLowerCase(),
          srcId: target.srcId,
          subtype: target.subtype,
        },
        dataset: activeDataset,
        startDate,
        endDate,
      });
    },
    openOrCreateDashboard: () => {
      if (existingDashboard) {
        router.push(`/dashboards/${existingDashboard.id}`);
        return;
      }
      void createDashboardForArea();
    },
    saveArea,
    removeFromMap,
  };
}
