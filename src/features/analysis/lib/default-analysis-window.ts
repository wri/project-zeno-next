/**
 * Default analysis window used when no date range is pinned — wide enough to
 * cover the catalogue's annual datasets. Shared by every direct-analysis
 * entry point (map View-Analysis nudge, dashboard curated cards) so their
 * windows can't drift apart; bump the end date as new data years land.
 */
export const DEFAULT_START_DATE = "2001-01-01";
export const DEFAULT_END_DATE = "2025-12-31";
