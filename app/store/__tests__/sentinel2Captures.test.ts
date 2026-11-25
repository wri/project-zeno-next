import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GeoJsonEntry, Layer } from "@/app/store/layerManagerSlice";
import type { Scene, SceneSearchResult } from "@/src/features/imagery";

// Stateful mapStore mock with the real slice's semantics for the calls the
// capture flow makes.
const mapState = {
  layers: [] as Layer[],
  geoJsonRegistry: [] as GeoJsonEntry[],
  addLayer: vi.fn((layer: Layer) => {
    mapState.layers = [
      ...mapState.layers.filter((l) => l.id !== layer.id),
      { ...layer, opacity: layer.opacity ?? 1 },
    ];
  }),
  updateLayer: vi.fn((id: string, patch: Partial<Layer>) => {
    mapState.layers = mapState.layers.map((l) =>
      l.id === id ? { ...l, ...patch } : l
    );
  }),
  setLayerVisibility: vi.fn((id: string, visible: boolean) => {
    mapState.layers = mapState.layers.map((l) =>
      l.id === id ? { ...l, visible } : l
    );
  }),
  reorderLayers: vi.fn((ids: string[]) => {
    mapState.layers = ids
      .map((id) => mapState.layers.find((l) => l.id === id))
      .filter((l): l is Layer => !!l);
  }),
};
vi.mock("@/app/store/mapStore", () => ({
  default: { getState: () => mapState },
}));

const fetchGeometry = vi.fn();
vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: (...args: unknown[]) => fetchGeometry(...args),
}));

const findScenes = vi.fn();
vi.mock("@/src/features/imagery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/features/imagery")>()),
  findScenes: (...args: unknown[]) => findScenes(...args),
}));

import { searchSentinel2, showSentinel2Capture } from "../sentinel2Captures";
import { encodeRecipe, type Sentinel2Request } from "@/src/features/imagery";

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-77, -14],
      [-76, -14],
      [-76, -13],
      [-77, -13],
      [-77, -14],
    ],
  ],
};

const request: Sentinel2Request = {
  aois: [{ source: "gadm", srcId: "PER.11.3_1" }],
  aoiNames: ["Paracas"],
  targetDate: "2026-06-15",
  windowDays: 7,
  maxCloudCover: 20,
  maxItems: 50,
};

const scene: Scene = {
  id: "S2B_18LTM_20260614_0_L2A",
  bbox: [-77, -14, -76, -13],
  datetime: "2026-06-14T15:20:00Z",
  cloudCover: 4,
  gridCode: "MGRS-18LTM",
  visualHref: "https://sentinel-cogs/TCI.tif",
  thumbnailHref: "https://sentinel-cogs/preview.jpg",
  rank: 0,
};

const okResult: SceneSearchResult = {
  status: "ok",
  scenes: [scene],
  summary: {
    itemCount: 1,
    startDate: "2026-06-14",
    endDate: "2026-06-14",
    meanCloudCover: 4,
    minCloudCover: 4,
    maxCloudCover: 4,
  },
  found: 1,
  candidates: [scene],
};

const layerId = `imagery-${encodeRecipe(request)}`;

describe("showSentinel2Capture", () => {
  beforeEach(() => {
    mapState.layers = [];
    mapState.geoJsonRegistry = [];
    vi.clearAllMocks();
    findScenes.mockResolvedValue(okResult);
  });

  it("adds a client capture keyed on the recipe token, then fills in the scenes", async () => {
    mapState.geoJsonRegistry = [
      {
        ref: { name: "Paracas", source: "gadm", srcId: "PER.11.3_1" },
        data: { type: "Feature", properties: {}, geometry: square },
      },
    ];
    await showSentinel2Capture(request);

    // The layer went in at once, searching, with no tile URL.
    const added = mapState.addLayer.mock.calls[0][0] as Layer;
    expect(added.id).toBe(layerId);
    expect(added.tileUrl).toBeUndefined();
    expect(added.sentinel2?.status).toBe("searching");

    const layer = mapState.layers[0];
    expect(layer.sentinel2).toEqual({
      request,
      status: "ok",
      scenes: [scene],
    });
    expect(layer.imagery).toMatchObject({
      provider: "sentinel-2",
      mosaic_id: encodeRecipe(request),
      item_count: 1,
      start_date: "2026-06-14",
      window_days: 7,
      max_cloud_cover: 20,
      aoi_names: ["Paracas"],
    });
    expect(layer.bounds).toEqual([-77, -14, -76, -13]);
    expect(layer.minzoom).toBe(8);
    // The registry had the geometry: no fetch.
    expect(fetchGeometry).not.toHaveBeenCalled();
  });

  it("fetches the AOI geometry when the map has not loaded it", async () => {
    fetchGeometry.mockResolvedValue({ geometry: square });
    await showSentinel2Capture(request);
    expect(fetchGeometry).toHaveBeenCalledWith("gadm", "PER.11.3_1");
    expect(mapState.layers[0].sentinel2?.status).toBe("ok");
  });

  it("marks the capture as failed when the geometry cannot be loaded", async () => {
    fetchGeometry.mockRejectedValue(new Error("404"));
    await showSentinel2Capture(request);
    expect(mapState.layers[0].sentinel2?.status).toBe("error");
    expect(findScenes).not.toHaveBeenCalled();
  });

  it("hides the earlier capture and puts the new one on top", async () => {
    fetchGeometry.mockResolvedValue({ geometry: square });
    await showSentinel2Capture(request);
    const later = { ...request, targetDate: "2026-07-15" };
    await showSentinel2Capture(later);
    expect(mapState.layers.map((l) => [l.id, l.visible])).toEqual([
      [`imagery-${encodeRecipe(later)}`, true],
      [layerId, false],
    ]);
  });

  it("re-showing the same request upserts one layer", async () => {
    fetchGeometry.mockResolvedValue({ geometry: square });
    await showSentinel2Capture(request);
    await showSentinel2Capture(request);
    expect(mapState.layers).toHaveLength(1);
  });

  it("searches again after a failed search", async () => {
    fetchGeometry.mockResolvedValue({ geometry: square });
    findScenes.mockResolvedValueOnce({
      ...okResult,
      status: "error",
      scenes: [],
    });
    await showSentinel2Capture(request);
    expect(mapState.layers[0].sentinel2?.status).toBe("error");
    await showSentinel2Capture(request);
    expect(mapState.layers[0].sentinel2?.status).toBe("ok");
  });
});

describe("searchSentinel2", () => {
  beforeEach(() => {
    mapState.layers = [];
    mapState.geoJsonRegistry = [];
    vi.clearAllMocks();
  });

  it("returns the search result and the area bounds without adding a layer", async () => {
    fetchGeometry.mockResolvedValue({ geometry: square });
    findScenes.mockResolvedValue({ ...okResult, found: 30 });
    const { result, bounds } = await searchSentinel2(request);
    expect(result.found).toBe(30);
    expect(bounds).toHaveLength(4);
    expect(mapState.layers).toHaveLength(0);
  });

  it("rejects when the geometry cannot be loaded", async () => {
    fetchGeometry.mockRejectedValue(new Error("404"));
    await expect(searchSentinel2(request)).rejects.toThrow("404");
  });
});
