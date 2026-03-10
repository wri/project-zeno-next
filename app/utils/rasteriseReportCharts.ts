import { Report, PinnedWidget } from "@/app/types/report";
import { InsightWidget } from "@/app/types/chat";
import svgToImage from "./svgToImage";

/** Chart types that need rasterisation (everything except table/dataset-card). */
const CHART_TYPES: string[] = [
  "bar",
  "stacked-bar",
  "grouped-bar",
  "line",
  "area",
  "pie",
  "scatter",
];

export interface RasterProgress {
  current: number;
  total: number;
}

/** Timeout per chart rasterisation (ms). */
const PER_CHART_TIMEOUT = 5_000;

/** Delay after React render to let Recharts paint (ms). */
const PAINT_SETTLE_MS = 150;

/**
 * Converts a PinnedWidget to the InsightWidget shape that ChartWidget expects.
 */
function toInsightWidget(pw: PinnedWidget): InsightWidget {
  return {
    type: pw.type,
    title: pw.title,
    description: pw.description,
    data: pw.data,
    xAxis: pw.xAxis,
    yAxis: pw.yAxis,
  };
}

/**
 * Waits for the next animation frame + a settle delay.
 */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, PAINT_SETTLE_MS))
  );
}

/**
 * Wraps a promise with a timeout. Rejects if not resolved within `ms`.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Rasterises a single chart block off-screen and returns its PNG data-URL.
 *
 * Dynamically imports ChartWidget + Chakra/React so this module doesn't pull
 * those into non-browser bundles.
 */
async function rasteriseOne(
  widget: PinnedWidget,
  width: number
): Promise<string> {
  // Dynamic imports — these are all already loaded in the browser but keeping
  // them dynamic avoids SSR issues since this file touches DOM APIs.
  const [
    { createRoot },
    { default: React },
    { ChakraProvider },
    { default: theme },
    { default: ChartWidget },
  ] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("@chakra-ui/react"),
    import("@/app/theme"),
    import("@/app/components/widgets/ChartWidget"),
  ]);

  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    visibility: hidden;
    width: ${width}px;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    const insightWidget = toInsightWidget(widget);

    const chartEl = React.createElement(ChartWidget, { widget: insightWidget });
    // ChakraProvider requires `children` in its props type, but createElement
    // passes children as the 3rd arg at runtime. Cast to satisfy TypeScript.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    root.render(React.createElement(ChakraProvider as any, { value: theme }, chartEl));

    // Wait for Recharts to paint into the off-screen container
    await waitForPaint();

    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error(
        `No SVG found for chart "${widget.title}" (type: ${widget.type})`
      );
    }

    const dataUrl = await svgToImage(svg, { width, scale: 2 });
    return dataUrl;
  } finally {
    root.unmount();
    container.remove();
  }
}

/**
 * Rasterises all chart-type insight blocks in a report to PNG data-URLs.
 *
 * Charts are processed sequentially to avoid DOM contention. Progress is
 * reported after each chart via the `onProgress` callback.
 *
 * If a single chart fails or times out, it is skipped (logged to console)
 * and the Map will not contain an entry for that block — the PDF component
 * renders a placeholder instead.
 *
 * @returns Map<blockId, pngDataUrl>
 */
export default async function rasteriseReportCharts(
  report: Report,
  options?: {
    /** Logical pixel width for full-width charts (default 700). */
    width?: number;
    /** Logical pixel width for half-width charts (default 340). */
    halfWidth?: number;
    /** Progress callback invoked after each chart. */
    onProgress?: (progress: RasterProgress) => void;
  }
): Promise<Map<string, string>> {
  const { width = 700, halfWidth = 340, onProgress } = options ?? {};

  const chartBlocks = report.blocks
    .filter((b) => b.kind === "insight" && b.widget && CHART_TYPES.includes(b.widget.type))
    .sort((a, b) => a.order - b.order);

  const result = new Map<string, string>();

  if (chartBlocks.length === 0) return result;

  for (let i = 0; i < chartBlocks.length; i++) {
    const block = chartBlocks[i];
    const blockWidth = (block.size ?? "full") === "half" ? halfWidth : width;

    try {
      const dataUrl = await withTimeout(
        rasteriseOne(block.widget!, blockWidth),
        PER_CHART_TIMEOUT
      );
      result.set(block.id, dataUrl);
    } catch (err) {
      console.warn(
        `[rasteriseReportCharts] Failed to rasterise block "${block.id}" (${block.widget!.title}):`,
        err
      );
      // Skip — PdfInsightBlock will render a placeholder
    }

    onProgress?.({ current: i + 1, total: chartBlocks.length });
  }

  return result;
}
