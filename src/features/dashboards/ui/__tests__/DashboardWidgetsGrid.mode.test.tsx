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

// Real MapLibre needs WebGL (unavailable in happy-dom); count mounts/unmounts
// instead — mode switching must never remount the widget tree (that is
// Approach A's core invariant: report mode is a render variant of the same
// cells, not a second tree).
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
import type { DashboardMode } from "../../hooks/useDashboardMode";
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

const grid = (mode: DashboardMode, queryClient: QueryClient) => (
  <QueryClientProvider client={queryClient}>
    <ChakraProvider value={defaultSystem}>
      <DashboardWidgetsGrid dashboard={dashboard} mode={mode} />
    </ChakraProvider>
  </QueryClientProvider>
);

describe("DashboardWidgetsGrid report mode", () => {
  beforeEach(() => {
    mapMounts.count = 0;
    mapUnmounts.count = 0;
    useAuthStore.setState({ userId: "u1" });
  });

  it("renders the owner's editing chrome in edit mode and none in report mode", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender, queryAllByLabelText } = render(grid("edit", queryClient));

    // Owner in edit mode: full chrome.
    expect(queryAllByLabelText("Drag to reposition")).toHaveLength(2);
    expect(queryAllByLabelText("Remove from dashboard")).toHaveLength(2);
    expect(queryAllByLabelText("Add to AI conversation")).toHaveLength(2);

    rerender(grid("report", queryClient));

    // Report mode: the chrome is absent from the DOM, not hidden — no
    // focusable ghosts for keyboard users, nothing for print to catch.
    expect(queryAllByLabelText("Drag to reposition")).toHaveLength(0);
    expect(queryAllByLabelText("Remove from dashboard")).toHaveLength(0);
    expect(queryAllByLabelText("Add to AI conversation")).toHaveLength(0);
    expect(queryAllByLabelText("Rename widget")).toHaveLength(0);
  });

  it("never remounts map widgets when the mode toggles", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = render(grid("edit", queryClient));

    expect(mapMounts.count).toBe(2);
    expect(mapUnmounts.count).toBe(0);

    rerender(grid("report", queryClient));
    rerender(grid("edit", queryClient));

    // Same cells, same keys — MapLibre instances survive the round-trip.
    expect(mapMounts.count).toBe(2);
    expect(mapUnmounts.count).toBe(0);
  });
});
