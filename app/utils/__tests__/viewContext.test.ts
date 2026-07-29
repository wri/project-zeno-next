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
