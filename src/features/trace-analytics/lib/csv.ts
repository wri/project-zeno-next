/** CSV serialization + client-side download helpers. */

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serialize arbitrary records to CSV. Columns are the sorted union of all
 * keys (matches tracey's csv_bytes_any).
 */
export function toCsv(rows: readonly Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  const header = fields.map(csvCell).join(",");
  const lines = rows.map((r) => fields.map((f) => csvCell(r[f])).join(","));
  return [header, ...lines].join("\r\n");
}

/** Trigger a browser download of the given text content. */
export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/csv"
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
