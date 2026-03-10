import { View, Text, Image } from "@react-pdf/renderer";
import { PinnedWidget } from "@/app/types/report";
import styles from "./pdfStyles";
import { toSentenceCase } from "@/app/utils/formatText";

/** Chart types that are rasterised to PNG (everything except table). */
const CHART_TYPES = [
  "bar",
  "stacked-bar",
  "grouped-bar",
  "line",
  "area",
  "pie",
  "scatter",
];

interface Props {
  widget: PinnedWidget;
  /** PNG data-URL for chart-type widgets. Undefined for tables or on rasterisation failure. */
  imageDataUrl?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatCellValue(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value ?? "");
}

// ── Sub-components ─────────────────────────────────────────────────────

function PdfTable({ widget }: { widget: PinnedWidget }) {
  const data = widget.data as Record<string, string | number | boolean>[];
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <View>
      {/* Header row */}
      <View style={styles.tableHeader}>
        {headers.map((h) => (
          <Text key={h} style={styles.tableHeaderCell}>
            {toSentenceCase(h)}
          </Text>
        ))}
      </View>

      {/* Data rows */}
      {data.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={rowIdx % 2 === 1 ? styles.tableRowStriped : styles.tableRow}
        >
          {headers.map((h) => (
            <Text key={h} style={styles.tableCell}>
              {formatCellValue(row[h])}
            </Text>
          ))}
        </View>
      ))}

      {/* Truncation footnote */}
      {widget.truncatedFrom && (
        <Text style={styles.truncationNote}>
          Showing 10 of {widget.truncatedFrom} rows
        </Text>
      )}
    </View>
  );
}

function ChartImage({ imageDataUrl }: { imageDataUrl?: string }) {
  if (imageDataUrl) {
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt
    return <Image src={imageDataUrl} style={styles.chartImage} />;
  }

  // Fallback when rasterisation failed
  return (
    <View style={styles.chartPlaceholder}>
      <Text style={styles.chartPlaceholderText}>
        Chart could not be rendered
      </Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function PdfInsightBlock({ widget, imageDataUrl }: Props) {
  const isChart = CHART_TYPES.includes(widget.type);

  return (
    <View style={styles.insightContainer}>
      {/* Header */}
      <View style={styles.insightHeader}>
        <Text style={styles.insightTitle}>{widget.title}</Text>
        <Text style={styles.insightBadge}>Pinned</Text>
      </View>

      {/* Body */}
      <View style={styles.insightBody}>
        {widget.description ? (
          <Text style={styles.insightDescription}>{widget.description}</Text>
        ) : null}

        {isChart ? (
          <ChartImage imageDataUrl={imageDataUrl} />
        ) : widget.type === "table" ? (
          <PdfTable widget={widget} />
        ) : null}
      </View>
    </View>
  );
}
