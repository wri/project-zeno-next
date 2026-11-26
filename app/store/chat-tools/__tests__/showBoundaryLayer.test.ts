import { describe, it, expect, beforeEach, vi } from "vitest";

const mapState = {
  selectAreaLayer: "GADM" as LayerId | null,
  setSelectAreaLayer: vi.fn((id: LayerId | null) => {
    mapState.selectAreaLayer = id;
  }),
};

vi.mock("@/app/store/mapStore", () => ({
  default: { getState: () => mapState },
}));

import { showBoundaryLayerTool } from "../showBoundaryLayer";
import type { StreamMessage } from "@/app/types/chat";
import type { LayerId } from "@/app/types/map";

function message(source?: string): StreamMessage {
  return {
    type: "tool",
    name: "show_boundary_layer",
    boundary_layer: source ? { source, name: "Layer" } : undefined,
    timestamp: new Date().toISOString(),
  };
}

describe("showBoundaryLayerTool", () => {
  beforeEach(() => {
    mapState.selectAreaLayer = "GADM";
    mapState.setSelectAreaLayer.mockClear();
  });

  it("shows the boundary layer from agent state", () => {
    showBoundaryLayerTool(message("oil_palm"));
    expect(mapState.setSelectAreaLayer).toHaveBeenCalledWith("OIL_PALM");
    expect(mapState.selectAreaLayer).toBe("OIL_PALM");
  });

  it("does nothing without a boundary layer (the type nudge)", () => {
    showBoundaryLayerTool(message());
    expect(mapState.setSelectAreaLayer).not.toHaveBeenCalled();
    expect(mapState.selectAreaLayer).toBe("GADM");
  });

  it("keeps the current layer for an unknown source", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    showBoundaryLayerTool(message("soy"));
    expect(mapState.setSelectAreaLayer).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
