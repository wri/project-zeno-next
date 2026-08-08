import { describe, expect, it } from "vitest";
import type { Feature, FeatureCollection } from "geojson";

import { toPolygons } from "../selectionPolygons";

const square = [
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ],
];
const otherSquare = [
  [
    [2, 2],
    [3, 2],
    [3, 3],
    [2, 3],
    [2, 2],
  ],
];

const feature = (geometry: Feature["geometry"]): Feature => ({
  type: "Feature",
  properties: {},
  geometry,
});

describe("toPolygons", () => {
  it("returns a single polygon feature as one polygon", () => {
    const result = toPolygons(
      feature({ type: "Polygon", coordinates: square })
    );

    expect(result).toEqual([{ type: "Polygon", coordinates: square }]);
  });

  it("splits a MultiPolygon into its constituent polygons", () => {
    const result = toPolygons(
      feature({ type: "MultiPolygon", coordinates: [square, otherSquare] })
    );

    expect(result).toEqual([
      { type: "Polygon", coordinates: square },
      { type: "Polygon", coordinates: otherSquare },
    ]);
  });

  it("flattens a feature collection", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        feature({ type: "Polygon", coordinates: square }),
        feature({ type: "MultiPolygon", coordinates: [otherSquare] }),
      ],
    };

    expect(toPolygons(collection)).toHaveLength(2);
  });

  it("unwraps a geometry collection", () => {
    const result = toPolygons(
      feature({
        type: "GeometryCollection",
        geometries: [
          { type: "Polygon", coordinates: square },
          { type: "Point", coordinates: [0, 0] },
        ],
      })
    );

    expect(result).toEqual([{ type: "Polygon", coordinates: square }]);
  });

  it("skips non-areal geometry", () => {
    expect(toPolygons(feature({ type: "Point", coordinates: [0, 0] }))).toEqual(
      []
    );
  });

  it("tolerates a null geometry", () => {
    expect(toPolygons(feature(null as unknown as Feature["geometry"]))).toEqual(
      []
    );
  });
});
