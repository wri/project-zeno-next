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

import { showImageryTool } from "../showImagery";
import type { ChatMessage, ImageryInfo, StreamMessage } from "@/app/types/chat";

type AddMessageFn = (message: Omit<ChatMessage, "id">) => void;

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
  let addMessage: ReturnType<typeof vi.fn<AddMessageFn>>;

  beforeEach(() => {
    mapState.layers = [];
    addMessage = vi.fn<AddMessageFn>();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("adds a raster layer keyed on the mosaic id with TileJSON tuning", async () => {
    mockFetch({});

    await showImageryTool(baseMsg(), addMessage);

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

    await showImageryTool(baseMsg(), addMessage);

    expect(fetchMock).toHaveBeenCalledWith(imagery.tilejson_url, {
      headers: {},
    });
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

    await showImageryTool(baseMsg(), addMessage);

    const ids = mapState.layers.map((l) => l.id);
    expect(ids).toEqual(["dataset-4", "imagery-abc123", "imagery-old"]);
    const old = mapState.layers.find((l) => l.id === "imagery-old");
    expect(old?.visible).toBe(false);
    const dataset = mapState.layers.find((l) => l.id === "dataset-4");
    expect(dataset?.visible).toBe(true);
  });

  it("re-running the same mosaic upserts instead of stacking", async () => {
    mockFetch({});

    await showImageryTool(baseMsg(), addMessage);
    await showImageryTool(baseMsg(), addMessage);

    expect(
      mapState.layers.filter((l) => l.id === "imagery-abc123")
    ).toHaveLength(1);
    expect(mapState.layers[0].visible).toBe(true);
  });

  it("adds a Satellite Imagery data card to the chat", async () => {
    mockFetch({});

    await showImageryTool(baseMsg(), addMessage);

    expect(addMessage).toHaveBeenCalledOnce();
    const msg = addMessage.mock.calls[0][0];
    expect(msg.type).toBe("widget");
    const widget = msg.widgets![0];
    expect(widget).toMatchObject({
      type: "imagery-card",
      title: "Satellite Imagery",
      description: "Jun 12–16 · cloud <50% · Sentinel-2",
    });
    // The card thumbnail is computed from the TileJSON bounds/zoom range.
    expect((widget.data as { thumbnail_url?: string }).thumbnail_url).toMatch(
      /^https:\/\/tiles\.example\.com\/\d+\/\d+\/\d+\.png/
    );
  });

  it("does nothing when the message carries no imagery", async () => {
    const fetchMock = mockFetch({});

    await showImageryTool(baseMsg({ imagery: undefined }), addMessage);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mapState.addLayer).not.toHaveBeenCalled();
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("surfaces an auth error and adds no layer on 401", async () => {
    mockFetch({ ok: false, status: 401 });

    await showImageryTool(baseMsg(), addMessage);

    expect(showApiError).toHaveBeenCalledOnce();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no layer and does not throw on a non-ok response", async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(
      showImageryTool(baseMsg(), addMessage)
    ).resolves.toBeUndefined();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no layer and does not throw when the fetch rejects", async () => {
    mockFetch(new Error("network down"));

    await expect(
      showImageryTool(baseMsg(), addMessage)
    ).resolves.toBeUndefined();
    expect(mapState.addLayer).not.toHaveBeenCalled();
  });

  it("adds no chat card when the mosaic is unavailable", async () => {
    mockFetch({ ok: false, status: 404 });

    await showImageryTool(baseMsg(), addMessage);

    expect(addMessage).not.toHaveBeenCalled();
  });
});
