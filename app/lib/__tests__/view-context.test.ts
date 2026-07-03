import { describe, it, expect, beforeEach, vi } from "vitest";

// The mapStore import chain reaches the Chakra toaster (.tsx) via the error
// handler; stub it so this node-env test doesn't try to parse JSX.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

import { buildViewContext, pageFromPath } from "@/app/lib/view-context";
import useMapStore from "@/app/store/mapStore";
import useInsightStore from "@/app/store/insightStore";
import type { Layer, GeoJsonEntry } from "@/app/store/layerManagerSlice";
import type { InsightWidget } from "@/app/types/chat";
import type { MapRef } from "react-map-gl/maplibre";

// Minimal MapLibre stub exposing only what buildViewContext reads.
function fakeMapRef(
  bbox: [number, number, number, number],
  zoom: number
): MapRef {
  const [west, south, east, north] = bbox;
  return {
    getMap: () => ({
      getBounds: () => ({
        getWest: () => west,
        getSouth: () => south,
        getEast: () => east,
        getNorth: () => north,
      }),
      getZoom: () => zoom,
    }),
  } as unknown as MapRef;
}

function layer(partial: Partial<Layer> & Pick<Layer, "id" | "name">): Layer {
  return {
    type: "geojson",
    visible: true,
    ...partial,
  };
}

function registryEntry(
  name: string,
  source: string,
  srcId?: string
): GeoJsonEntry {
  return {
    ref: { name, source },
    data: { type: "FeatureCollection", features: [] },
    srcId,
  };
}

function insightWidget(insightId?: string): InsightWidget {
  return {
    id: "chart-" + Math.random().toString(36).slice(2),
    ...(insightId ? { insightId } : {}),
    type: "bar",
    title: "t",
    description: "",
    data: [],
    xAxis: "x",
    yAxis: "y",
  };
}

describe("pageFromPath", () => {
  it("returns 'dashboard' for the dashboard route", () => {
    expect(pageFromPath("/app/dashboard")).toBe("dashboard");
  });

  it("returns 'explorer' for the default app route", () => {
    expect(pageFromPath("/app")).toBe("explorer");
    expect(pageFromPath("/app/threads/abc")).toBe("explorer");
  });
});

describe("buildViewContext", () => {
  beforeEach(() => {
    useMapStore.setState({ mapRef: null, layers: [], geoJsonRegistry: [] });
    useInsightStore.getState().clearInsights();
  });

  it("returns undefined when there is nothing to report", () => {
    expect(buildViewContext()).toBeUndefined();
  });

  it("captures the viewport bbox and zoom from the map", () => {
    useMapStore.setState({ mapRef: fakeMapRef([-74, -34, -34, 5], 5.123456) });

    const view = buildViewContext();

    expect(view?.page).toBe("explorer");
    expect(view?.viewport).toEqual({
      bbox: [-74, -34, -34, 5],
      zoom: 5.12346, // rounded to 5 decimals
    });
  });

  it("includes only visible layers, mapped to id + name", () => {
    useMapStore.setState({
      mapRef: fakeMapRef([0, 0, 1, 1], 3),
      layers: [
        layer({ id: "tree-cover-loss", name: "Tree cover loss" }),
        layer({ id: "fire-alerts", name: "Fire alerts", visible: false }),
      ],
    });

    const view = buildViewContext();

    expect(view?.visible_layers).toEqual([
      { id: "tree-cover-loss", name: "Tree cover loss" },
    ]);
  });

  it("resolves AOIs from a visible layer's featureRefs (with src_id from the registry)", () => {
    useMapStore.setState({
      mapRef: fakeMapRef([0, 0, 1, 1], 3),
      layers: [
        layer({
          id: "São Paulo",
          name: "São Paulo",
          featureRefs: [{ name: "São Paulo", source: "gadm" }],
        }),
      ],
      geoJsonRegistry: [registryEntry("São Paulo", "gadm", "BRA.24_1")],
    });

    const view = buildViewContext();

    expect(view?.visible_aois).toEqual([
      { source: "gadm", src_id: "BRA.24_1", name: "São Paulo" },
    ]);
  });

  it("uses aoiSelection for layers without featureRefs (e.g. global selection)", () => {
    useMapStore.setState({
      mapRef: fakeMapRef([0, 0, 1, 1], 3),
      layers: [
        layer({
          id: "Global Layer",
          name: "All countries in the world",
          type: "vector",
          aoiSelection: {
            name: "All countries in the world",
            aois: [
              {
                name: "Brazil",
                src_id: "BRA",
                source: "gadm",
                subtype: "country",
              },
            ],
          },
        }),
      ],
    });

    const view = buildViewContext();

    expect(view?.visible_aois).toEqual([
      { source: "gadm", src_id: "BRA", name: "Brazil" },
    ]);
  });

  it("ignores AOIs whose layer is not visible, and deduplicates", () => {
    useMapStore.setState({
      mapRef: fakeMapRef([0, 0, 1, 1], 3),
      layers: [
        layer({
          id: "hidden",
          name: "hidden",
          visible: false,
          featureRefs: [{ name: "Pará", source: "gadm" }],
        }),
        layer({
          id: "a",
          name: "a",
          featureRefs: [{ name: "São Paulo", source: "gadm" }],
        }),
        layer({
          id: "b",
          name: "b",
          featureRefs: [{ name: "São Paulo", source: "gadm" }], // same AOI, second layer
        }),
      ],
      geoJsonRegistry: [
        registryEntry("São Paulo", "gadm", "BRA.24_1"),
        registryEntry("Pará", "gadm", "BRA.14_1"),
      ],
    });

    const view = buildViewContext();

    expect(view?.visible_aois).toEqual([
      { source: "gadm", src_id: "BRA.24_1", name: "São Paulo" },
    ]);
  });

  it("lists deduplicated insight ids currently on screen", () => {
    useInsightStore.getState().addInsights([
      insightWidget("insight-a"),
      insightWidget("insight-a"), // same insight, second chart
      insightWidget("insight-b"),
      insightWidget(), // legacy widget without an insight id — skipped
    ]);

    const view = buildViewContext();

    expect(view?.visible_insights).toEqual(["insight-a", "insight-b"]);
  });

  it("reports insights even when the map ref is absent", () => {
    useInsightStore.getState().addInsights([insightWidget("insight-a")]);

    const view = buildViewContext();

    expect(view?.viewport).toBeUndefined();
    expect(view?.visible_insights).toEqual(["insight-a"]);
  });

  it("omits empty layer/AOI collections", () => {
    useMapStore.setState({ mapRef: fakeMapRef([0, 0, 1, 1], 3) });

    const view = buildViewContext();

    expect(view?.visible_layers).toBeUndefined();
    expect(view?.visible_aois).toBeUndefined();
  });
});
