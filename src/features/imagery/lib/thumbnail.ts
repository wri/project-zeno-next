/**
 * Cropping a scene's preview image to the area of interest.
 *
 * A Sentinel-2 preview (`preview.jpg`, 343 × 343 px) shows the whole
 * 110 × 110 km tile, so the area is often a small part of it. With the
 * tile's extent in UTM metres and the area's bounds projected into the same
 * UTM zone, a square crop around the area makes a thumbnail that shows the
 * area itself.
 */

/** [minX, minY, maxX, maxY] in metres. */
export type ProjectedBox = [number, number, number, number];

/** Where to place the preview inside a square box, as fractions of the box. */
export interface PreviewCrop {
  /** Preview width relative to the box (≥ 1 means zoomed in). */
  scale: number;
  /** Preview offset from the box's left / top edge, relative to the box. */
  left: number;
  top: number;
}

/** The crop is at least this wide, so a tiny area still shows context. */
const MIN_SIDE_M = 2_000;
/** Margin around the area, as a fraction of its larger side. */
const MARGIN = 0.1;

/**
 * The square crop of a tile preview that shows `area`. The square is the
 * area's larger side plus a margin, centred on the area and kept inside the
 * tile. Null when the area does not overlap the tile.
 */
export function previewCrop(
  tile: ProjectedBox,
  area: ProjectedBox
): PreviewCrop | null {
  const [tMinX, tMinY, tMaxX, tMaxY] = tile;
  const [aMinX, aMinY, aMaxX, aMaxY] = area;
  if (aMaxX <= tMinX || aMinX >= tMaxX || aMaxY <= tMinY || aMinY >= tMaxY) {
    return null;
  }
  const tileSide = tMaxX - tMinX;
  const side = Math.min(
    tileSide,
    Math.max(MIN_SIDE_M, Math.max(aMaxX - aMinX, aMaxY - aMinY) * (1 + MARGIN))
  );
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const cropMinX = clamp((aMinX + aMaxX) / 2 - side / 2, tMinX, tMaxX - side);
  const cropMaxY = clamp((aMinY + aMaxY) / 2 + side / 2, tMinY + side, tMaxY);
  return {
    scale: tileSide / side,
    left: -(cropMinX - tMinX) / side,
    top: -(tMaxY - cropMaxY) / side,
  };
}

/** The four corners of a lon/lat box, for projecting into a UTM zone. */
export function boxCorners([west, south, east, north]: [
  number,
  number,
  number,
  number,
]): [number, number][] {
  return [
    [west, south],
    [west, north],
    [east, south],
    [east, north],
  ];
}

/** The projected box around a set of projected points. */
export function boundingBox(points: [number, number][]): ProjectedBox {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
