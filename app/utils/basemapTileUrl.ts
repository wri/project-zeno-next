/**
 * Builds a Mapbox Static Tiles API URL template for a MapLibre raster source.
 */
export function buildBasemapTileUrl(
  stylePath: string,
  accessToken: string | undefined,
  pixelRatio: number
): string {
  const scale = pixelRatio > 1 ? "@2x" : "";
  return `https://api.mapbox.com/styles/v1/${stylePath}/tiles/{z}/{x}/{y}${scale}?access_token=${accessToken}`;
}
