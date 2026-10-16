// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep the geometry query off the network (the map widget fires it on mount).
vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(() => new Promise(() => {})),
}));

// How many times each source mounted: a re-dated layer must be a fresh
// source (MapLibre renders through a broken state when a live raster
// source's tiles are swapped), so the test counts mounts per source id.
const mounts = vi.hoisted(() => ({ byId: {} as Record<string, number> }));

// Real MapLibre needs WebGL (unavailable in happy-dom): stub react-map-gl,
// with a Source that exposes its tiles so the URL on the map can be read.
vi.mock("react-map-gl/maplibre", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MapGl = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mapgl">{children}</div>
  );
  const Source = ({
    id,
    tiles,
    children,
  }: {
    id: string;
    tiles?: string[];
    children?: React.ReactNode;
  }) => {
    useEffect(() => {
      mounts.byId[id] = (mounts.byId[id] ?? 0) + 1;
    }, [id]);
    return (
      <div data-testid={`source-${id}`} data-tiles={tiles?.join("|")}>
        {children}
      </div>
    );
  };
  return {
    __esModule: true,
    default: MapGl,
    AttributionControl: Passthrough,
    Layer: Passthrough,
    Marker: Passthrough,
    NavigationControl: Passthrough,
    Source,
  };
});

import DashboardMapWidget from "../DashboardMapWidget";
import type { MapWidgetLayer } from "../../lib/mapWidgets";

const layer: MapWidgetLayer = {
  kind: "dataset",
  title: "Integrated alerts",
  tileUrl:
    "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-09-17&end_date=2026-10-16",
  contextTileUrl: "https://tiles.example.org/natural-lands/{z}/{x}/{y}.png",
  contextLayerName: "natural_lands",
  startDate: "2026-09-17",
  endDate: "2026-10-16",
};

const renderMap = (dateRange?: { start: string; end: string }) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <DashboardMapWidget
          layer={layer}
          aoi={undefined}
          dateRange={dateRange}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );

describe("DashboardMapWidget dateRange", () => {
  beforeEach(() => {
    mounts.byId = {};
  });

  it("mounts a fresh tiles source for a new period, and keeps the context one", () => {
    const { rerender } = renderMap({ start: "2026-10-04", end: "2026-10-10" });
    expect(mounts.byId["widget-tiles"]).toBe(1);

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider value={defaultSystem}>
          <DashboardMapWidget
            layer={layer}
            aoi={undefined}
            dateRange={{ start: "2026-10-16", end: "2026-10-16" }}
          />
        </ChakraProvider>
      </QueryClientProvider>
    );
    expect(mounts.byId["widget-tiles"]).toBe(2);
    expect(mounts.byId["widget-context"]).toBe(1);
    expect(screen.getByTestId("source-widget-tiles").dataset.tiles).toContain(
      "start_date=2026-10-16&end_date=2026-10-16"
    );
  });

  it("draws the snapshot's own period without a dateRange", () => {
    renderMap();
    expect(screen.getByTestId("source-widget-tiles").dataset.tiles).toBe(
      layer.tileUrl
    );
  });

  it("re-dates the main tiles for the period and leaves the context tiles alone", () => {
    renderMap({ start: "2026-10-04", end: "2026-10-10" });
    expect(screen.getByTestId("source-widget-tiles").dataset.tiles).toBe(
      "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-10-04&end_date=2026-10-10"
    );
    expect(screen.getByTestId("source-widget-context").dataset.tiles).toBe(
      layer.contextTileUrl
    );
  });
});
