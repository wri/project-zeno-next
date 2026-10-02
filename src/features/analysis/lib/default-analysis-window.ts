import { format } from "date-fns";

import { DATASET_CARD_BY_ID } from "@/app/constants/datasets";

/**
 * The analysis window used when the user hasn't pinned a date range in context
 * — wide enough to cover the catalogue's annual datasets.
 *
 * Shared so every entry point that can start an analysis without an explicit
 * window (the View Analysis nudge, the create-dashboard nudge, the AOI menu)
 * analyses the same period. Two of them seeding visibly different numbers for
 * one area would read as a bug.
 */
export const DEFAULT_ANALYSIS_START_DATE = "2001-01-01";
export const DEFAULT_ANALYSIS_END_DATE = "2025-12-31";

/** An analysis period, as the two ISO "yyyy-MM-dd" bounds the API takes. */
export interface AnalysisWindow {
  startDate: string;
  endDate: string;
}

/**
 * The window to analyse a dataset over: the range the user pinned, else the
 * coverage the dataset's own catalogue card declares, else the catalogue-wide
 * default.
 *
 * The per-dataset step matters because the window is what the YEARS parameter
 * chip reports (see `use-analysis`). LGMS covers 2016–2024, so requesting the
 * catalogue-wide 2001–2025 labelled a chart of 2016–2024 figures "YEARS
 * 2001–25" — a wrong year range on a curated chart undermines trust in the
 * numbers (PZB-1355). Datasets that declare no coverage, or declare the same
 * years as the default, are unaffected.
 *
 * A pinned range is explicit user intent and wins for every dataset; it is
 * deliberately not clamped to the dataset's coverage.
 */
export function resolveAnalysisWindow(
  datasetId?: number,
  pinned?: { start: Date; end: Date } | null
): AnalysisWindow {
  if (pinned) {
    return {
      startDate: format(pinned.start, "yyyy-MM-dd"),
      endDate: format(pinned.end, "yyyy-MM-dd"),
    };
  }

  const card =
    datasetId === undefined ? undefined : DATASET_CARD_BY_ID[datasetId];
  const startYear = card?.defaultStartYear;
  const endYear = card?.defaultEndYear;
  // Only honour a fully-declared coverage window, so a half-configured card
  // falls back to the default rather than to a lopsided range.
  if (startYear == null || endYear == null) {
    return {
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    };
  }

  return {
    startDate: `${startYear}-01-01`,
    endDate: `${endYear}-12-31`,
  };
}
