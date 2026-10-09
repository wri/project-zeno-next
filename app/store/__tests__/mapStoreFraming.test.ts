// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapRef } from "react-map-gl/maplibre";

import { MAP_LEGEND_ATTR } from "@/app/explorationLayout";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1000;

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as DOMRect;
}

function stubMap() {
  const container = document.createElement("div");
  Object.defineProperties(container, {
    clientWidth: { value: MAP_WIDTH },
    clientHeight: { value: MAP_HEIGHT },
  });
  container.getBoundingClientRect = () => rect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  const fitBounds = vi.fn();
  const mapRef = {
    getMap: () => ({
      fitBounds,
      getContainer: () => container,
      // Flat projection, 10px per degree: enough for the bounds' aspect.
      project: ([lng, lat]: [number, number]) => ({
        x: lng * 10,
        y: -lat * 10,
      }),
    }),
  } as unknown as MapRef;
  useMapStore.setState({ mapRef });
  return { fitBounds, container };
}

/** A 420px legend `height` tall, 12px from the right edge and 28px off the bottom. */
function addLegend(container: HTMLElement, height: number) {
  const legend = document.createElement("div");
  legend.setAttribute(MAP_LEGEND_ATTR, "");
  legend.getBoundingClientRect = () =>
    rect(MAP_WIDTH - 432, MAP_HEIGHT - 28 - height, 420, height);
  container.append(legend);
}

function setDesktop(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as never;
}

const wideBounds: [[number, number], [number, number]] = [
  [-56, -12],
  [-54, -11],
];

describe("mapStore framing", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    useSidebarStore.setState({
      isChatFullSize: false,
      isChatCollapsed: false,
      dataCatalogOpen: false,
      areasPanelOpen: false,
      insightsPanelOpen: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useMapStore.setState({ mapRef: null });
  });

  const nextFrame = () => frames.splice(0).forEach((cb) => cb(0));

  it("frames bounds clear of the compact chat panel on desktop", () => {
    setDesktop(true);
    const { fitBounds } = stubMap();

    useMapStore.getState().flyToBounds(wideBounds);
    nextFrame();

    expect(fitBounds.mock.calls[0][1].padding).toEqual({
      top: 50,
      bottom: 50,
      right: 50,
      left: 470,
    });
  });

  it("keeps even padding on mobile, where the chat is a bottom sheet", () => {
    setDesktop(false);
    const { fitBounds } = stubMap();

    useMapStore.getState().flyToBounds(wideBounds);
    nextFrame();

    expect(fitBounds.mock.calls[0][1].padding.left).toBe(50);
  });

  it("frames bounds clear of the legend in the bottom-right corner", () => {
    setDesktop(true);
    const { fitBounds, container } = stubMap();
    addLegend(container, 150);

    useMapStore.getState().flyToBounds(wideBounds);
    nextFrame();

    expect(fitBounds.mock.calls[0][1].padding).toEqual({
      top: 50,
      bottom: 228,
      right: 50,
      left: 470,
    });
  });

  it("measures the legend a frame later, once a just-added area has rendered", () => {
    setDesktop(true);
    const { fitBounds, container } = stubMap();

    useMapStore.getState().flyToBounds(wideBounds);
    expect(fitBounds).not.toHaveBeenCalled();
    addLegend(container, 70);
    nextFrame();

    expect(fitBounds.mock.calls[0][1].padding.bottom).toBe(148);
  });
});
