import { SourceCache, SourceChunk } from "@chunkd/middleware";
import { SourceView } from "@chunkd/source";
import { SourceHttp } from "@chunkd/source-http";
import { GeoTIFF } from "@developmentseed/geotiff";

/**
 * Load a GeoTIFF over HTTP range requests. Copied from stac-map
 * (src/utils/geotiff.ts).
 *
 * The HEAD request first is necessary: the sentinel-cogs bucket sends no
 * Access-Control-Expose-Headers, so the browser hides Content-Range from
 * range responses and @chunkd/source-http cannot learn the file size from
 * them. Content-Length on the HEAD response is always readable (stac-map
 * issue 459).
 */
export async function loadGeoTIFF(
  href: string,
  options: { chunkSize?: number; cacheSize?: number } = {}
): Promise<GeoTIFF> {
  const { chunkSize = 32 * 1024, cacheSize = 1024 * 1024 } = options;
  const source = new SourceHttp(href, {});
  await source.head();
  const chunk = new SourceChunk({ size: chunkSize });
  const cache = new SourceCache({ size: cacheSize });
  const view = new SourceView(source, [chunk, cache]);
  return await GeoTIFF.open({ dataSource: source, headerSource: view });
}
