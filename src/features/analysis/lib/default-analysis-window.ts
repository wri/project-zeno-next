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
