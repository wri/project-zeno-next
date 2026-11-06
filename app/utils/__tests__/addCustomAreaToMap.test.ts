import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; stub it so that import can't outlive the test environment.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import useMapStore from "@/app/store/mapStore";
import { useSelectionStore } from "@/src/features/analysis";
import { addCustomAreaToMap } from "../addCustomAreaToMap";

const square = (x: number): GeoJSON.Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [x, 0],
      [x, 1],
      [x + 1, 1],
      [x + 1, 0],
      [x, 0],
    ],
  ],
});

const area = { id: "a1", name: "Hidden Valley", geometries: [square(0)] };

describe("addCustomAreaToMap", () => {
  const flyToGeoJson = vi.fn();

  beforeEach(() => {
    flyToGeoJson.mockReset();
    useMapStore.setState({
      layers: [],
      geoJsonRegistry: [],
      analysisSelection: null,
      flyToGeoJson,
    });
    useSelectionStore.getState().clear();
  });

  it("adds the area as a visible layer keyed by its id, and flies to it", () => {
    addCustomAreaToMap(area);

    const { layers, geoJsonRegistry } = useMapStore.getState();
    expect(layers).toEqual([
      expect.objectContaining({
        id: "a1",
        name: "Hidden Valley",
        visible: true,
        featureRefs: [{ name: "Hidden Valley", source: "custom" }],
      }),
    ]);
    expect(geoJsonRegistry).toEqual([
      expect.objectContaining({
        ref: { name: "Hidden Valley", source: "custom" },
        srcId: "a1",
        subtype: "custom-area",
      }),
    ]);
    expect(flyToGeoJson).toHaveBeenCalledOnce();
  });

  // The selection is what both nudge triggers watch, as for a boundary click.
  it("publishes the area as the analysis selection", () => {
    addCustomAreaToMap(area);

    const expected = {
      name: "Hidden Valley",
      source: "custom",
      srcId: "a1",
      subtype: "custom-area",
    };
    expect(useMapStore.getState().analysisSelection).toEqual(expected);
    expect(useSelectionStore.getState().selection).toEqual(expected);
  });

  it("keeps every part of a multi-part area, not just the first", () => {
    addCustomAreaToMap({ ...area, geometries: [square(0), square(5)] });

    const [entry] = useMapStore.getState().geoJsonRegistry;
    const geometry = (entry.data as GeoJSON.Feature<GeoJSON.MultiPolygon>)
      .geometry;
    expect(geometry.coordinates).toHaveLength(2);
  });
});
