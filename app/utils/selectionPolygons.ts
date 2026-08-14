import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";

/**
 * Flattens a registry entry's GeoJSON into the plain `Polygon[]` that
 * POST /api/custom_areas accepts.
 *
 * Registry entries arrive in several shapes depending on how the area was
 * selected: a single clicked feature, a union of several features, a
 * collection — or a BARE geometry: `GET /api/geometry/:source/:src_id`
 * returns raw `ST_AsGeoJSON` output (typically a MultiPolygon, or a
 * GeometryCollection for multi-part custom areas), so agent-picked areas
 * land in the registry without a Feature wrapper despite `GeoJsonEntry`'s
 * declared type. A MultiPolygon is split into its constituent polygons
 * rather than dropped — an admin area made of islands is still one saveable
 * area. Anything non-areal (points, lines) is skipped.
 */
export function toPolygons(
  data: Feature | FeatureCollection | Geometry
): Polygon[] {
  if (data.type === "FeatureCollection") {
    return data.features.flatMap((feature) =>
      geometryToPolygons(feature.geometry)
    );
  }
  if (data.type === "Feature") {
    return geometryToPolygons(data.geometry);
  }
  return geometryToPolygons(data);
}

function geometryToPolygons(geometry: Geometry | null): Polygon[] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return [{ type: "Polygon", coordinates: geometry.coordinates }];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((coordinates) => ({
      type: "Polygon" as const,
      coordinates,
    }));
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(geometryToPolygons);
  }
  return [];
}
