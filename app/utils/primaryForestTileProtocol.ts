import maplibregl from "maplibre-gl";

const PRIMARY_FOREST_PROTOCOL = "pf";

export function wrapPrimaryForestTileUrl(url: string): string {
  return `${PRIMARY_FOREST_PROTOCOL}://${url}`;
}

let registered = false;

// The primary forest tile service serves PNGs with a black background.
// This protocol rewrites pure-black pixels to alpha=0 so the layer
// composites cleanly over the basemap.
export function registerPrimaryForestProtocol(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;

  maplibregl.addProtocol(
    PRIMARY_FOREST_PROTOCOL,
    async (params, abortController) => {
      const url = params.url.replace(/^pf:\/\//, "");
      const response = await fetch(url, { signal: abortController.signal });
      if (!response.ok) {
        throw new Error(`Tile fetch failed: ${response.status}`);
      }
      const blob = await response.blob();
      const sourceBitmap = await createImageBitmap(blob, {
        imageOrientation: "none",
        premultiplyAlpha: "none",
      });

      const canvas = document.createElement("canvas");
      canvas.width = sourceBitmap.width;
      canvas.height = sourceBitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D canvas context unavailable");
      ctx.drawImage(sourceBitmap, 0, 0);
      sourceBitmap.close();

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0) {
          pixels[i + 3] = 0;
        }
      }

      const data = await createImageBitmap(imageData);
      return { data };
    }
  );
}
