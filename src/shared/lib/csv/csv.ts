import { saveUrl } from "../download";

// Spreadsheet apps run a cell that starts with one of these as a formula, so
// text a user typed (a profile's job title, an area's name) could run when
// whoever downloads the file opens it.
const FORMULA_START = /^[=+\-@\t\r]/;

/** `text` with a leading `'` if a spreadsheet would run it as a formula.
 * Text that is only a number, such as "-12.5", stays as it is. */
function inertText(text: string): string {
  return FORMULA_START.test(text) && !Number.isFinite(Number(text))
    ? `'${text}`
    : text;
}

/** One CSV cell, quoted only when it needs it (comma, quote, or newline).
 * Text that would run as a formula is marked as text first (`inertText`). */
function csvCell(value: unknown): string {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? inertText(value)
        : String(value);
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
  try {
    saveUrl(url, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
