import { sanitizeFilenameBase, todayStamp } from "./exportChartImage";

/** Download filename for a widget's CSV export: sanitized title + date. */
export function csvFilename(title: string | undefined): string {
  return `${sanitizeFilenameBase(title, "data")}_${todayStamp()}.csv`;
}
