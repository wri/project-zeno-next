import bbox from "@turf/bbox";
import type { AOISelection } from "@/app/types/chat";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
// Same light style the app uses for its basemap
const STATIC_STYLE = "devseed/cmazl5ws500bz01scaa27dqi4";
// Max safe URL length for Mapbox Static API
const MAX_URL_LENGTH = 8192;

/**
 * Round all coordinates in a geometry to `precision` decimal places.
 */
function reduceCoordPrecision(geom: Geometry, precision: number): Geometry {
  const round = (n: number) => parseFloat(n.toFixed(precision));
  const roundRing = (ring: number[][]): number[][] =>
    ring.map((c) => c.map(round));
  const roundPolygon = (coords: number[][][]): number[][][] =>
    coords.map(roundRing);

  switch (geom.type) {
    case "Polygon":
      return { ...geom, coordinates: roundPolygon(geom.coordinates) };
    case "MultiPolygon":
      return { ...geom, coordinates: geom.coordinates.map(roundPolygon) };
    default:
      return geom;
  }
}

/**
 * Subsample a ring to at most `maxPoints` evenly-spaced vertices,
 * always preserving the closing point.
 */
function decimateRing(ring: number[][], maxPoints: number): number[][] {
  if (ring.length <= maxPoints) return ring;
  const step = (ring.length - 1) / (maxPoints - 1);
  const result: number[][] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(ring[Math.round(i * step)]);
  }
  result.push(ring[ring.length - 1]);
  return result;
}

/**
 * Reduce geometry to a single exterior ring suitable for a small thumbnail:
 * - MultiPolygon → largest sub-polygon only
 * - Only the exterior ring (holes removed)
 * - Decimated to `maxPoints` vertices
 */
function thumbnailGeometry(geom: Geometry, maxPoints = 200): Geometry {
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring?.length) return geom;
    return {
      type: "Polygon",
      coordinates: [decimateRing(ring, maxPoints)],
    };
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates.filter((poly) => poly[0]?.length > 0);
    if (polys.length === 0) return geom;
    const largest = polys.reduce((best, poly) =>
      poly[0].length > best[0].length ? poly : best
    );
    return {
      type: "Polygon",
      coordinates: [decimateRing(largest[0], maxPoints)],
    };
  }
  return geom;
}

function resolveBounds(
  aoiSelection: AOISelection,
  geometry: FeatureCollection | Feature | Geometry | null
): [number, number, number, number] | null {
  const fromAois = unionAoiBboxes(aoiSelection.aois);
  if (fromAois) return fromAois;

  if (!geometry) return null;

  try {
    const bboxArray = bbox(geometry);
    return [bboxArray[0], bboxArray[1], bboxArray[2], bboxArray[3]];
  } catch {
    return null;
  }
}

/** Mapbox Static API URL with AOI boundary overlay — shared by chat and catalog cards. */
export function buildStaticMapUrl(
  aoiSelection: AOISelection,
  geometry: FeatureCollection | Feature | Geometry | null,
  size = 80
): string | null {
  if (!MAPBOX_TOKEN) return null;

  const bounds = resolveBounds(aoiSelection, geometry);
  if (!bounds) return null;

  const [west, south, east, north] = bounds;

  // Static API can't render a dateline-crossing bbox camera; skip thumbnail.
  if (east > 180) return null;

  const w = Math.max(west, -180).toFixed(4);
  const s = Math.max(south, -85).toFixed(4);
  const e = Math.min(east, 180).toFixed(4);
  const n = Math.min(north, 85).toFixed(4);

  const boundsPath = `[${w},${s},${e},${n}]/${size}x${size}@2x`;
  const qs = `?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
  const baseUrl = `https://api.mapbox.com/styles/v1/${STATIC_STYLE}/static`;

  if (geometry) {
    let rawGeom: Geometry | null | undefined;
    if (geometry.type === "FeatureCollection") {
      rawGeom = (geometry as FeatureCollection).features[0]?.geometry;
    } else if (geometry.type === "Feature") {
      rawGeom = (geometry as Feature).geometry;
    } else {
      rawGeom = geometry as Geometry;
    }
    if (rawGeom) {
      for (const maxPoints of [200, 100, 50]) {
        const geom = reduceCoordPrecision(
          thumbnailGeometry(rawGeom, maxPoints),
          2
        );
        const overlayGeoJson = {
          type: "Feature",
          properties: {
            stroke: "#0A3785",
            "stroke-width": 1,
            "fill-opacity": 0,
          },
          geometry: geom,
        };
        const encoded = encodeURIComponent(JSON.stringify(overlayGeoJson));
        const withOverlay = `${baseUrl}/geojson(${encoded})/${boundsPath}${qs}`;
        if (withOverlay.length <= MAX_URL_LENGTH) {
          return withOverlay;
        }
      }
    }
  }

  return `${baseUrl}/${boundsPath}${qs}`;
}
