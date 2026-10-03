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
import { sentinel2Imagery } from "@/tests/helpers/imagery";
import { ndjsonResponse } from "@/tests/helpers/ndjson";

// The Sentinel-2 example from the backend's wire-contract-schema.md.
const sentinel2Payload = sentinel2Imagery();

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

describe("imagery wire contract over /api/chat", () => {
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

  it("draws a streamed contract layer from layer_id and source, without TileJSON", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      ndjsonResponse([imageryToolLine(sentinel2Payload)])
    );

    await useChatStore.getState().sendMessage("show me recent imagery");

    await vi.waitFor(() =>
      expect(
        useMapStore
          .getState()
          .layers.find((l) => l.id === `imagery-${sentinel2Payload.layer_id}`)
      ).toMatchObject({
        type: "raster",
        visible: true,
        tileUrl: sentinel2Payload.source.tiles[0],
        bounds: sentinel2Payload.source.bounds,
        minzoom: 8,
        maxzoom: 14,
      })
    );
    expect(tileJsonFetch).not.toHaveBeenCalled();
  });
});
