// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapRef } from "react-map-gl/maplibre";

import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

function stubMap(width = 1920) {
  const fitBounds = vi.fn();
  const mapRef = {
    getMap: () => ({
      fitBounds,
      getContainer: () => ({ clientWidth: width }),
    }),
  } as unknown as MapRef;
  useMapStore.setState({ mapRef });
  return fitBounds;
}

function setDesktop(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as never;
}

const bounds: [[number, number], [number, number]] = [
  [-56, -12],
  [-55, -11],
];

describe("mapStore framing", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      isChatFullSize: false,
      isChatCollapsed: false,
      dataCatalogOpen: false,
      areasPanelOpen: false,
      insightsPanelOpen: false,
    });
  });

  afterEach(() => {
    useMapStore.setState({ mapRef: null });
  });

  it("frames bounds clear of the compact chat panel on desktop", () => {
    setDesktop(true);
    const fitBounds = stubMap();

    useMapStore.getState().flyToBounds(bounds);

    expect(fitBounds.mock.calls[0][1].padding).toEqual({
      top: 50,
      bottom: 50,
      right: 50,
      left: 470,
    });
  });

  it("keeps even padding on mobile, where the chat is a bottom sheet", () => {
    setDesktop(false);
    const fitBounds = stubMap();

    useMapStore.getState().flyToBounds(bounds);

    expect(fitBounds.mock.calls[0][1].padding.left).toBe(50);
  });
});
