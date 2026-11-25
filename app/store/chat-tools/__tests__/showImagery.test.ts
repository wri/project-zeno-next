import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Layer } from "@/app/store/layerManagerSlice";

// Stateful mapStore mock: the handler reads layers back after mutating them
// (to hide earlier captures and compute the reorder), so the mock must apply
// the same semantics as the real slice.
const mapState = {
  layers: [] as Layer[],
  addLayer: vi.fn((layer: Layer) => {
    mapState.layers = [
      ...mapState.layers.filter((l) => l.id !== layer.id),
      { ...layer, opacity: layer.opacity ?? 1 },
    ];
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

const showApiError = vi.fn();
vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: (...args: unknown[]) => showApiError(...args),
}));

// getAuthHeaders reads localStorage, which the node test environment lacks —
// stub a signed-in user so the origin gating is observable either way.
vi.mock("@/app/lib/api-client", () => ({
  getAuthHeaders: () => ({ Authorization: "Bearer test-token" }),
}));

// The capture flow has its own tests (sentinel2Captures.test.ts).
const showSentinel2Capture = vi.fn();
vi.mock("@/app/store/sentinel2Captures", () => ({
  showSentinel2Capture: (...args: unknown[]) => showSentinel2Capture(...args),
}));

import { showImageryTool } from "../showImagery";
import { encodeRecipe } from "@/src/features/imagery";
import { API_CONFIG } from "@/app/config/api";
import type { ImageryInfo, StreamMessage } from "@/app/types/chat";

const timestamp = new Date().toISOString();

const imagery: ImageryInfo = {
  tile_url: "https://tiles.example.com/{z}/{x}/{y}.png?url=s3",
  tilejson_url: "https://tiles.example.com/tilejson.json?url=s3",
  mosaic_id: "abc123",
  item_count: 9,
  date_start: "2026-06-12",
  date_end: "2026-06-16",
  target_date: "2026-06-15",
  window_days: 30,
  max_cloud_cover: 50,
  aoi_names: ["Paracas National Reserve"],
};

const tileJson = {
  bounds: [-77, -14.5, -76, -13.5] as [number, number, number, number],
  minzoom: 8,
  maxzoom: 14,
};

const baseMsg = (overrides: Partial<StreamMessage> = {}): StreamMessage => ({
  type: "tool",
  name: "show_imagery",
  timestamp,
  imagery,
  ...overrides,
});

function mockFetch(response: Partial<Response> | Error) {
  const fetchMock =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => tileJson,
          ...response,
        });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("showImageryTool", () => {
  beforeEach(() => {
    mapState.layers = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("adds a raster layer keyed on the mosaic id with TileJSON tuning", async () => {
    mockFetch({});

    await showImageryTool(baseMsg());

    expect(mapState.addLayer).toHaveBeenCalledOnce();
    const layer = mapState.addLayer.mock.calls[0][0];
    expect(layer).toMatchObject({
      id: "imagery-abc123",
      name: "Satellite Imagery (Jun 15, 2026)",
      type: "raster",
      visible: true,
      tileUrl: imagery.tile_url,
      minzoom: 8,
      maxzoom: 14,
      bounds: tileJson.bounds,
      imagery,
    });
  });

  it("requests the TileJSON without auth headers for non-API hosts", async () => {
    const fetchMock = mockFetch({});

    await showImageryTool(baseMsg());

    expect(fetchMock).toHaveBeenCalledWith(imagery.tilejson_url, {
      headers: {},
    });
  });

  it("uses inline bounds and zoom limits when TileJSON is absent", async () => {
    const fetchMock = mockFetch({});
    const inlineBounds: [number, number, number, number] = [-78, -15, -75, -12];

    await showImageryTool(
      baseMsg({
        imagery: {
          ...imagery,
          tilejson_url: undefined,
          bounds: inlineBounds,
          min_zoom: 6,
          max_zoom: 17,
        },
      })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mapState.addLayer).toHaveBeenCalledOnce();
    expect(mapState.addLayer.mock.calls[0][0]).toMatchObject({
      bounds: inlineBounds,
      minzoom: 6,
      maxzoom: 17,
    });
  });

  it("adds no layer when TileJSON and inline zoom limits are absent", async () => {
    const fetchMock = mockFetch({});

    await showImageryTool(
      baseMsg({ imagery: { ...imagery, tilejson_url: undefined } })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no layer when TileJSON omits zoom limits", async () => {
    mockFetch({ json: async () => ({ bounds: tileJson.bounds }) } as Response);

    await showImageryTool(baseMsg());

    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("attaches auth when the tiler is the Zeno API itself", async () => {
    const fetchMock = mockFetch({});
    const url = `${API_CONFIG.API_HOST}/api/tiles/tilejson.json`;

    await showImageryTool(
      baseMsg({ imagery: { ...imagery, tilejson_url: url } })
    );

    expect(fetchMock).toHaveBeenCalledWith(url, {
      headers: { Authorization: "Bearer test-token" },
    });
  });

  it("does not leak the token to a host that merely starts with the API host", async () => {
    const fetchMock = mockFetch({});
    const url = `${API_CONFIG.API_HOST}.evil.example.com/tilejson.json`;

    await showImageryTool(
      baseMsg({ imagery: { ...imagery, tilejson_url: url } })
    );

    expect(fetchMock).toHaveBeenCalledWith(url, { headers: {} });
  });

  it("hides earlier captures and stacks the new one on top of them", async () => {
    mockFetch({});
    mapState.layers = [
      { id: "dataset-4", name: "TCL", type: "raster", visible: true },
      {
        id: "imagery-old",
        name: "Satellite Imagery",
        type: "raster",
        visible: true,
        imagery: { ...imagery, mosaic_id: "old" },
      },
    ] as Layer[];

    await showImageryTool(baseMsg());

    const ids = mapState.layers.map((l) => l.id);
    expect(ids).toEqual(["dataset-4", "imagery-abc123", "imagery-old"]);
    const old = mapState.layers.find((l) => l.id === "imagery-old");
    expect(old?.visible).toBe(false);
    const dataset = mapState.layers.find((l) => l.id === "dataset-4");
    expect(dataset?.visible).toBe(true);
  });

  it("re-running the same mosaic upserts instead of stacking", async () => {
    mockFetch({});

    await showImageryTool(baseMsg());
    await showImageryTool(baseMsg());

    expect(
      mapState.layers.filter((l) => l.id === "imagery-abc123")
    ).toHaveLength(1);
    expect(mapState.layers[0].visible).toBe(true);
  });

  it("does nothing when the message carries no imagery", async () => {
    const fetchMock = mockFetch({});

    await showImageryTool(baseMsg({ imagery: undefined }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("surfaces an auth error and adds no layer on 401 from the Zeno API", async () => {
    mockFetch({ ok: false, status: 401 });
    const url = `${API_CONFIG.API_HOST}/api/tiles/tilejson.json`;

    await showImageryTool(
      baseMsg({ imagery: { ...imagery, tilejson_url: url } })
    );

    expect(showApiError).toHaveBeenCalledOnce();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("does not claim the session expired when a public tiler returns 403", async () => {
    mockFetch({ ok: false, status: 403 });

    await showImageryTool(baseMsg());

    expect(showApiError).not.toHaveBeenCalled();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no layer and does not throw on a non-ok response", async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(showImageryTool(baseMsg())).resolves.toBeUndefined();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no layer and does not throw when the fetch rejects", async () => {
    mockFetch(new Error("network down"));

    await expect(showImageryTool(baseMsg())).resolves.toBeUndefined();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  describe("Sentinel-2 in the browser", () => {
    const recipe = {
      aois: [{ source: "gadm", srcId: "PER.11.3_1" }],
      aoiNames: [],
      targetDate: "2026-06-15",
      windowDays: 30,
      maxCloudCover: 50,
      maxItems: 50,
    };
    const decoded = {
      ...recipe,
      aoiNames: ["Paracas National Reserve"],
      sort: "cloud",
    };

    beforeEach(() => {
      showSentinel2Capture.mockClear();
    });

    it("decodes the recipe from mosaic_id, with no tile URL", async () => {
      const fetchMock = mockFetch({ json: async () => tileJson });
      await showImageryTool(
        baseMsg({
          imagery: {
            provider: "sentinel-2",
            mosaic_id: encodeRecipe(recipe),
            target_date: "2026-06-15",
            aoi_names: ["Paracas National Reserve"],
          },
        })
      );
      expect(showSentinel2Capture).toHaveBeenCalledWith(
        decoded,
        encodeRecipe(recipe)
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mapState.addLayer).not.toHaveBeenCalled();
    });

    it("renders an older payload with a server mosaic in the browser", async () => {
      const fetchMock = mockFetch({ json: async () => tileJson });
      await showImageryTool(
        baseMsg({ imagery: { ...imagery, mosaic_id: encodeRecipe(recipe) } })
      );
      expect(showSentinel2Capture).toHaveBeenCalledWith(
        decoded,
        encodeRecipe(recipe)
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mapState.addLayer).not.toHaveBeenCalled();
    });

    it("keeps the tiler path for Planet", async () => {
      mockFetch({ json: async () => tileJson });
      await showImageryTool(
        baseMsg({
          imagery: {
            ...imagery,
            provider: "planet",
            mosaic_id: encodeRecipe(recipe),
          },
        })
      );
      expect(showSentinel2Capture).not.toHaveBeenCalled();
      expect(mapState.addLayer).toHaveBeenCalled();
    });

    it("keeps the tiler path when mosaic_id is not a recipe", async () => {
      mockFetch({ json: async () => tileJson });
      await showImageryTool(baseMsg());
      expect(showSentinel2Capture).not.toHaveBeenCalled();
      expect(mapState.addLayer).toHaveBeenCalled();
    });

    it("shows nothing without a recipe or tiles", async () => {
      const fetchMock = mockFetch({ json: async () => tileJson });
      await showImageryTool(
        baseMsg({
          imagery: { provider: "sentinel-2", mosaic_id: "abc", aoi_names: [] },
        })
      );
      expect(showSentinel2Capture).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mapState.addLayer).not.toHaveBeenCalled();
    });
  });

  describe("chat card", () => {
    beforeEach(() => {
      showSentinel2Capture.mockClear();
    });

    it("adds an imagery card for a client capture, before the search", async () => {
      const recipe = {
        aois: [{ source: "gadm", srcId: "X" }],
        aoiNames: [],
        targetDate: "2026-06-15",
        windowDays: 7,
        maxCloudCover: 50,
        maxItems: 50,
      };
      const addMessage = vi.fn();
      const order: string[] = [];
      addMessage.mockImplementation(() => order.push("card"));
      showSentinel2Capture.mockImplementation(async () => {
        order.push("capture");
      });
      await showImageryTool(
        baseMsg({
          imagery: {
            provider: "sentinel-2",
            mosaic_id: encodeRecipe(recipe),
            target_date: "2026-06-15",
            max_cloud_cover: 50,
            aoi_names: ["Paracas"],
          },
        }),
        addMessage
      );
      expect(order).toEqual(["card", "capture"]);
      const [{ type, widgets }] = addMessage.mock.calls[0];
      expect(type).toBe("widget");
      expect(widgets[0].type).toBe("imagery-card");
      expect(widgets[0].data.mosaic_id).toBe(encodeRecipe(recipe));
      showSentinel2Capture.mockReset();
    });

    it("adds a card with a tile thumbnail once a tiler layer is shown", async () => {
      mockFetch({ json: async () => tileJson });
      const addMessage = vi.fn();
      await showImageryTool(baseMsg(), addMessage);
      const [{ widgets }] = addMessage.mock.calls[0];
      expect(widgets[0].type).toBe("imagery-card");
      expect(widgets[0].data.thumbnail_url).toMatch(/^https:\/\/tiles/);
    });

    it("adds no card when the tiler layer is not shown", async () => {
      mockFetch({ ok: false, status: 404 });
      const addMessage = vi.fn();
      await showImageryTool(baseMsg(), addMessage);
      expect(addMessage).not.toHaveBeenCalled();
    });
  });
});
