import { describe, expect, it } from "vitest";
import type { Polygon } from "geojson";
import {
  areaKm2,
  buildSearchBody,
  searchGeometry,
  toFeatureCollection,
} from "../search";

const square = (size: number): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [size, 0],
      [size, size],
      [0, size],
      [0, 0],
    ],
  ],
});

describe("areaKm2", () => {
  it("measures a 1° square at the equator as ~12,300 km²", () => {
    const km2 = areaKm2(toFeatureCollection([square(1)]));
    expect(km2).toBeGreaterThan(12_000);
    expect(km2).toBeLessThan(12_500);
  });
});

describe("searchGeometry", () => {
  it("is the convex hull of all the AOI parts", () => {
    const hull = searchGeometry(
      toFeatureCollection([
        square(1),
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [3, 3] },
        },
      ])
    ) as Polygon;
    expect(hull.type).toBe("Polygon");
    const xs = hull.coordinates[0].map(([x]) => x);
    expect(Math.max(...xs)).toBe(3);
  });
});

describe("buildSearchBody", () => {
  it("searches the window, the cloud limit and the hull", () => {
    const body = buildSearchBody(
      {
        aois: [{ source: "gadm", srcId: "X" }],
        aoiNames: [],
        targetDate: "2026-06-15",
        windowDays: 7,
        maxCloudCover: 20,
        maxItems: 50,
      },
      square(1),
      "2026-11-25"
    );
    expect(body).toMatchObject({
      collections: ["sentinel-2-l2a"],
      datetime: "2026-06-08T00:00:00Z/2026-06-22T23:59:59Z",
      query: { "eo:cloud_cover": { lt: 20 } },
      limit: 50,
      intersects: square(1),
    });
  });
});
