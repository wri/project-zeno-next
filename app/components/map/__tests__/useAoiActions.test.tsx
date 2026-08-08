// @vitest-environment happy-dom
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/lib/analysis/runAnalysis", () => ({
  runAnalysis: vi.fn(),
}));

const runDirectAnalysis = vi.fn();
vi.mock("@/src/features/analysis", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAnalysis: () => ({ run: runDirectAnalysis }),
}));

const createAreaAsync = vi.fn().mockResolvedValue({});
vi.mock("@/app/hooks/useCustomAreasCreate", () => ({
  useCustomAreasCreate: () => ({ createAreaAsync, isCreating: false }),
}));

const createDashboardForArea = vi.fn();
let dashboardHookState: {
  existing: { id: string } | null;
  isResolving: boolean;
  isCreating: boolean;
  create: () => void;
};
vi.mock("@/src/features/dashboards", () => ({
  useCreateDashboardForArea: () => dashboardHookState,
}));

let flagEnabled = true;
vi.mock("@/src/shared/lib/feature-flags", () => ({
  useFeatureFlag: () => flagEnabled,
}));

import { toaster } from "@/app/components/ui/toaster";
import { runAnalysis } from "@/app/lib/analysis/runAnalysis";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import { useAoiActions } from "../useAoiActions";

const selection = {
  name: "Paraná, Brazil",
  source: "gadm",
  srcId: "BRA.16_1",
  subtype: "state-province",
};

const datasetLayer: Layer = {
  id: "dataset-4",
  name: "Tree cover loss",
  type: "raster",
  visible: true,
  datasetId: 4,
};

const polygon = {
  type: "Polygon" as const,
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

const render = () => renderHook(() => useAoiActions());

describe("useAoiActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagEnabled = true;
    dashboardHookState = {
      existing: null,
      isResolving: false,
      isCreating: false,
      create: createDashboardForArea,
    };
    useMapStore.setState({
      analysisSelection: selection,
      layers: [datasetLayer],
      geoJsonRegistry: [],
    });
  });

  it("returns null with nothing selected", () => {
    useMapStore.setState({ analysisSelection: null });
    expect(render().result.current).toBeNull();
  });

  it("reports the area and its available actions", () => {
    const { result } = render();

    expect(result.current?.areaName).toBe("Paraná, Brazil");
    expect(result.current?.hasDataset).toBe(true);
    expect(result.current?.canSaveArea).toBe(true);
    expect(result.current?.canUseDashboard).toBe(true);
    expect(result.current?.dashboardLabel).toBe("Create Dashboard");
  });

  it("reports no dataset when none is active", () => {
    useMapStore.setState({ layers: [] });
    expect(render().result.current?.hasDataset).toBe(false);
  });

  it("ignores a context sub-layer as the active dataset", () => {
    useMapStore.setState({
      layers: [{ ...datasetLayer, parentLayerId: "dataset-9" }],
    });
    expect(render().result.current?.hasDataset).toBe(false);
  });

  it("cannot save an area the user already owns", () => {
    useMapStore.setState({
      analysisSelection: { ...selection, source: "custom" },
    });
    expect(render().result.current?.canSaveArea).toBe(false);
  });

  it("hides the dashboard action without the feature flag", () => {
    flagEnabled = false;
    expect(render().result.current?.canUseDashboard).toBe(false);
  });

  it("hides the dashboard action while the list is still resolving", () => {
    dashboardHookState = { ...dashboardHookState, isResolving: true };
    expect(render().result.current?.canUseDashboard).toBe(false);
  });

  it("labels the dashboard action Open when one already exists", () => {
    dashboardHookState = { ...dashboardHookState, existing: { id: "dash-1" } };
    expect(render().result.current?.dashboardLabel).toBe("Open Dashboard");
  });

  it("navigates to an existing dashboard instead of creating one", () => {
    dashboardHookState = { ...dashboardHookState, existing: { id: "dash-1" } };
    const { result } = render();

    act(() => result.current!.openOrCreateDashboard());

    expect(push).toHaveBeenCalledWith("/dashboards/dash-1?ff=dashboard");
    expect(createDashboardForArea).not.toHaveBeenCalled();
  });

  it("creates a dashboard when none exists", () => {
    const { result } = render();

    act(() => result.current!.openOrCreateDashboard());

    expect(createDashboardForArea).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("sends the generative prompt for Generate Insights", () => {
    const { result } = render();

    act(() => result.current!.generateInsights());

    expect(runAnalysis).toHaveBeenCalledWith({
      areaName: "Paraná, Brazil",
      datasetId: 4,
      datasetName: "Tree cover loss",
    });
  });

  it("runs the direct analysis for View Analysis", () => {
    const { result } = render();

    act(() => result.current!.viewAnalysis());

    expect(runDirectAnalysis).toHaveBeenCalledWith({
      area: {
        name: "Paraná, Brazil",
        source: "gadm",
        srcId: "BRA.16_1",
        subtype: "state-province",
      },
      dataset: { id: 4, name: "Tree cover loss" },
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  });

  it("does not analyse without a dataset", () => {
    useMapStore.setState({ layers: [] });
    const { result } = render();

    act(() => result.current!.generateInsights());
    act(() => result.current!.viewAnalysis());

    expect(runAnalysis).not.toHaveBeenCalled();
    expect(runDirectAnalysis).not.toHaveBeenCalled();
  });

  it("saves the area from its registered geometry", async () => {
    useMapStore.setState({
      geoJsonRegistry: [
        {
          // Registered with the map's layer id casing, not the selection's.
          ref: { name: "Paraná, Brazil", source: "GADM" },
          data: { type: "Feature", properties: {}, geometry: polygon },
        },
      ],
    });
    const { result } = render();

    await act(() => result.current!.saveArea());

    expect(createAreaAsync).toHaveBeenCalledWith({
      name: "Paraná, Brazil",
      geometries: [polygon],
    });
  });

  it("warns instead of saving when no geometry is registered", async () => {
    const { result } = render();

    await act(() => result.current!.saveArea());

    expect(createAreaAsync).not.toHaveBeenCalled();
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" })
    );
  });

  it("removes the area's layer and clears the selection", () => {
    useMapStore.setState({
      layers: [
        datasetLayer,
        {
          id: "Paraná, Brazil",
          name: "Paraná, Brazil",
          type: "geojson",
          visible: true,
        },
      ],
      geoJsonRegistry: [
        {
          // "GADM", the map layer id, is what VectorAreasLayer actually
          // registers; the selection carries the lowercased "gadm". Using the
          // production casing here is the point of this fixture.
          ref: { name: "Paraná, Brazil", source: "GADM" },
          data: { type: "Feature", properties: {}, geometry: polygon },
        },
      ],
    });
    const { result } = render();

    act(() => result.current!.removeFromMap());

    const state = useMapStore.getState();
    expect(state.analysisSelection).toBeNull();
    expect(state.layers.some((l) => l.id === "Paraná, Brazil")).toBe(false);
    expect(state.geoJsonRegistry).toHaveLength(0);
    // The dataset layer is untouched — only the area is removed.
    expect(state.layers.map((l) => l.id)).toEqual(["dataset-4"]);
  });
});
