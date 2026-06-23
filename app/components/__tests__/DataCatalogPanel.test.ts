import { describe, it, expect, beforeEach, vi } from "vitest";

// The mapStore import chain reaches the Chakra toaster (.tsx) which the node
// test environment can't parse — stub it at the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";
import {
  DATASET_CARDS,
  type DatasetCardConfig,
} from "@/app/constants/datasets";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";

describe("filterDatasetsByCategory", () => {
  it('returns every card when the category is "all"', () => {
    const result = filterDatasetsByCategory(DATASET_CARDS, "all", []);
    expect(result).toHaveLength(DATASET_CARDS.length);
  });

  it("filters by a thematic category via the card's `categories` array", () => {
    const result = filterDatasetsByCategory(DATASET_CARDS, "land-use", []);
    expect(result.length).toBeGreaterThan(0);
    for (const card of result) {
      expect(card.categories).toContain("land-use");
    }
  });

  it("returns datasets matching multiple thematic categories", () => {
    // TCL due to fires is tagged with both `disturbance` and `wildfires`.
    const fires = filterDatasetsByCategory(DATASET_CARDS, "wildfires", []);
    expect(fires.some((c) => c.dataset_id === 10)).toBe(true);
    const disturbance = filterDatasetsByCategory(
      DATASET_CARDS,
      "disturbance",
      []
    );
    expect(disturbance.some((c) => c.dataset_id === 10)).toBe(true);
  });

  it('returns only cards whose ids appear in `activeDatasetIds` for "in-conversation"', () => {
    const sample: DatasetCardConfig[] = [
      { dataset_id: 1, dataset_name: "A", description: "" },
      { dataset_id: 2, dataset_name: "B", description: "" },
      { dataset_id: 3, dataset_name: "C", description: "" },
    ];
    const result = filterDatasetsByCategory(sample, "in-conversation", [2]);
    expect(result.map((c) => c.dataset_id)).toEqual([2]);
  });

  it('returns an empty list for "in-conversation" with no active layers', () => {
    const sample: DatasetCardConfig[] = [
      { dataset_id: 1, dataset_name: "A", description: "" },
    ];
    expect(filterDatasetsByCategory(sample, "in-conversation", [])).toEqual([]);
  });
});

describe("data catalog show-on-map wiring (contextStore ↔ mapStore)", () => {
  beforeEach(() => {
    useContextStore.getState().reset();
    useMapStore.getState().reset();
  });

  it("adds a dataset layer to the map when a card is toggled on", () => {
    const card = DATASET_CARDS.find((c) => c.dataset_id === 4)!;
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(card),
      isAiContext: false,
    });

    const layers = useMapStore.getState().layers;
    expect(layers.find((l) => l.id === "dataset-4")).toBeDefined();
  });

  it("supports multiple active layers simultaneously", () => {
    const cardA = DATASET_CARDS.find((c) => c.dataset_id === 4)!;
    const cardB = DATASET_CARDS.find((c) => c.dataset_id === 1)!;
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(cardA),
      isAiContext: false,
    });
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(cardB),
      isAiContext: false,
    });

    const layerIds = useMapStore.getState().layers.map((l) => l.id);
    expect(layerIds).toContain("dataset-4");
    expect(layerIds).toContain("dataset-1");
  });

  it("removes the layer when the matching context entry is removed", () => {
    const card = DATASET_CARDS.find((c) => c.dataset_id === 4)!;
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(card),
      isAiContext: false,
    });
    const ctx = useContextStore
      .getState()
      .context.find((c) => c.datasetId === 4)!;
    useContextStore.getState().removeContext(ctx.id);

    expect(
      useMapStore.getState().layers.find((l) => l.id === "dataset-4")
    ).toBeUndefined();
  });

  it("setLayerVisibility toggles the layer's `visible` flag without removing it", () => {
    const card = DATASET_CARDS.find((c) => c.dataset_id === 4)!;
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(card),
      isAiContext: false,
    });

    useMapStore.getState().setLayerVisibility("dataset-4", false);
    let layer = useMapStore.getState().layers.find((l) => l.id === "dataset-4");
    expect(layer?.visible).toBe(false);

    useMapStore.getState().setLayerVisibility("dataset-4", true);
    layer = useMapStore.getState().layers.find((l) => l.id === "dataset-4");
    expect(layer?.visible).toBe(true);
  });

  it("setLayerOpacity updates the layer's opacity value", () => {
    const card = DATASET_CARDS.find((c) => c.dataset_id === 4)!;
    useContextStore.getState().addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(card),
      isAiContext: false,
    });

    useMapStore.getState().setLayerOpacity("dataset-4", 0.3);
    const layer = useMapStore
      .getState()
      .layers.find((l) => l.id === "dataset-4");
    expect(layer?.opacity).toBeCloseTo(0.3);
  });
});
