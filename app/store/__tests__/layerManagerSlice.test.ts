import { beforeEach, describe, expect, it, vi } from "vitest";

// The slice lazily imports chatStore to fold layer changes into the sent
// context; a stub keeps these tests off the real chat store.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import { addCustomAreaToMap } from "@/app/utils/addCustomAreaToMap";
import { aoiFeatureRef, type FeatureRef } from "../layerManagerSlice";
import useMapStore from "../mapStore";

const feature = (): GeoJSON.Feature => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  },
  properties: {},
});

const register = (ref: FeatureRef) =>
  useMapStore
    .getState()
    .addToRegistry({ ref, data: feature(), srcId: ref.srcId });

const areaLayer = (id: string, featureRefs: FeatureRef[]) =>
  useMapStore.getState().addLayer({
    id,
    name: id,
    type: "geojson",
    visible: true,
    featureRefs,
  });

const registryRefs = () =>
  useMapStore.getState().geoJsonRegistry.map((e) => e.ref);

describe("removeLayer", () => {
  beforeEach(() => {
    useMapStore.setState({
      layers: [],
      geoJsonRegistry: [],
      analysisSelection: null,
      flyToGeoJson: vi.fn(),
    });
  });

  it("drops a registry entry with the last layer using it and no earlier", () => {
    const brazil = { name: "Brazil", source: "gadm", srcId: "BRA" };
    const peru = { name: "Peru", source: "gadm", srcId: "PER" };
    const chile = { name: "Chile", source: "gadm", srcId: "CHL" };
    [brazil, peru, chile].forEach(register);
    areaLayer("Brazil", [brazil]);
    areaLayer("Brazil and Peru", [brazil, peru]);
    areaLayer("Chile", [chile]);

    useMapStore.getState().removeLayer("Brazil");

    // Brazil is still used by "Brazil and Peru".
    expect(registryRefs()).toEqual([brazil, peru, chile]);

    useMapStore.getState().removeLayer("Brazil and Peru");

    // Only the entries nobody uses any more go; Chile is untouched.
    expect(registryRefs()).toEqual([chile]);
    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual(["Chile"]);
  });

  it("keeps the agent layer's geometry when the My areas toggle is turned off", () => {
    const area = {
      id: "a1",
      name: "Hidden Valley",
      geometries: [feature().geometry as GeoJSON.Polygon],
    };
    addCustomAreaToMap(area);
    const agentRef = aoiFeatureRef({
      name: area.name,
      source: "custom",
      src_id: area.id,
    });
    areaLayer(area.name, [agentRef]);

    useMapStore.getState().removeLayer(area.id);

    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual([area.name]);
    expect(registryRefs()).toEqual([agentRef]);
  });

  it("leaves the registry array untouched when the layer has no featureRefs", () => {
    register({ name: "Brazil", source: "gadm", srcId: "BRA" });
    useMapStore.getState().addLayer({
      id: "dataset",
      name: "dataset",
      type: "raster",
      visible: true,
    });
    const before = useMapStore.getState().geoJsonRegistry;

    useMapStore.getState().removeLayer("dataset");

    expect(useMapStore.getState().geoJsonRegistry).toBe(before);
  });

  it("keeps an entry that no layer uses yet, such as a pick still loading", () => {
    const loading = { name: "Peru", source: "gadm", srcId: "PER" };
    const chile = { name: "Chile", source: "gadm", srcId: "CHL" };
    [loading, chile].forEach(register);
    areaLayer("Chile", [chile]);

    useMapStore.getState().removeLayer("Chile");

    expect(registryRefs()).toEqual([loading]);
  });
});
