import { Document, Page, View, Text } from "@react-pdf/renderer";
import { Report, ReportBlock } from "@/app/types/report";
import styles from "./pdfStyles";
import PdfTextBlock from "./PdfTextBlock";
import PdfInsightBlock from "./PdfInsightBlock";

interface Props {
  report: Report;
  /** Map of blockId → PNG data-URL for chart-type insight blocks. */
  chartImages: Map<string, string>;
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Groups sorted blocks for the PDF layout.
 *
 * Adjacent "half"-width blocks are paired into a single row so they sit
 * side-by-side. A "full"-width block (or a lone "half" with no adjacent
 * sibling) occupies a full-width row.
 */
type LayoutRow = { kind: "full"; block: ReportBlock } | { kind: "pair"; left: ReportBlock; right: ReportBlock };

function groupBlocksIntoRows(blocks: ReportBlock[]): LayoutRow[] {
  const rows: LayoutRow[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (
      block.size === "half" &&
      i + 1 < blocks.length &&
      blocks[i + 1].size === "half"
    ) {
      rows.push({ kind: "pair", left: block, right: blocks[i + 1] });
      i += 2;
    } else {
      rows.push({ kind: "full", block });
      i += 1;
    }
  }
  return rows;
}

// ── Block renderer ─────────────────────────────────────────────────────

function RenderBlock({
  block,
  chartImages,
}: {
  block: ReportBlock;
  chartImages: Map<string, string>;
}) {
  if (block.kind === "text") {
    return <PdfTextBlock content={block.content ?? ""} />;
  }
  if (block.kind === "insight" && block.widget) {
    return (
      <PdfInsightBlock
        widget={block.widget}
        imageDataUrl={chartImages.get(block.id)}
      />
    );
  }
  // Unknown block kind — skip
  return null;
}

// ── Document ───────────────────────────────────────────────────────────

export default function ReportPdfDocument({ report, chartImages }: Props) {
  const sorted = [...report.blocks].sort((a, b) => a.order - b.order);
  const rows = groupBlocksIntoRows(sorted);

  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hasContent = sorted.length > 0;

  return (
    <Document
      title={report.title}
      author="Global Nature Watch"
      creator="Global Nature Watch Report Builder"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Report title */}
        <Text style={styles.title}>{report.title}</Text>

        {/* Blocks */}
        {hasContent ? (
          rows.map((row, i) => {
            if (row.kind === "pair") {
              return (
                <View key={i} style={styles.blockRow} wrap={false}>
                  <View style={styles.blockHalf}>
                    <RenderBlock
                      block={row.left}
                      chartImages={chartImages}
                    />
                  </View>
                  <View style={styles.blockHalf}>
                    <RenderBlock
                      block={row.right}
                      chartImages={chartImages}
                    />
                  </View>
                </View>
              );
            }
            return (
              <View key={i} style={styles.blockFull} wrap={false}>
                <RenderBlock block={row.block} chartImages={chartImages} />
              </View>
            );
          })
        ) : (
          <Text style={{ fontSize: 10, color: "#B2B7BD", marginTop: 20 }}>
            This report has no content.
          </Text>
        )}

        {/* Footer on every page */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${report.title}  ·  ${exportDate}  ·  Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
