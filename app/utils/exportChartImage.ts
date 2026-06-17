/**
 * Exports a rendered chart (SVG plot + HTML legend) to a PNG download.
 *
 * The chart container mixes an HTML legend with the recharts SVG, so the
 * whole container is rasterized via an SVG <foreignObject>: computed styles
 * are inlined on a clone (CSS variables and classes don't survive
 * serialization), the clone is serialized to a data-URL SVG, drawn onto a
 * 2x canvas with the title and a white background, and downloaded.
 */

const EXPORT_SCALE = 2; // retina-quality raster
const TITLE_BAND_PX = 40; // unscaled space reserved above the chart
const PADDING_PX = 16; // unscaled padding around the chart

/** Copy every computed style property onto the clone as inline style. */
function inlineComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  let cssText = "";
  for (let i = 0; i < computed.length; i++) {
    const property = computed[i];
    cssText += `${property}:${computed.getPropertyValue(property)};`;
  }
  target.setAttribute("style", cssText);

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Failed to rasterize the chart snapshot."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode the PNG."));
    }, "image/png");
  });
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  maxWidth: number
) {
  ctx.fillStyle = "#13171A";
  ctx.font = `600 ${15 * EXPORT_SCALE}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  let text = title;
  while (text.length > 1 && ctx.measureText(text).width > maxWidth) {
    text = `${text.slice(0, -2).trimEnd()}…`;
  }
  ctx.fillText(
    text,
    PADDING_PX * EXPORT_SCALE,
    (PADDING_PX + TITLE_BAND_PX / 2) * EXPORT_SCALE
  );
}

export function chartImageFilename(title: string | undefined): string {
  return `${(title || "chart").replace(/[^a-z0-9]/gi, "_")}.png`;
}

export async function exportChartImage(
  container: HTMLElement,
  title?: string
): Promise<void> {
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    throw new Error("Chart is not visible, so there is nothing to export.");
  }

  const clone = container.cloneNode(true) as HTMLElement;
  inlineComputedStyles(container, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const svgString =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject>` +
    `</svg>`;

  const image = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
  );

  const canvas = document.createElement("canvas");
  canvas.width = (width + PADDING_PX * 2) * EXPORT_SCALE;
  canvas.height = (height + TITLE_BAND_PX + PADDING_PX * 2) * EXPORT_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D rendering is not available in this browser.");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (title) {
    drawTitle(ctx, title, canvas.width - PADDING_PX * 2 * EXPORT_SCALE);
  }
  ctx.drawImage(
    image,
    PADDING_PX * EXPORT_SCALE,
    (TITLE_BAND_PX + PADDING_PX) * EXPORT_SCALE,
    width * EXPORT_SCALE,
    height * EXPORT_SCALE
  );

  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = chartImageFilename(title);
  link.click();
  URL.revokeObjectURL(url);
}
