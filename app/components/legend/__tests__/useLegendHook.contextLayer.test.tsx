// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLegendHook } from "../useLegendHook";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import { pickDatasetTool } from "@/app/store/chat-tools/pickDataset";
import type { DatasetInfo } from "@/app/types/chat";
import { CONTEXT_LAYER_METADATA } from "@/app/constants/datasets";

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

    // All natural classes draw as one colour, so the title swatch is the
    // whole legend.
    expect(contextLayer?.title).toBe("SBTN Natural lands (2020)");
    expect(contextLayer?.color).toBe("#A8DDB5");
    expect(contextLayer?.symbology).toBeUndefined();
  });

  it("names the natural forest filter under Tree cover loss", () => {
    const contextLayer = contextLayerFor("natural_forest");

    expect(contextLayer?.title).toBe("SBTN Natural forest (2020)");
    expect(contextLayer?.color).toBe("#246E24");
    expect(contextLayer?.info).toMatch(/natural forest/);
    expect(contextLayer?.symbology).toBeUndefined();
  });
});

describe("useLegendHook canopy chip from a pick_dataset turn", () => {
  // Shaped like the backend's pick_dataset result for Tree cover loss
  // (project-zeno#856): the tile is drawn at a 0% canopy threshold, no
  // canopy_cover overlay sits in context_layers, and any canopy_cover the
  // agent picked is still echoed in `parameters` but ignored.
  const tclTile =
    "https://tiles.example.test/umd_tree_cover_loss/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=0&render_type=true_color&start_year=2021&end_year=2025";
  const naturalForestPick: DatasetInfo = {
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    tile_url: tclTile,
    layers: [{ name: "Tree cover loss", tile_url: tclTile }],
    context_layer: "natural_forest",
    context_layers: [
      {
        name: "natural_forest",
        tile_url: "https://tiles.example.test/natural_lands/{z}/{x}/{y}.png",
      },
    ],
    parameters: [{ name: "canopy_cover", values: [50] }],
    start_date: "2021-01-01",
    end_date: "2025-12-31",
  };

  function legendEntryAfterPick(dataset: DatasetInfo) {
    pickDatasetTool(
      {
        type: "tool",
        name: "pick_dataset",
        timestamp: new Date().toISOString(),
        dataset,
      },
      vi.fn()
    );
    const { result } = renderHook(() => useLegendHook());
    return result.current.layers.find((l) => l.id === "dataset-4");
  }

  beforeEach(() => {
    useMapStore.setState({ layers: [] });
  });

  it("shows no CANOPY chip under natural forest", () => {
    const entry = legendEntryAfterPick(naturalForestPick);

    expect(entry).toBeDefined();
    expect(entry?.params?.map((p) => p.label)).not.toContain("CANOPY");
    expect(
      entry && "contextLayer" in entry ? entry.contextLayer?.title : undefined
    ).toBe("SBTN Natural forest (2020)");
  });

  it("draws the natural forest sub-layer from the frontend's tiles", () => {
    legendEntryAfterPick(naturalForestPick);

    const ctx = useMapStore
      .getState()
      .layers.find((l) => l.name === "natural_forest");
    expect(ctx?.tileUrl).toBe(CONTEXT_LAYER_METADATA.natural_forest.tile_url);
  });

  it("keeps the CANOPY chip without a context layer", () => {
    const entry = legendEntryAfterPick({
      ...naturalForestPick,
      context_layer: null,
      context_layers: [],
    });

    expect(entry?.params).toContainEqual(
      expect.objectContaining({ label: "CANOPY" })
    );
  });
});
