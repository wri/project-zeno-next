import { describe, it, expect } from "vitest";
import type { MapRef } from "react-map-gl/maplibre";

import { enrichMapViewContext } from "../viewContext";
import type { InsightWidget } from "@/app/types/chat";

function fakeMapRef(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}): MapRef {
  const map = {
    getBounds: () => ({
      getWest: () => bounds.west,
      getSouth: () => bounds.south,
      getEast: () => bounds.east,
      getNorth: () => bounds.north,
    }),
    getZoom: () => bounds.zoom,
  };
  return { getMap: () => map } as unknown as MapRef;
}

function insight(insightId?: string): InsightWidget {
  return {
    type: "bar",
    title: "t",
    description: "d",
    data: [],
    xAxis: "x",
    yAxis: "y",
    ...(insightId ? { insightId } : {}),
  };
}

describe("enrichMapViewContext", () => {
  it("passes through null unchanged", () => {
    expect(enrichMapViewContext(null, null, [])).toBeNull();
  });

  it("passes through non-map pages unchanged", () => {
    const base = {
      page: "dashboard" as const,
      dashboard_id: "d1",
      dashboard_name: "Paraná",
    };
    expect(enrichMapViewContext(base, null, [insight("i1")])).toEqual(base);
  });

  it("adds no viewport/visible_insights when mapRef is absent and no insights are shown", () => {
    expect(enrichMapViewContext({ page: "map" }, null, [])).toEqual({
      page: "map",
    });
  });

  it("adds a rounded viewport bbox + zoom from the live map", () => {
    const mapRef = fakeMapRef({
      west: -73.98764321,
      south: 40.76614321,
      east: -73.93974321,
      north: 40.80024321,
      zoom: 5.678,
    });

    const result = enrichMapViewContext({ page: "map" }, mapRef, []);

    expect(result).toEqual({
      page: "map",
      viewport: {
        bbox: [-73.9876, 40.7661, -73.9397, 40.8002],
        zoom: 5.68,
      },
    });
  });

  it("wraps longitudes past the antimeridian into [-180, 180]", () => {
    const mapRef = fakeMapRef({
      west: 170,
      south: -20,
      east: 190,
      north: -10,
      zoom: 4,
    });

    const result = enrichMapViewContext({ page: "map" }, mapRef, []);

    // Crossing boxes keep west > east (RFC 7946 §5.2).
    expect(result).toEqual({
      page: "map",
      viewport: { bbox: [170, -20, -170, -10], zoom: 4 },
    });
  });

  it("wraps a box panned a whole world away", () => {
    const mapRef = fakeMapRef({
      west: -400,
      south: 0,
      east: -380,
      north: 10,
      zoom: 4,
    });

    const result = enrichMapViewContext({ page: "map" }, mapRef, []);

    expect(result).toEqual({
      page: "map",
      viewport: { bbox: [-40, 0, -20, 10], zoom: 4 },
    });
  });

  it("keeps a box ending on the antimeridian at 180", () => {
    const mapRef = fakeMapRef({
      west: 160,
      south: 0,
      east: 180,
      north: 10,
      zoom: 4,
    });

    const result = enrichMapViewContext({ page: "map" }, mapRef, []);

    expect(result).toEqual({
      page: "map",
      viewport: { bbox: [160, 0, 180, 10], zoom: 4 },
    });
  });

  it("sends the whole world when the view spans 360° or more", () => {
    const mapRef = fakeMapRef({
      west: -337.5,
      south: -85,
      east: 337.5,
      north: 85,
      zoom: 0.5,
    });

    const result = enrichMapViewContext({ page: "map" }, mapRef, []);

    expect(result).toEqual({
      page: "map",
      viewport: { bbox: [-180, -85, 180, 85], zoom: 0.5 },
    });
  });

  it("omits the viewport when reading the map throws", () => {
    const mapRef = {
      getMap: () => ({
        getBounds: () => {
          throw new Error("map removed");
        },
      }),
    } as unknown as MapRef;

    expect(
      enrichMapViewContext({ page: "map" }, mapRef, [insight("i1")])
    ).toEqual({ page: "map", visible_insights: ["i1"] });
  });

  it("never forwards stale fields from the stored context", () => {
    const stored = {
      page: "map" as const,
      visible_insights: ["old"],
    };

    expect(enrichMapViewContext(stored, null, [])).toEqual({ page: "map" });
  });

  it("adds deduplicated visible_insights from on-map insight widgets", () => {
    const result = enrichMapViewContext({ page: "map" }, null, [
      insight("i1"),
      insight("i2"),
      insight("i1"),
      insight(undefined),
    ]);

    expect(result).toEqual({
      page: "map",
      visible_insights: ["i1", "i2"],
    });
  });

  it("omits visible_insights when no shown insight has a persisted insightId", () => {
    const result = enrichMapViewContext({ page: "map" }, null, [
      insight(undefined),
      insight(undefined),
    ]);

    expect(result).toEqual({ page: "map" });
  });
});
