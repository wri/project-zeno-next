import { describe, it, expect, beforeEach, vi } from "vitest";

const mapState = {
  selectAreaLayer: "GADM" as string | null,
  setSelectAreaLayer: vi.fn((id: string | null) => {
    mapState.selectAreaLayer = id;
  }),
};

vi.mock("@/app/store/mapStore", () => ({
  default: { getState: () => mapState },
}));

import { boundaryLayerId, showBoundaryLayerTool } from "../showBoundaryLayer";
import type { StreamMessage } from "@/app/types/chat";

function message(source?: string): StreamMessage {
  return {
    type: "tool",
    name: "show_boundary_layer",
    boundary_layer: source ? { source, name: "Layer" } : undefined,
    timestamp: new Date().toISOString(),
  } as StreamMessage;
}

describe("boundaryLayerId", () => {
  it("maps every backend concession source to its layer", () => {
    expect(boundaryLayerId("oil_palm")).toBe("OIL_PALM");
    expect(boundaryLayerId("rspo_oil_palm")).toBe("RSPO_OIL_PALM");
    expect(boundaryLayerId("logging")).toBe("LOGGING");
    expect(boundaryLayerId("mining")).toBe("MINING");
    expect(boundaryLayerId("wood_fiber")).toBe("WOOD_FIBER");
  });

  it("matches ids that are not all upper case", () => {
    expect(boundaryLayerId("landmark")).toBe("LandMark");
  });

  it("returns undefined for an unknown source", () => {
    expect(boundaryLayerId("soy")).toBeUndefined();
  });
});

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
