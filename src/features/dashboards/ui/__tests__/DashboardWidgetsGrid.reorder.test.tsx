// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  sections: [],
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  // The same invariant during a drag. The drop slot is rendered as the sibling
  // of the card it precedes rather than packed with the widgets: a slot that
  // joined the packing would flip every later half-width card between the two
  // column wrappers on each pointer move, remounting the maps under the cursor.
  it("does not remount map widgets while a drag moves the drop slot", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Half-width maps, so they pack into the two-column run the slot would
    // otherwise re-deal.
    const halved: Dashboard = {
      ...dashboard,
      widgets: dashboard.widgets.map((w) => ({
        ...w,
        config: { ...w.config, size: "single" },
      })),
    };
    renderGrid(halved, queryClient);
    expect(mapMounts.count).toBe(2);

    const item = (id: string) =>
      document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`)!;
    const slot = () =>
      document.querySelector('[data-testid="widget-drop-slot"]');

    // happy-dom lays nothing out, so the two cards get the boxes a browser
    // would give a side-by-side pair.
    const boxes: Record<string, [number, number, number, number]> = {
      "zone:": [0, 0, 1000, 200],
      "widget:m1": [0, 0, 500, 200],
      "widget:m2": [500, 0, 1000, 200],
    };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const zone = this.getAttribute("data-drop-zone");
        const widget = this.getAttribute("data-widget-id");
        const [left, top, right, bottom] = (zone !== null
          ? boxes[`zone:${zone}`]
          : widget
            ? boxes[`widget:${widget}`]
            : undefined) ?? [0, 0, 0, 0];
        return {
          left,
          top,
          right,
          bottom,
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          toJSON: () => ({}),
        } as DOMRect;
      }
    );

    fireEvent.pointerDown(
      within(item("m2")).getByLabelText("Drag to reposition"),
      { button: 0 }
    );

    // Above m1's middle, then below it: the slot really does move across the
    // remaining card, which is what would re-deal the columns.
    fireEvent.pointerMove(document, { clientX: 100, clientY: 50 });
    expect(
      slot()!.compareDocumentPosition(item("m1")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.pointerMove(document, { clientX: 100, clientY: 150 });
    expect(
      slot()!.compareDocumentPosition(item("m1")) &
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy();

    fireEvent.pointerUp(document);

    expect(mapMounts.count).toBe(2);
    expect(mapUnmounts.count).toBe(0);
  });
});
