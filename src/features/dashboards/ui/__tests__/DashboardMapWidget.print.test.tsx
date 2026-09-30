// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { useEffect, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in MapLibre map: the widget only asks it to repaint and to report
// its next idle.
const maplibre = vi.hoisted(() => {
  const idle: (() => void)[] = [];
  return {
    idle,
    map: {
      once: vi.fn((event: string, cb: () => void) => {
        if (event === "idle") idle.push(cb);
      }),
      off: vi.fn(),
      triggerRepaint: vi.fn(),
    },
  };
});

// Real MapLibre needs WebGL (unavailable in happy-dom): stub react-map-gl with
// a map that loads on mount.
vi.mock("react-map-gl/maplibre", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MapGl = ({
    children,
    onLoad,
    ref,
  }: {
    children?: React.ReactNode;
    onLoad?: () => void;
    ref?: React.Ref<unknown>;
  }) => {
    useImperativeHandle(ref, () => ({
      getMap: () => maplibre.map,
      fitBounds: vi.fn(),
    }));
    useEffect(() => onLoad?.(), []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div>{children}</div>;
  };
  return {
    __esModule: true,
    default: MapGl,
    AttributionControl: Passthrough,
    Layer: Passthrough,
    Marker: Passthrough,
    NavigationControl: Passthrough,
    Source: Passthrough,
  };
});

// The area geometry never arrives unless a test says otherwise.
vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(() => new Promise(() => {})),
}));

import DashboardMapWidget, { PRINT_READY_ATTR } from "../DashboardMapWidget";

const layer = {
  kind: "dataset" as const,
  title: "Tree cover loss",
  tileUrl: "https://example.test/{z}/{x}/{y}.png",
};

const renderMap = (props: {
  print?: boolean;
  aoi?: { source: string; src_id: string; name: string };
}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <DashboardMapWidget
          layer={layer}
          aoi={props.aoi}
          bboxOverride={null}
          print={props.print}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );

const readiness = (container: HTMLElement) =>
  container
    .querySelector(`[${PRINT_READY_ATTR}]`)
    ?.getAttribute(PRINT_READY_ATTR);

describe("DashboardMapWidget print readiness", () => {
  beforeEach(() => {
    maplibre.idle.length = 0;
    vi.clearAllMocks();
  });

  it("is drawn once the loaded map goes idle", () => {
    const { container } = renderMap({ print: true });

    expect(readiness(container)).toBe("false");
    // An already idle map is asked to repaint, so an idle event does come.
    expect(maplibre.map.triggerRepaint).toHaveBeenCalled();
    act(() => maplibre.idle.forEach((cb) => cb()));
    expect(readiness(container)).toBe("true");
  });

  it("waits for the area before it counts an idle map as drawn", () => {
    const { container } = renderMap({
      print: true,
      aoi: { source: "gadm", src_id: "GBR.1_1", name: "England" },
    });

    // Idle at the world view, before the area is known, would print the
    // wrong map.
    expect(maplibre.map.once).not.toHaveBeenCalled();
    expect(readiness(container)).toBe("false");
  });

  it("leaves dashboard maps unmarked", () => {
    const { container } = renderMap({});

    expect(readiness(container)).toBeUndefined();
    expect(maplibre.map.once).not.toHaveBeenCalled();
  });
});
