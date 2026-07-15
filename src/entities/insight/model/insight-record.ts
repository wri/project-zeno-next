import type { Chart } from "./chart";

/** How an insight was produced — drives the card's verification badge. */
export type InsightVerification = "verified" | "ai-generated";

/**
 * One stored insight from `GET /api/insights` (newest-first), mirroring the
 * backend `InsightResponse`. An insight owns many charts plus a narrative
 * `insightText`, but has no title or source of its own — the card derives its
 * title from the first chart, and no source/methodology is available.
 *
 * `verification` is a frontend classification, not a backend field: the API has
 * no "verified" concept, so live insights are always "ai-generated"; the
 * "verified" value only comes from curated fixtures.
 */
export interface InsightRecord {
  id: string;
  /** ISO-8601 timestamp (backend `created_at`). */
  createdAt: string;
  /** Narrative text describing the insight (backend `insight_text`). */
  insightText: string;
  verification: InsightVerification;
  /**
   * Optional source / methodology label for the card. The backend provides none
   * for AI-generated insights; only curated Verified fixtures set it.
   */
  source?: string;
  charts: Chart[];
}
