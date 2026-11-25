import area from "@turf/area";
import convex from "@turf/convex";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  DEFAULT_SORT,
  searchRange,
  type Sentinel2Request,
} from "../model/request";

export const SENTINEL2_COLLECTION = "sentinel-2-l2a";

/**
 * The most items one search reads. The search must read every item of the
 * window: a smaller cap keeps only the clearest (or newest) items of the
 * whole area, which often all come from one satellite swath, and the MGRS
 * tiles outside it get no scene at all. selectScenes then keeps the best
 * scenes of each tile. 500 covers ±60 days over a 50,000 km² area (about
 * 12 tiles, a scene every 2-3 days each); items are small (`fields`).
 */
export const SEARCH_ITEM_CAP = 500;
/** Items per page; earth-search's maximum. */
export const SEARCH_PAGE_SIZE = 100;

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
    // The filter is "less than", so a 100 % limit would still drop fully
    // clouded scenes: at 100 % there is no cloud filter.
    ...(request.maxCloudCover < 100
      ? { query: { "eo:cloud_cover": { lt: request.maxCloudCover } } }
      : {}),
    // Least cloudy first: if a window holds more than SEARCH_ITEM_CAP
    // items, the cap drops the cloudiest. Ranking (with nodata) happens
    // client-side in selectScenes.
    ...((request.sort ?? DEFAULT_SORT) === "cloud"
      ? {
          sortby: [{ field: "properties.eo:cloud_cover", direction: "asc" }],
        }
      : {}),
    limit: SEARCH_PAGE_SIZE,
    // Only what selectScenes reads; full items are ~10 kB each.
    fields: {
      include: [
        "id",
        "bbox",
        "properties.datetime",
        "properties.eo:cloud_cover",
        "properties.s2:nodata_pixel_percentage",
        "properties.grid:code",
        "properties.proj:epsg",
        "assets.visual",
        "assets.thumbnail",
      ],
    },
  };
}
