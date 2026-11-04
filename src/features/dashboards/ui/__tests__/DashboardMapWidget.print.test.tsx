// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in MapLibre map: the widget only asks it to repaint and to report
// its next idle.
const maplibre = vi.hoisted(() => {
  const idle: (() => void)[] = [];
  return {
    idle,
    // The props the last rendered map was created with.
    props: {} as { interactive?: boolean },
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
    interactive,
  }: {
    children?: React.ReactNode;
    onLoad?: () => void;
    ref?: React.Ref<unknown>;
    interactive?: boolean;
  }) => {
    maplibre.props = { interactive };
    useImperativeHandle(ref, () => ({
      getMap: () => maplibre.map,
      fitBounds: vi.fn(),
    }));
    useEffect(() => onLoad?.(), []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="maplibre">{children}</div>;
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

import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import type { MapWidgetLayer } from "../../lib/mapWidgets";
import DashboardMapWidget, { PRINT_READY_ATTR } from "../DashboardMapWidget";

const layer: MapWidgetLayer = {
  kind: "dataset",
  title: "Tree cover loss",
  tileUrl: "https://example.test/{z}/{x}/{y}.png",
};

const renderMap = (props: {
  print?: boolean;
  aoi?: { source: string; src_id: string; name: string };
  layer?: MapWidgetLayer;
}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <DashboardMapWidget
          layer={props.layer ?? layer}
          aoi={props.aoi}
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

  it("draws report maps static, so no pan can load tiles after they are ready", () => {
    renderMap({ print: true });
    expect(maplibre.props.interactive).toBe(false);
  });

  it("leaves dashboard maps unmarked", () => {
    const { container } = renderMap({});

    expect(readiness(container)).toBeUndefined();
    expect(maplibre.map.once).not.toHaveBeenCalled();
    expect(maplibre.props.interactive).toBe(true);
  });
});

describe("DashboardMapWidget legend", () => {
  // Real dataset cards: integrated alerts (3 classes), land cover (9).
  const alertsLayer = { ...layer, datasetId: 11 };
  const landCoverLayer = { ...layer, datasetId: 1 };
  const alertsNote = /^Near-real-time integrated disturbance alerts/;

  it("puts the legend under the map, not over it", () => {
    renderMap({ layer: alertsLayer });

    const item = screen.getByText("Low confidence");
    expect(screen.getByTestId("maplibre").contains(item)).toBe(false);
  });

  it("starts collapsed to one line, and opens on request", () => {
    renderMap({ layer: alertsLayer });

    expect(screen.queryByText(alertsNote)).toBeNull();
    const expand = screen.getByRole("button", { name: "Show full legend" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(expand);
    expect(screen.getByText(alertsNote)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText(alertsNote)).toBeNull();
  });

  it("shows three classes collapsed, and the rest on request", () => {
    renderMap({ layer: landCoverLayer });

    expect(screen.getByText("short vegetation")).toBeTruthy();
    expect(screen.queryByText("water")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+6 more" }));
    expect(screen.getByText("water")).toBeTruthy();
  });

  it("prints the legend open, with every class and the note, and no buttons", () => {
    renderMap({ print: true, layer: landCoverLayer });

    expect(screen.getByText("built-up")).toBeTruthy();
    expect(screen.getByText(/^Single-year global land cover/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show less" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Layer opacity" })).toBeNull();
  });

  it("names the context layer the data sits within", () => {
    renderMap({
      layer: {
        ...layer,
        datasetId: TREE_COVER_LOSS_DATASET_ID,
        context: {
          tileUrl: "https://example.test/pf/{z}/{x}/{y}.png",
          name: "primary_forest",
        },
      },
    });

    expect(screen.getByText("within")).toBeTruthy();
    expect(screen.getByText("Primary Forests (2001)")).toBeTruthy();
  });
});
