import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getAuthHeaders: () => ({}),
}));
vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: vi.fn(),
  showError: vi.fn(),
  showServiceUnavailableError: vi.fn(),
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { apiFetch } from "@/app/lib/api-client";
import { ndjsonResponse } from "@/tests/helpers/ndjson";

// The Sentinel-2 example from the backend's wire-contract-schema.md
// (wri/project-zeno#844).
const sentinel2V1 = {
  provider: "sentinel-2",
  period: { start: "2026-09-18", end: "2026-09-29" },
  aoi_names: ["Vaud"],
  layer_id: "eyJhIjpbWyJnYWRtIiwiQ0hFLjI2XzEiXV0",
  source: {
    tiles: [
      "https://tiles.globalforestwatch.org/cog/mosaic/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=s3",
    ],
    bounds: [6.0, 46.2, 7.2, 46.9],
    minzoom: 8,
    maxzoom: 14,
  },
  mosaic_id: "eyJhIjpbWyJnYWRtIiwiQ0hFLjI2XzEiXV0",
  max_cloud_cover: 20,
  scenes: {
    item_count: 6,
    start_date: "2026-09-19",
    end_date: "2026-09-28",
    mean_cloud_cover: 7.35,
    min_cloud_cover: 2.1,
    max_cloud_cover: 14.8,
  },
};

function imageryToolLine(imagery: object): string {
  const update = {
    imagery,
    messages: [
      {
        lc: 1,
        type: "constructor",
        id: ["x"],
        kwargs: {
          content: "Showing Sentinel-2 imagery.",
          type: "tool",
          name: "show_imagery",
          id: "m-imagery",
          status: "success",
        },
      },
    ],
  };
  return JSON.stringify({
    node: "tools",
    timestamp: "2026-09-29T00:00:00.000Z",
    update: JSON.stringify(update),
  });
}

describe("imagery wire contract v1 over /api/chat", () => {
  const tileJsonFetch = vi.fn();

  beforeEach(() => {
    useChatStore.getState().reset();
    useMapStore.getState().reset();
    vi.mocked(apiFetch).mockReset();
    vi.stubGlobal("fetch", tileJsonFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("draws a streamed v1 layer from layer_id and source, without TileJSON", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      ndjsonResponse([imageryToolLine(sentinel2V1)])
    );

    await useChatStore.getState().sendMessage("show me recent imagery");

    await vi.waitFor(() =>
      expect(
        useMapStore
          .getState()
          .layers.find((l) => l.id === `imagery-${sentinel2V1.layer_id}`)
      ).toMatchObject({
        type: "raster",
        visible: true,
        tileUrl: sentinel2V1.source.tiles[0],
        bounds: sentinel2V1.source.bounds,
        minzoom: 8,
        maxzoom: 14,
      })
    );
    expect(tileJsonFetch).not.toHaveBeenCalled();
  });
});
