import area from "@turf/area";
import convex from "@turf/convex";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { searchRange, type Sentinel2Request } from "../model/request";

export const SENTINEL2_COLLECTION = "sentinel-2-l2a";

/** The AOI geometries of a request, as one FeatureCollection. */
export function toFeatureCollection(
  shapes: (Feature | FeatureCollection | Geometry)[]
): FeatureCollection {
  const features = shapes.flatMap((shape): Feature[] => {
    if (shape.type === "FeatureCollection") return shape.features;
    if (shape.type === "Feature") return [shape];
    return [{ type: "Feature", properties: {}, geometry: shape }];
  });
  return { type: "FeatureCollection", features };
}

/** Geodesic area in km² (the backend's limit uses the same measure). */
export function areaKm2(aoi: FeatureCollection): number {
  return area(aoi) / 1e6;
}

/**
 * The geometry the STAC search uses: the convex hull of the AOI.
 * earth-search stores footprints in Elasticsearch, which rejects some rings
 * that are valid GeoJSON (a repeated vertex, a zero-width spike); uploaded
 * custom areas often have them. A hull is always a valid ring with few
 * vertices, and it covers the AOI, so no scene that touches it is missed.
 * Same as `search_geometry` in the backend.
 */
export function searchGeometry(aoi: FeatureCollection): Geometry | null {
  return convex(aoi)?.geometry ?? null;
}

/** The POST /search body for a request (first page). */
export function buildSearchBody(
  request: Sentinel2Request,
  geometry: Geometry,
  today: string
): Record<string, unknown> {
  const { start, end } = searchRange(request, today);
  return {
    collections: [SENTINEL2_COLLECTION],
    intersects: geometry,
    datetime: `${start}T00:00:00Z/${end}T23:59:59Z`,
    query: { "eo:cloud_cover": { lt: request.maxCloudCover } },
    limit: Math.min(request.maxItems, 100),
    // Only what selectScenes reads; full items are ~10 kB each.
    fields: {
      include: [
        "id",
        "bbox",
        "properties.datetime",
        "properties.eo:cloud_cover",
        "properties.grid:code",
        "assets.visual",
        "assets.thumbnail",
      ],
    },
  };
}
