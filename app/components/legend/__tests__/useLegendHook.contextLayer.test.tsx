// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLegendHook } from "../useLegendHook";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";

// The catalog hook fetches the backend palette registry; the legend falls back
// to the static config when it is absent, which is what these cases exercise.
// The stub must hand back one stable object: useLegendHook takes
// `palettesByDatasetId` as a useEffect dependency, so a fresh literal per
// render spins forever.
vi.mock("@/app/hooks/useDatasetsCatalog", () => {
  const catalog = { palettesByDatasetId: {}, isLoading: false, error: null };
  return { useDatasetsCatalog: () => catalog };
});

const treeCoverLoss: Layer = {
  id: "dataset-4",
  name: "Tree cover loss",
  type: "raster",
  visible: true,
  tileUrl: "https://example.test/tcl/{z}/{x}/{y}.png",
  datasetId: 4,
};

const contextSubLayer = (name: string): Layer => ({
  id: `dataset-4-ctx-${name}`,
  name,
  type: "vector",
  visible: true,
  tileUrl: "https://example.test/ctx/{z}/{x}/{y}.pbf",
  sourceLayer: name,
  datasetId: 4,
  parentLayerId: "dataset-4",
});

function contextLayerFor(name: string) {
  useMapStore.setState({ layers: [treeCoverLoss, contextSubLayer(name)] });
  const { result } = renderHook(() => useLegendHook());
  const parent = result.current.layers.find((l) => l.id === "dataset-4");
  return parent && "contextLayer" in parent ? parent.contextLayer : undefined;
}

describe("useLegendHook context sub-layers", () => {
  beforeEach(() => {
    useMapStore.setState({ layers: [] });
  });

  it("gives a multi-class context layer its own symbology", () => {
    // Intact Forest Landscapes carries the extent plus three reduction
    // epochs — without a symbol list the epochs have no legend at all, which
    // is what researchers reported on PZB-1231.
    const contextLayer = contextLayerFor("intact_forest");

    expect(contextLayer?.title).toBe("Intact Forest Landscapes (2000-2025)");
    expect(contextLayer?.symbology).toBeTruthy();
  });

  it("leaves a single-class context layer to its title swatch", () => {
    const contextLayer = contextLayerFor("primary_forest");

    expect(contextLayer?.title).toBe("Primary Forests (2001)");
    expect(contextLayer?.symbology).toBeUndefined();
  });
});
