import type { Chart } from "./chart";

/** How an insight was produced — drives the card's verification badge. */
export type InsightVerification = "verified" | "ai-generated";

/**
 * One stored insight from `GET /api/insights` (newest-first). An insight owns
 * many charts. Card-level metadata (title, source, timestamp, verification)
 * lives here; the charts drive the detail view via `chartsToWidgets`.
 *
 * Shape is provisional until confirmed against a live payload; the adapter
 * validates each row and drops non-conforming ones.
 */
export interface InsightRecord {
  id: string;
  title: string;
  /** Source line shown on the card (e.g. the dataset / methodology name). */
  source: string;
  /** ISO-8601 timestamp of when the insight was generated. */
  createdAt: string;
  verification: InsightVerification;
  /** Optional narrative text describing the insight. */
  insightText?: string;
  charts: Chart[];
}
