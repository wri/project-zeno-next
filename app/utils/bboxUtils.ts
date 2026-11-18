import { Feature, GeoJsonProperties, Polygon } from "geojson";

/**
 * Build a rectangle polygon Feature from a bbox [minLng, minLat, maxLng, maxLat].
 */
export function createBboxPolygon(
  bboxCoords: [number, number, number, number]
): Feature<Polygon, GeoJsonProperties> {
  const [minLng, minLat, maxLng, maxLat] = bboxCoords;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

/**
 * Union multiple AOI bboxes into one, handling antimeridian crossings.
 *
 * Returns [west, south, east, north] where east may exceed 180 when the
 * union crosses the dateline. Callers that need normalized coords (e.g.
 * flyToBounds) should subtract 360 from east if east > 180.
 */
export function unionAoiBboxes(
  aois: { bbox?: [number, number, number, number] }[]
): [number, number, number, number] | null {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  let found = false;
  for (const aoi of aois) {
    if (!aoi.bbox) continue;
    found = true;
    const [w, s, e, n] = aoi.bbox;
    if (w < west) west = w;
    if (s < south) south = s;
    // Unwrap antimeridian-crossing bboxes (w > e) before comparing east values.
    const eNorm = w > e ? e + 360 : e;
    if (eNorm > east) east = eNorm;
    if (n > north) north = n;
  }
  return found ? [west, south, east, north] : null;
}

/**
 * The `flyToBounds` corners for AOI bboxes. Their union keeps a
 * dateline-crossing extent (east > 180), which flyToBounds expects re-wrapped
 * to east <= 180. Null when none of them has a bbox.
 */
export function aoiFlyBounds(
  aois: { bbox?: [number, number, number, number] }[]
): [[number, number], [number, number]] | null {
  const union = unionAoiBboxes(aois);
  if (!union) return null;
  const [west, south, east, north] = union;
  return [
    [west, south],
    [east > 180 ? east - 360 : east, north],
  ];
}
