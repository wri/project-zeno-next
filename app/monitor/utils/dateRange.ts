import { format, subDays } from "date-fns";

import { DATASET_META } from "../constants/datasets";

/**
 * Returns the appropriate date range for a dataset, using DATASET_META.
 *
 * - If the dataset has a fixed end date → use it directly.
 * - If end_date is null (open-ended, e.g. DIST-ALERT) → use today.
 * - DIST-ALERT (dataset 0) is special: defaults to last 7 days.
 */
export function getDateRangeForDataset(datasetId: number): {
  startDate: string;
  endDate: string;
} {
  const today = format(new Date(), "yyyy-MM-dd");
  const meta = DATASET_META[datasetId];

  if (!meta) {
    // Unknown dataset — use max range
    return { startDate: "2000-01-01", endDate: today };
  }

  // DIST-ALERT: default to last 7 days (most useful window)
  if (datasetId === 0) {
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    return { startDate: weekAgo, endDate: today };
  }

  return {
    startDate: meta.startDate,
    endDate: meta.endDate ?? today,
  };
}
