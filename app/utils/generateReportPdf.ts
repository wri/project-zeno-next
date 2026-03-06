import { Report } from "@/app/types/report";
import rasteriseReportCharts from "./rasteriseReportCharts";

export type PdfExportPhase =
  | { phase: "rasterising"; current: number; total: number }
  | { phase: "generating" }
  | { phase: "done" };

/**
 * End-to-end PDF export for a report.
 *
 * 1. Rasterises all chart-type insight blocks to PNG data-URLs (with progress).
 * 2. Registers fonts with @react-pdf/renderer.
 * 3. Dynamically imports @react-pdf/renderer and the PDF document component.
 * 4. Generates the PDF blob.
 * 5. Triggers a file download.
 *
 * All heavy dependencies are dynamically imported so they're not in the
 * initial page bundle.
 */
export default async function generateReportPdf(
  report: Report,
  onProgress?: (status: PdfExportPhase) => void
): Promise<void> {
  // ── Step 1: Rasterise charts (skip for text-only reports) ────────
  const CHART_TYPES = [
    "bar", "stacked-bar", "grouped-bar", "line", "area", "pie", "scatter",
  ];
  const hasCharts = report.blocks.some(
    (b) => b.kind === "insight" && b.widget && CHART_TYPES.includes(b.widget.type)
  );

  let chartImages: Map<string, string>;
  if (hasCharts) {
    chartImages = await rasteriseReportCharts(report, {
      onProgress: (p) =>
        onProgress?.({
          phase: "rasterising",
          current: p.current,
          total: p.total,
        }),
    });
  } else {
    chartImages = new Map();
  }

  // ── Step 2: Generate PDF ─────────────────────────────────────────
  onProgress?.({ phase: "generating" });

  // Dynamic imports — @react-pdf/renderer + our PDF components
  const [
    { pdf },
    { default: ReportPdfDocument },
    { default: registerPdfFonts },
    React,
  ] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/app/components/report/pdf/ReportPdfDocument"),
    import("@/app/components/report/pdf/registerFonts"),
    import("react"),
  ]);

  try {
    registerPdfFonts();
  } catch (err) {
    // Font registration can fail if CDN is unreachable — @react-pdf/renderer
    // will fall back to its built-in Helvetica. Log but don't abort.
    console.warn("[generateReportPdf] Font registration failed:", err);
  }

  const element = React.createElement(ReportPdfDocument, {
    report,
    chartImages,
  });

  // pdf() expects ReactElement<DocumentProps> but our component wraps <Document>
  // internally — the runtime type is correct, so we cast through unknown.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();

  // ── Step 3: Trigger download ─────────────────────────────────────
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(report.title)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Small delay before revoking so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  onProgress?.({ phase: "done" });
}

/**
 * Converts a report title to a safe filename slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "report";
}
