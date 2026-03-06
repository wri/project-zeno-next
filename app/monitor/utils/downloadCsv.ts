/** Escape a value for CSV output. */
function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/** Format a cell value for display / export. */
export function formatCell(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "number") return String(val);
  return String(val);
}

/** Convert rows to a CSV string. */
export function rowsToCSV(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const lines: string[] = [cols.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(cols.map((col) => escapeCSV(formatCell(row[col]))).join(","));
  }
  return lines.join("\n");
}

/** Trigger a CSV file download in the browser. */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
