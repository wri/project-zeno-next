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

const integratedAlerts: Layer = {
  id: "dataset-11",
  name: "Integrated alerts",
  type: "raster",
  visible: true,
  tileUrl: "https://example.test/alerts/{z}/{x}/{y}.png",
  datasetId: 11,
};

const contextSubLayer = (name: string, parent: Layer): Layer => ({
  id: `${parent.id}-ctx-${name}`,
  name,
  type: "vector",
  visible: true,
  tileUrl: "https://example.test/ctx/{z}/{x}/{y}.pbf",
  sourceLayer: name,
  datasetId: parent.datasetId,
  parentLayerId: parent.id,
});

function contextLayerFor(name: string, parent: Layer = treeCoverLoss) {
  useMapStore.setState({ layers: [parent, contextSubLayer(name, parent)] });
  const { result } = renderHook(() => useLegendHook());
  const entry = result.current.layers.find((l) => l.id === parent.id);
  return entry && "contextLayer" in entry ? entry.contextLayer : undefined;
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

  it("names the natural lands filter under Integrated alerts", () => {
    // Without metadata the row falls back to the raw backend key
    // ("natural_lands") and a grey swatch.
    const contextLayer = contextLayerFor("natural_lands", integratedAlerts);

    expect(contextLayer?.title).toBe("SBTN Natural lands (2020)");
    expect(contextLayer?.symbology).toBeTruthy();
  });

  it("names the natural forest filter under Tree cover loss", () => {
    const contextLayer = contextLayerFor("natural_forest");

    expect(contextLayer?.title).toBe("SBTN Natural lands (2020)");
    expect(contextLayer?.info).toMatch(/natural forest/);
    expect(contextLayer?.symbology).toBeTruthy();
  });
});
