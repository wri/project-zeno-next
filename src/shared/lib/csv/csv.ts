/** One CSV cell, quoted only when it needs it (comma, quote, or newline). */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

/** Builds a CSV string from rows, given the header row and, for each header,
 * the row key to read the cell value from (defaults to the header itself). */
export function rowsToCsv(
  rows: Record<string, unknown>[],
  headers: string[],
  rowKeys: string[] = headers
): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => rowKeys.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");
}

/** Saves `csv` through the browser as `filename`. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
