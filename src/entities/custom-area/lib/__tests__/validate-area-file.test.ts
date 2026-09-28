import { describe, expect, it, vi } from "vitest";

import { validateAreaFile } from "../validate-area-file";

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

function fileOfSize(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name);
}

describe("validateAreaFile", () => {
  it("accepts a valid polygon GeoJSON feature", async () => {
    const result = await validateAreaFile(geoJsonFile(VALID_POLYGON));
    expect(result).toMatchObject({ ok: true, kind: "geojson" });
    expect(
      result.ok && result.kind === "geojson" && result.polygons
    ).toHaveLength(1);
  });

  it("accepts a MultiPolygon by flattening it into polygons", async () => {
    const result = await validateAreaFile(
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
    expect(
      result.ok && result.kind === "geojson" && result.polygons
    ).toHaveLength(2);
  });

  it("rejects invalid JSON", async () => {
    const file = new File(["not json"], "bad.geojson", {
      type: "application/geo+json",
    });
    const result = await validateAreaFile(file);
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "Invalid JSON format",
    });
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["{}"], "area.json", { type: "application/json" });
    const result = await validateAreaFile(file);
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "Only .geojson, .csv, .zip files are supported",
    });
  });

  it("rejects empty files", async () => {
    const file = new File([], "empty.geojson", {
      type: "application/geo+json",
    });
    const result = await validateAreaFile(file);
    expect(result).toMatchObject({ ok: false, errorType: "file-empty" });
  });

  it("accepts a MultiPolygon-only FeatureCollection", async () => {
    const result = await validateAreaFile(
      geoJsonFile({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "MultiPolygon",
              coordinates: [VALID_POLYGON.geometry.coordinates],
            },
          },
        ],
      })
    );
    expect(result).toMatchObject({ ok: true, kind: "geojson" });
  });

  it("rejects GeoJSON without polygons", async () => {
    const result = await validateAreaFile(
      geoJsonFile({
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {},
      })
    );
    expect(result).toMatchObject({
      ok: false,
      errorMessage: "No valid Polygon or MultiPolygon features found",
    });
  });

  it("rejects areas below the minimum size", async () => {
    const tiny = structuredClone(VALID_POLYGON);
    tiny.geometry.coordinates = [
      [
        [0, 0],
        [0, 0.0001],
        [0.0001, 0.0001],
        [0.0001, 0],
        [0, 0],
      ],
    ];
    const result = await validateAreaFile(geoJsonFile(tiny));
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-area-too-small",
    });
  });

  it("rejects areas above the maximum size", async () => {
    const huge = structuredClone(VALID_POLYGON);
    huge.geometry.coordinates = [
      [
        [0, 0],
        [0, 5],
        [5, 5],
        [5, 0],
        [0, 0],
      ],
    ];
    const result = await validateAreaFile(geoJsonFile(huge));
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-area-too-large",
    });
  });

  it("keeps the 1 MB limit for GeoJSON", async () => {
    const result = await validateAreaFile(
      fileOfSize("area.geojson", 1024 * 1024 + 1)
    );
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-too-large",
      errorMessage: "File size exceeds 1MB limit",
    });
  });

  it.each(["areas.csv", "AREAS.ZIP"])(
    "accepts %s without reading its contents",
    async (name) => {
      const file = fileOfSize(name, 10);
      const text = vi.spyOn(file, "text");
      const result = await validateAreaFile(file);
      expect(result).toEqual({ ok: true, kind: "batch" });
      expect(text).not.toHaveBeenCalled();
    }
  );

  it("allows CSV/zip files above the GeoJSON limit, up to 10 MB", async () => {
    await expect(
      validateAreaFile(fileOfSize("areas.csv", 10 * 1024 * 1024))
    ).resolves.toEqual({ ok: true, kind: "batch" });

    const result = await validateAreaFile(
      fileOfSize("areas.zip", 10 * 1024 * 1024 + 1)
    );
    expect(result).toMatchObject({
      ok: false,
      errorType: "file-too-large",
      errorMessage: "File size exceeds 10MB limit",
    });
  });

  it("rejects empty CSV files", async () => {
    const result = await validateAreaFile(fileOfSize("areas.csv", 0));
    expect(result).toMatchObject({ ok: false, errorType: "file-empty" });
  });
});
