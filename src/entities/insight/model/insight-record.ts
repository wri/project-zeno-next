import type { Chart } from "./chart";

/** How an insight was produced — drives the card's verification badge. */
export type InsightVerification = "verified" | "ai-generated";

/**
 * One stored insight from `GET /api/insights` (newest-first), mirroring the
 * backend `InsightResponse`. An insight owns many charts plus a narrative
 * `insightText`, but has no title or source of its own — the card derives its
 * title from the first chart, and no source/methodology is available.
 *
 * `verification` is a frontend classification, not a backend field: the API
 * has no "verified" flag, so it is derived from provenance by
 * `isCuratedInsight` — an insight with no CodeAct parts was produced by the
 * deterministic `POST /api/analyze` path and is "verified"; one with
 * provenance came from the agent and is "ai-generated".
 */
export interface InsightRecord {
  id: string;
  /** ISO-8601 timestamp (backend `created_at`). */
  createdAt: string;
  /** Narrative text describing the insight (backend `insight_text`). */
  insightText: string;
  verification: InsightVerification;
  /**
   * Generated title in the form "{dataset} in {location}". Only curated
   * (verified) insights carry one — the backend sends none for AI-generated
   * insights, whose cards still derive a title from their first chart.
   */
  title?: string;
  /**
   * Optional source / methodology label for the card. The backend provides none
   * for AI-generated insights; only curated Verified fixtures set it.
   */
  source?: string;
  charts: Chart[];
}
