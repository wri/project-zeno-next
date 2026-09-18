import { describe, it, expect } from "vitest";
import type { MultiPolygon, Polygon } from "geojson";
import { customAreaToFeature } from "../customAreaFeature";

const ring = (x: number) => [
  [
    [x, 0],
    [x, 1],
    [x + 1, 1],
    [x, 0],
  ],
];

describe("customAreaToFeature", () => {
  it("merges Polygon and MultiPolygon parts into one flat MultiPolygon", () => {
    const polygon: Polygon = { type: "Polygon", coordinates: ring(0) };
    const multi: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [ring(5), ring(10)],
    };

    const feature = customAreaToFeature({
      id: "a1",
      name: "Upland",
      geometries: [polygon, multi],
    });

    expect(feature.id).toBe("a1");
    expect(feature.properties).toEqual({ id: "a1", name: "Upland" });
    expect(feature.geometry).toEqual({
      type: "MultiPolygon",
      coordinates: [ring(0), ring(5), ring(10)],
    });
  });
});
