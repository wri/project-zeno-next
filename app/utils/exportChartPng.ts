/**
 * Export a DOM element containing an SVG chart to a PNG file.
 *
 * Works by:
 * 1. Cloning the SVG and inlining computed styles
 * 2. Serializing to a data-URL
 * 3. Drawing onto an off-screen canvas at 2× resolution
 * 4. Triggering a download of the resulting PNG blob
 */
export default function exportChartPng(
  container: HTMLElement,
  filename = "chart.png"
): void {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Ensure the clone has explicit dimensions
  const { width, height } = svg.getBoundingClientRect();
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  // Inline a white background so the PNG isn't transparent
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "white");
  clone.insertBefore(bg, clone.firstChild);

  // Resolve CSS custom properties on text/line elements
  const resolvedStyles = getComputedStyle(document.documentElement);
  clone.querySelectorAll("[fill], [stroke], text, line, path").forEach((el) => {
    const htmlEl = el as SVGElement;
    for (const attr of ["fill", "stroke"] as const) {
      const val = htmlEl.getAttribute(attr);
      if (val && val.startsWith("var(")) {
        const prop = val.replace(/var\((--[^)]+)\)/, "$1");
        const resolved = resolvedStyles.getPropertyValue(prop).trim();
        if (resolved) htmlEl.setAttribute(attr, resolved);
      }
    }
    // Also resolve style properties
    if (htmlEl.style.fill?.startsWith("var(")) {
      const prop = htmlEl.style.fill.replace(/var\((--[^)]+)\)/, "$1");
      const resolved = resolvedStyles.getPropertyValue(prop).trim();
      if (resolved) htmlEl.style.fill = resolved;
    }
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgDataUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

  const scale = 2; // 2× for retina-quality output
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.onload = () => {
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = svgDataUrl;
}
