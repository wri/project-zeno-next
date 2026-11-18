import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TerraDraw } from "terra-draw";

import useMapStore from "../mapStore";
import type { PendingDrawnArea } from "../drawAreaSlice";

const terraDraw = {
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  setMode: vi.fn(),
} as unknown as TerraDraw;

function pending(name: string): PendingDrawnArea {
  return {
    geometry: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [] },
          properties: {},
        },
      ],
    },
    bbox: [0, 0, 1, 1],
    name,
  };
}

describe("drawAreaSlice — confirmDrawing", () => {
  beforeEach(() => {
    useMapStore.setState({
      terraDraw,
      isDrawingMode: true,
      pendingDrawnArea: pending("First"),
      createAreaFn: null,
    });
  });

  it("ends the drawing once the save settles", async () => {
    const created = { id: "a1", name: "First", geometries: [] };
    useMapStore.setState({ createAreaFn: vi.fn().mockResolvedValue(created) });

    const result = await useMapStore.getState().confirmDrawing();

    expect(result).toEqual(created);
    expect(useMapStore.getState().isDrawingMode).toBe(false);
    expect(useMapStore.getState().pendingDrawnArea).toBeNull();
  });

  it("leaves a drawing started during the save alone", async () => {
    let resolve!: (v: unknown) => void;
    useMapStore.setState({
      createAreaFn: vi.fn(() => new Promise((r) => (resolve = r))),
    } as never);

    const saving = useMapStore.getState().confirmDrawing();
    useMapStore.getState().startDrawing();
    const second = pending("Second");
    useMapStore.setState({ pendingDrawnArea: second });
    resolve({ id: "a1", name: "First", geometries: [] });
    await saving;

    expect(useMapStore.getState().isDrawingMode).toBe(true);
    expect(useMapStore.getState().pendingDrawnArea).toBe(second);
  });
});
