"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { toaster } from "@/app/components/ui/toaster";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import { runAnalysis } from "@/app/lib/analysis/runAnalysis";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { toPolygons } from "@/app/utils/selectionPolygons";
import {
  useAnalysis,
  useSelectionStore,
  DEFAULT_ANALYSIS_START_DATE,
  DEFAULT_ANALYSIS_END_DATE,
} from "@/src/features/analysis";
import { useCreateDashboardForArea } from "@/src/features/dashboards";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

export interface AoiActions {
  areaName: string;
  /** True when a dataset is active, so the ANALYSIS group applies. */
  hasDataset: boolean;
  /** False for areas the user already owns — a custom area is already saved. */
  canSaveArea: boolean;
  /** False without the dashboards flag, or when the AOI has no resolvable id. */
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
 * Everything the AOI chip's menu can do, independent of how it's presented.
 *
 * Split from `AoiChipMenu` so the behaviour is testable without driving a
 * third-party menu widget's pointer choreography — the component then only
 * decides what to show. Returns null when nothing is selected.
 */
export function useAoiActions(): AoiActions | null {
  const router = useRouter();
  const selection = useMapStore((state) => state.analysisSelection);
  const datasetLayer = useMapStore((state) =>
    state.layers.find(
      (l) => typeof l.datasetId === "number" && !l.parentLayerId
    )
  );
  const dateRange = useChatStore((state) => state.dateRange);
  const dashboardsEnabled = useFeatureFlag("dashboard");
  const { run: runDirectAnalysis } = useAnalysis();
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

  const startDate = dateRange
    ? format(dateRange.start, "yyyy-MM-dd")
    : DEFAULT_ANALYSIS_START_DATE;
  const endDate = dateRange
    ? format(dateRange.end, "yyyy-MM-dd")
    : DEFAULT_ANALYSIS_END_DATE;

  // A dashboard needs the full AOI identity; a click that resolved no id
  // can't be turned into one.
  const dashboardInput =
    selection?.name && selection.srcId && selection.subtype
      ? {
          areaName: selection.name,
          source: selection.source,
          srcId: selection.srcId,
          subtype: selection.subtype,
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

  if (!selection?.name) return null;
  const areaName = selection.name;
  const source = selection.source;

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
    const { clearAnalysis, removeLayer, removeFromRegistry } =
      useMapStore.getState();
    const entry = registryEntry();
    // The clicked area's layer is keyed by its name; the registry entry is
    // dropped by its own ref, since removeFromRegistry compares source exactly.
    removeLayer(areaName);
    if (entry) removeFromRegistry(entry.ref);
    clearAnalysis();
    useSelectionStore.getState().clear();
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
    canSaveArea: source !== "custom",
    canUseDashboard:
      dashboardsEnabled && dashboardInput !== null && !isResolvingDashboards,
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
      if (!activeDataset) return;
      runDirectAnalysis({
        area: {
          name: areaName,
          source,
          srcId: selection.srcId,
          subtype: selection.subtype,
        },
        dataset: activeDataset,
        startDate,
        endDate,
      });
    },
    openOrCreateDashboard: () => {
      if (existingDashboard) {
        router.push(`/dashboards/${existingDashboard.id}?ff=dashboard`);
        return;
      }
      void createDashboardForArea();
    },
    saveArea,
    removeFromMap,
  };
}
