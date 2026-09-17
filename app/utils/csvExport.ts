import { sanitizeFilenameBase } from "./exportChartImage";

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

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/** Download filename for a widget's CSV export: sanitized title + date. */
export function csvFilename(title: string | undefined): string {
  return `${sanitizeFilenameBase(title, "data")}_${todayStamp()}.csv`;
}
