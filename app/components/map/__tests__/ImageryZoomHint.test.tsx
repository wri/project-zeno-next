// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { cleanup, render, screen } from "@testing-library/react";
import type { MapRef } from "react-map-gl/maplibre";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImageryZoomHint } from "../ImageryZoomHint";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { Layer } from "@/app/store/layerManagerSlice";

// Roughly the pill's rendered width; happy-dom doesn't lay elements out.
const PILL_WIDTH_PX = 360;

// happy-dom's viewport control, which drives the breakpoint media queries.
const setViewportWidth = (width: number) =>
  (
    window as unknown as {
      happyDOM: { setViewport: (v: { width: number }) => void };
    }
  ).happyDOM.setViewport({ width });

function setMap({ widthPx, zoom = 5 }: { widthPx: number; zoom?: number }) {
  const map = {
    getZoom: () => zoom,
    getContainer: () => ({ clientWidth: widthPx }),
    on: vi.fn(),
    off: vi.fn(),
    flyTo: vi.fn(),
  };
  useMapStore.setState({
    mapRef: { getMap: () => map } as unknown as MapRef,
    layers: [
      {
        id: "imagery-planet:2026-07",
        name: "Satellite Imagery",
        type: "raster",
        visible: true,
        minzoom: 10,
        bounds: [-56, -12, -55, -11],
        imagery: { provider: "planet" },
      } as Layer,
    ],
  });
  return map;
}

function hintPlacement() {
  render(
    <ChakraProvider value={defaultSystem}>
      <ImageryZoomHint />
    </ChakraProvider>
  );
  const wrapper = screen.getByRole("status").parentElement as HTMLElement;
  return getComputedStyle(wrapper).position === "absolute"
    ? "beside legend"
    : "above legend";
}

describe("ImageryZoomHint", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
      PILL_WIDTH_PX
    );
    setViewportWidth(1280);
    useSidebarStore.setState({
      isChatFullSize: false,
      dataCatalogOpen: false,
      areasPanelOpen: false,
      insightsPanelOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("sits beside the legend when the gap past the chat panel fits it", () => {
    setMap({ widthPx: 1280 });
    expect(hintPlacement()).toBe("beside legend");
  });

  it("stacks above the legend when a catalog column narrows the gap", () => {
    useSidebarStore.setState({ dataCatalogOpen: true });
    setMap({ widthPx: 1280 });
    expect(hintPlacement()).toBe("above legend");
  });

  it("stacks above the legend on mobile", () => {
    setViewportWidth(400);
    setMap({ widthPx: 400 });
    expect(hintPlacement()).toBe("above legend");
  });

  it("is hidden once the map reaches the imagery's min zoom", () => {
    setMap({ widthPx: 1280, zoom: 10 });
    render(
      <ChakraProvider value={defaultSystem}>
        <ImageryZoomHint />
      </ChakraProvider>
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
