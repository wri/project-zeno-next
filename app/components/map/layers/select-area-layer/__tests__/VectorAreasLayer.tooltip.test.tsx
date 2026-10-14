// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (e: unknown) => void;
const handlers: Record<string, Handler> = {};
const fakeMap = {
  on: (type: string, _layer: string, fn: Handler) => {
    handlers[type] = fn;
  },
  off: vi.fn(),
  getCanvas: () => ({ style: {} as CSSStyleDeclaration }),
  setFeatureState: vi.fn(),
  querySourceFeatures: vi.fn(() => []),
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

function hover(name: string, lng = 0, lat = 0) {
  act(() => {
    handlers.mousemove({
      features: [{ id: name, properties: { intname: name } }],
      lngLat: { lng, lat },
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

  it("still highlights the hovered boundary immediately", () => {
    hover("Lake Natron");
    expect(fakeMap.setFeatureState).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "Lake Natron" }),
      { hover: true }
    );
  });
});
