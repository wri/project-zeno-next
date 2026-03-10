import inlineSvgStyles from "./inlineSvgStyles";

export interface RasterOptions {
  /** Desired logical width in CSS pixels. Height derived from SVG aspect ratio. */
  width: number;
  /** Device pixel ratio multiplier (default 2 for print clarity). */
  scale?: number;
}

/**
 * Rasterises an SVG element to a PNG data-URL.
 *
 * 1. Clones the SVG and inlines computed styles.
 * 2. Sets explicit width/height attributes so the serialized SVG has intrinsic size.
 * 3. Serializes to XML → wraps in a data:image/svg+xml URI.
 * 4. Loads into an Image, draws onto a <canvas> at width×scale for print crispness.
 * 5. Returns canvas.toDataURL('image/png').
 *
 * @param svg - The live SVG element (will NOT be mutated — we clone internally).
 * @param options - Rasterisation options.
 * @returns A PNG data-URL string.
 */
export default function svgToImage(
  svg: SVGSVGElement,
  options: RasterOptions
): Promise<string> {
  const { width, scale = 2 } = options;

  // --- Clone & inline styles ---
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // The clone must be briefly in the DOM so getComputedStyle resolves values.
  // We append it to the same parent as the original so inherited styles match.
  const tempParent = svg.parentElement ?? document.body;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.visibility = "hidden";
  tempParent.appendChild(clone);

  inlineSvgStyles(clone);

  tempParent.removeChild(clone);

  // --- Set explicit dimensions ---
  const svgRect = svg.getBoundingClientRect();
  const aspect = svgRect.height / svgRect.width;
  const logicalHeight = Math.round(width * aspect);

  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(logicalHeight));
  // Ensure viewBox is set so the content scales properly
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute(
      "viewBox",
      `0 0 ${svgRect.width} ${svgRect.height}`
    );
  }

  // --- Serialize → data URI ---
  const xml = new XMLSerializer().serializeToString(clone);
  const svgDataUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

  // --- Draw to canvas ---
  const canvasWidth = width * scale;
  const canvasHeight = logicalHeight * scale;

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("svgToImage: failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () =>
      reject(new Error("svgToImage: failed to load serialized SVG into Image"));
    img.src = svgDataUrl;
  });
}
