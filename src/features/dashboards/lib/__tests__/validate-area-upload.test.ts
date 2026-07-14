import { describe, expect, it } from "vitest";

import { validateAreaUploadFile } from "../validate-area-upload";

const VALID_POLYGON = {
  type: "Feature" as const,
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [-54.0, -25.0],
        [-54.0, -24.9],
        [-53.9, -24.9],
        [-53.9, -25.0],
        [-54.0, -25.0],
      ],
    ],
  },
  properties: {},
};

function geoJsonFile(content: unknown, name = "area.geojson"): File {
  return new File([JSON.stringify(content)], name, {
    type: "application/geo+json",
  });
}

describe("validateAreaUploadFile", () => {
  it("accepts a valid polygon GeoJSON feature", async () => {
    const result = await validateAreaUploadFile(geoJsonFile(VALID_POLYGON));
    expect(result.ok).toBe(true);
    expect(result.polygons).toHaveLength(1);
  });

  it("accepts a MultiPolygon by flattening it into polygons", async () => {
    const result = await validateAreaUploadFile(
      geoJsonFile({
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            VALID_POLYGON.geometry.coordinates,
            [
              [
                [-53.8, -25.0],
                [-53.8, -24.9],
                [-53.7, -24.9],
                [-53.7, -25.0],
                [-53.8, -25.0],
              ],
            ],
          ],
        },
        properties: {},
      })
    );
    expect(result.ok).toBe(true);
    expect(result.polygons).toHaveLength(2);
  });

  it("rejects invalid JSON", async () => {
    const file = new File(["not json"], "bad.geojson", {
      type: "application/geo+json",
    });
    const result = await validateAreaUploadFile(file);
    expect(result.ok).toBe(false);
    expect(result.errorType).toBe("file-format-invalid");
    expect(result.errorMessage).toMatch(/JSON/i);
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["{}"], "area.json", { type: "application/json" });
    const result = await validateAreaUploadFile(file);
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/geojson/i);
  });

  it("rejects empty files", async () => {
    const file = new File([], "empty.geojson", {
      type: "application/geo+json",
    });
    const result = await validateAreaUploadFile(file);
    expect(result.ok).toBe(false);
    expect(result.errorType).toBe("file-empty");
  });
});
