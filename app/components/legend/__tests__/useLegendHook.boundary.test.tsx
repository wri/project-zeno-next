// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BOUNDARY_LEGEND_ID,
  concessionLegendEntry,
  useLegendHook,
} from "../useLegendHook";
import { CONCESSION_STYLES } from "@/app/types/map";
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

describe("useLegendHook concession layer", () => {
  beforeEach(() => {
    useMapStore.setState({
      selectAreaLayer: "OIL_PALM",
      boundaryOpacity: 1,
      layers: [],
    });
  });

  it("is a legend layer, not an AREA pill", () => {
    const { result } = renderHook(() => useLegendHook());

    expect(result.current.boundary).toBeNull();
    expect(result.current.layers.map((l) => l.id)).toEqual([
      BOUNDARY_LEGEND_ID,
    ]);
    expect(result.current.layers[0]).toMatchObject({
      title: "Oil palm concessions",
      opacity: 100,
    });
  });

  it("names the countries the source covers", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        {concessionLegendEntry(CONCESSION_STYLES.OIL_PALM!, 1).children}
      </ChakraProvider>
    );

    expect(screen.getByText("for certain countries")).toBeTruthy();
    expect(CONCESSION_STYLES.OIL_PALM!.countries).toContain("Indonesia");
  });

  it("sets the boundary opacity from the legend", () => {
    const { result } = renderHook(() => useLegendHook());

    act(() =>
      result.current.handleLayerAction({
        action: "opacity",
        payload: { id: BOUNDARY_LEGEND_ID, opacity: 40 },
      })
    );

    expect(useMapStore.getState().boundaryOpacity).toBe(0.4);
    expect(result.current.layers[0].opacity).toBe(40);
  });

  it("turns the layer off when its entry is removed", () => {
    const { result } = renderHook(() => useLegendHook());

    act(() =>
      result.current.handleLayerAction({
        action: "remove",
        payload: { id: BOUNDARY_LEGEND_ID },
      })
    );

    expect(useMapStore.getState().selectAreaLayer).toBeNull();
    expect(result.current.layers).toEqual([]);
  });

  it("resets the opacity when another layer is switched on", () => {
    useMapStore.setState({ boundaryOpacity: 0.3 });

    act(() => useMapStore.getState().setSelectAreaLayer("MINING"));

    expect(useMapStore.getState().boundaryOpacity).toBe(1);
  });
});
