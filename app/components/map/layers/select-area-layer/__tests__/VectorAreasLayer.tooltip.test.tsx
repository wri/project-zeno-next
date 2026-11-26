// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (e: unknown) => void;
// Layer events pass (type, layerId, fn); map events pass (type, fn). Both
// kinds listen for mousemove, so each kind has its own table.
const handlers: Record<string, Handler> = {};
const mapHandlers: Record<string, Handler> = {};
const fakeMap = {
  on: (type: string, layerOrFn: string | Handler, fn?: Handler) => {
    if (fn) handlers[type] = fn;
    else mapHandlers[type] = layerOrFn as Handler;
  },
  off: vi.fn(),
  isMoving: vi.fn(() => false),
  getCanvas: () => ({ style: {} as CSSStyleDeclaration }),
  setFeatureState: vi.fn(),
  querySourceFeatures: vi.fn(() => []),
  queryRenderedFeatures: vi.fn((): unknown[] => []),
  unproject: vi.fn(() => ({ lng: 5, lat: 5 })),
};

vi.mock("react-map-gl/maplibre", () => ({
  useMap: () => ({ current: fakeMap }),
  Source: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Layer: () => null,
}));

vi.mock("@/app/components/ui/AreaTooltip", () => ({
  default: ({ hoverInfo }: { hoverInfo: { name: string } }) => (
    <div data-testid="area-tooltip">{hoverInfo.name}</div>
  ),
}));

import VectorAreasLayer from "../VectorAreasLayer";

const POINT = { x: 100, y: 100 };

/** Moves the pointer over the map where no boundary is under it. */
function moveOverEmptyMap() {
  act(() => mapHandlers.mousemove({ point: POINT }));
}

function hover(name: string, lng = 0, lat = 0) {
  moveOverEmptyMap();
  act(() => {
    handlers.mousemove({
      features: [{ id: name, properties: { intname: name } }],
      lngLat: { lng, lat },
      point: POINT,
    });
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const tooltip = () => screen.queryByTestId("area-tooltip");

describe("VectorAreasLayer hover tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})) // metadata never resolves; not needed here
    );
    render(<VectorAreasLayer layerId="KBA" />);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fakeMap.isMoving.mockReturnValue(false);
    fakeMap.queryRenderedFeatures.mockClear().mockReturnValue([]);
  });

  it("waits 500ms after the pointer rests before showing", () => {
    hover("Lake Natron");
    advance(499);
    expect(tooltip()).toBeNull();

    advance(1);
    expect(tooltip()?.textContent).toBe("Lake Natron");
  });

  it("restarts the wait on every move and hides while moving", () => {
    hover("Lake Natron");
    advance(500);
    expect(tooltip()).not.toBeNull();

    hover("Serengeti", 1, 1);
    expect(tooltip()).toBeNull();
    advance(300);
    hover("Serengeti", 2, 2);
    advance(300);
    expect(tooltip()).toBeNull();

    advance(200);
    expect(tooltip()?.textContent).toBe("Serengeti");
  });

  it("never shows if the pointer leaves before the delay", () => {
    hover("Lake Natron");
    advance(200);
    act(() => handlers.mouseleave({}));
    advance(1000);
    expect(tooltip()).toBeNull();
  });

  it("hides when the map starts to pan or zoom", () => {
    hover("Lake Natron");
    advance(500);
    expect(tooltip()).not.toBeNull();

    act(() => mapHandlers.movestart({}));
    expect(tooltip()).toBeNull();
  });

  it("cancels a pending show when the map starts to move", () => {
    hover("Lake Natron");
    advance(300);
    act(() => mapHandlers.movestart({}));
    advance(1000);
    expect(tooltip()).toBeNull();
  });

  it("doesn't show when the pointer pauses mid-drag", () => {
    fakeMap.isMoving.mockReturnValue(true);
    hover("Lake Natron");
    advance(1000);
    expect(tooltip()).toBeNull();
  });

  it("shows the area now under a still pointer once the map settles", () => {
    hover("Lake Natron");
    act(() => mapHandlers.movestart({}));
    fakeMap.queryRenderedFeatures.mockReturnValue([
      { id: "Serengeti", properties: { intname: "Serengeti" } },
    ]);
    act(() => mapHandlers.moveend({}));
    expect(fakeMap.setFeatureState).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "Serengeti" }),
      { hover: true }
    );

    advance(499);
    expect(tooltip()).toBeNull();
    advance(1);
    expect(tooltip()?.textContent).toBe("Serengeti");
  });

  it("shows an area that a move brings under a pointer resting on empty map", () => {
    moveOverEmptyMap();
    act(() => mapHandlers.movestart({}));
    fakeMap.queryRenderedFeatures.mockReturnValue([
      { id: "Serengeti", properties: { intname: "Serengeti" } },
    ]);
    act(() => mapHandlers.moveend({}));
    expect(fakeMap.queryRenderedFeatures).toHaveBeenCalledWith(
      POINT,
      expect.anything()
    );
    expect(fakeMap.setFeatureState).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "Serengeti" }),
      { hover: true }
    );

    advance(499);
    expect(tooltip()).toBeNull();
    advance(1);
    expect(tooltip()?.textContent).toBe("Serengeti");
  });

  it("shows an area that a move brings back under a pointer that left the layer", () => {
    hover("Lake Natron");
    act(() => handlers.mouseleave({}));
    act(() => mapHandlers.movestart({}));
    fakeMap.queryRenderedFeatures.mockReturnValue([
      { id: "Lake Natron", properties: { intname: "Lake Natron" } },
    ]);
    act(() => mapHandlers.moveend({}));
    advance(500);
    expect(tooltip()?.textContent).toBe("Lake Natron");
  });

  it("stays hidden after a move if the pointer has left the map", () => {
    hover("Lake Natron");
    act(() => handlers.mouseleave({}));
    act(() => mapHandlers.mouseout({}));
    act(() => mapHandlers.movestart({}));
    act(() => mapHandlers.moveend({}));
    advance(1000);
    expect(tooltip()).toBeNull();
    expect(fakeMap.queryRenderedFeatures).not.toHaveBeenCalled();
  });

  it("stays hidden after a move if no area is under the pointer", () => {
    hover("Lake Natron");
    act(() => mapHandlers.movestart({}));
    act(() => mapHandlers.moveend({}));
    advance(1000);
    expect(tooltip()).toBeNull();
  });

  it("still highlights the hovered boundary immediately", () => {
    hover("Lake Natron");
    expect(fakeMap.setFeatureState).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "Lake Natron" }),
      { hover: true }
    );
  });
});
