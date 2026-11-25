import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; stub it so that import can't outlive the test environment.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import { apiFetch } from "@/app/lib/api-client";
import useMapStore from "@/app/store/mapStore";
import type { UserAoi } from "@/src/entities/user-aoi";
import {
  addUserAoiToMap,
  findUserAoiLayer,
  removeUserAoiFromMap,
} from "../userAoiMap";

const mockedFetch = vi.mocked(apiFetch);

const owned: UserAoi = {
  id: "entry-1",
  relationship: "owner",
  name: "Farm plot",
  source: "custom",
  src_id: "ca-1",
  subtype: "custom-area",
  bbox: [0, 0, 1, 1],
  created_at: "2026-11-24T00:00:00",
};

const saved: UserAoi = {
  id: "entry-2",
  relationship: "saved",
  name: "Brazil",
  source: "gadm",
  src_id: "BRA",
  subtype: "country",
  bbox: [-74, -34, -34, 5],
  created_at: "2026-11-24T00:00:00",
};

const geometry = { type: "FeatureCollection", features: [] };

describe("user AOIs on the map", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ geometry }), { status: 200 })
    );
    useMapStore.setState({
      layers: [],
      geoJsonRegistry: [],
      analysisSelection: null,
      flyToGeoJsonWithRetry: vi.fn(),
      flyToBounds: vi.fn(),
    });
  });

  it("adds an owned area beside the others, keyed by its id", async () => {
    useMapStore.getState().addLayer({
      id: "Pará",
      name: "Pará",
      type: "geojson",
      visible: true,
      featureRefs: [{ name: "Pará", source: "gadm" }],
    });

    await addUserAoiToMap(owned);

    const { layers, analysisSelection } = useMapStore.getState();
    expect(layers.map((l) => l.id)).toEqual(["Pará", "ca-1"]);
    expect(mockedFetch.mock.calls[0][0]).toContain("/api/geometry/custom/ca-1");
    expect(analysisSelection).toBeNull();
    expect(findUserAoiLayer(layers, owned)?.id).toBe("ca-1");
  });

  it("adds a saved area as the one reference area, like a searched place", async () => {
    useMapStore.getState().addLayer({
      id: "Pará",
      name: "Pará",
      type: "geojson",
      visible: true,
      featureRefs: [{ name: "Pará", source: "gadm" }],
    });

    await addUserAoiToMap(saved);

    const { layers, analysisSelection } = useMapStore.getState();
    expect(layers.map((l) => l.id)).toEqual(["Brazil"]);
    expect(analysisSelection).toMatchObject({ source: "gadm", srcId: "BRA" });
    expect(findUserAoiLayer(layers, saved)?.id).toBe("Brazil");
  });

  it("takes an area off the map again", async () => {
    await addUserAoiToMap(owned);
    const layer = findUserAoiLayer(useMapStore.getState().layers, owned);

    removeUserAoiFromMap(layer!, owned);

    expect(useMapStore.getState().layers).toEqual([]);
  });
});
