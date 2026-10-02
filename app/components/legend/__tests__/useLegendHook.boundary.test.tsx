// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLegendHook } from "../useLegendHook";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";

// Stable stub — useLegendHook depends on `palettesByDatasetId` in an effect.
vi.mock("@/app/hooks/useDatasetsCatalog", () => {
  const catalog = { palettesByDatasetId: {}, isLoading: false, error: null };
  return { useDatasetsCatalog: () => catalog };
});

const pickedArea: Layer = {
  id: "Pará, Brazil",
  name: "Pará, Brazil",
  type: "geojson",
  visible: true,
  featureRefs: [{ name: "Pará, Brazil", source: "GADM" }],
};

describe("useLegendHook boundary pill", () => {
  beforeEach(() => {
    useMapStore.setState({ selectAreaLayer: "GADM", layers: [] });
  });

  it("names the pill after the visible boundary dataset", () => {
    useMapStore.setState({ selectAreaLayer: "KBA" });
    const { result } = renderHook(() => useLegendHook());

    expect(result.current.boundary).toEqual({ name: "Key Biodiversity Areas" });
  });

  it("has no pill when no boundary layer is shown", () => {
    useMapStore.setState({ selectAreaLayer: null });
    const { result } = renderHook(() => useLegendHook());

    expect(result.current.boundary).toBeNull();
  });

  it("closing the pill turns the boundary layer off", () => {
    const { result } = renderHook(() => useLegendHook());

    act(() => result.current.handleRemoveBoundary());

    expect(useMapStore.getState().selectAreaLayer).toBeNull();
    expect(result.current.boundary).toBeNull();
  });

  it("keeps the boundary pill separate from picked-area pills", () => {
    useMapStore.setState({ layers: [pickedArea] });
    const { result } = renderHook(() => useLegendHook());

    expect(result.current.boundary?.name).toBe("Administrative Areas");
    expect(result.current.aois).toEqual([
      { layerId: "Pará, Brazil", name: "Pará, Brazil" },
    ]);
  });
});
