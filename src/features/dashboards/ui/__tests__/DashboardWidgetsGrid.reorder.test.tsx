// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The card's toaster import reaches a .tsx module boundary — stub it.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the geometry query off the network (the map widget fires it on mount).
vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(() => new Promise(() => {})),
}));

// Instrument the map: real MapLibre needs WebGL (unavailable in happy-dom), so
// stub react-map-gl with a component that counts mounts/unmounts. That is
// enough to assert the invariant this test guards — whether React remounts the
// map widget — which is a property of the grid's keyed reconciliation, not of
// MapLibre.
const mapMounts = { count: 0 };
const mapUnmounts = { count: 0 };
vi.mock("react-map-gl/maplibre", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MapGl = ({ children }: { children?: React.ReactNode }) => {
    useEffect(() => {
      mapMounts.count += 1;
      return () => {
        mapUnmounts.count += 1;
      };
    }, []);
    return <div data-testid="mapgl">{children}</div>;
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

import DashboardWidgetsGrid from "../DashboardWidgetsGrid";
import type { Dashboard, DashboardWidget } from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";

const mapWidget = (id: string, position: number): DashboardWidget => ({
  id,
  position,
  widget_type: "map",
  config: {
    dataset: {
      tile_url: `https://example.test/${id}/{z}/{x}/{y}.png`,
      dataset_name: `Layer ${id}`,
    },
  },
  created_at: "2026-07-01T00:00:00Z",
  insight: null,
});

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Test",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      source: "gadm",
      src_id: "BRA",
      subtype: "country",
      name: "Brazil",
      id: "a1",
      position: 0,
    },
  ],
  widgets: [mapWidget("m1", 0), mapWidget("m2", 1)],
};

const renderGrid = (d: Dashboard, queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetsGrid dashboard={d} />
      </ChakraProvider>
    </QueryClientProvider>
  );

describe("DashboardWidgetsGrid reorder", () => {
  beforeEach(() => {
    mapMounts.count = 0;
    mapUnmounts.count = 0;
    useAuthStore.setState({ userId: "u1" });
  });

  // Regression guard for the map-widget reorder crash: reordering only changes
  // widget `position`, and cells are keyed on `widget.id`, so React must
  // *move* the map widgets, never unmount/remount them. A remount would call
  // react-map-gl's `map.remove()` while raster tiles are still loading, and the
  // library's `_updateStyleComponents` then reads `map.style._loaded` on a
  // removed map (`map.style` is deleted by `remove()`) → the reported
  // TypeError. Keep the key stable (never fold `position` into it).
  it("does not remount map widgets when their order changes", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = renderGrid(dashboard, queryClient);

    expect(mapMounts.count).toBe(2);
    expect(mapUnmounts.count).toBe(0);

    // A reorder swaps positions and hands the grid a fresh dashboard object
    // (new array + new widget objects, same ids) — exactly what the optimistic
    // update and the settle-time refetch produce.
    const reordered: Dashboard = {
      ...dashboard,
      widgets: [
        { ...dashboard.widgets[1], position: 0 },
        { ...dashboard.widgets[0], position: 1 },
      ],
    };
    rerender(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>
          <DashboardWidgetsGrid dashboard={reordered} />
        </ChakraProvider>
      </QueryClientProvider>
    );

    // Still two live maps, none torn down.
    expect(mapMounts.count).toBe(2);
    expect(mapUnmounts.count).toBe(0);
  });
});
