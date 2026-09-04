/**
 * Scoring-model constants, mirrored from gnw-gold-evals
 * `src/goldset/buckets.py` (the source of truth — update both together).
 * No hosts or env reads here: the model segment stays env-free; the GitHub
 * base URL lives in `api/github.ts`.
 */

export const BUCKETS = [
  "retrieval",
  "analysis",
  "explanation",
  "output",
  "scope",
] as const;

export type BucketName = (typeof BUCKETS)[number];

/** Checks that speak for exactly one bucket (ledger names). */
export const DEDICATED: Readonly<Record<string, BucketName>> = {
  aoi_id_match: "retrieval",
  dataset_id_match: "retrieval",
  dataset_parameter_match: "retrieval",
  context_layer_match: "retrieval",
  date_extraction: "retrieval",
  data_pull_exists: "retrieval",
  pull_source_match: "retrieval",
  answered_without_data: "retrieval",
  state_delta: "retrieval",
  class_value_match: "analysis",
  chart_integrity: "analysis",
  expected_text_match: "explanation",
  web_fallback: "explanation",
  answer_traceability: "explanation",
  chart_produced: "output",
  dashboard_aoi_match: "output",
  dashboard_widgets_match: "output",
  dashboard_widgets_valid: "output",
  chart_well_formed: "output",
  chart_type_match: "output",
  clarification_requested: "scope",
  suggested_datasets_match: "scope",
  nudge_match: "scope",
  scope_match: "scope",
};

/** Checks whose failure straddles two buckets and cannot be attributed. */
export const SHARED: Readonly<
  Record<string, readonly [BucketName, BucketName]>
> = {
  charts_answer: ["analysis", "output"],
  agent_answer: ["analysis", "explanation"],
  dashboard_created: ["output", "scope"],
};

/** Reported for diagnosis, never part of any verdict. */
export const INFO_ONLY_CHECKS: ReadonlySet<string> = new Set([
  "date_coverage",
  "answer_traceability",
  "class_value_match",
  "charts_answer_judge",
]);

/**
 * A CHALLENGE run is canonical (published rates) only on prod, default
 * profile, 3+ trials; everything else is a diagnostic and its rates are
 * directional. GOLD's official tier is likewise 3 trials.
 */
export const CANONICAL_ENV = "prod";
export const CANONICAL_TRIALS = 3;

/**
 * Primary-failure attribution order (AJ, 2026-09-04): a failed row's
 * primary dimension is the bucket of its earliest failing dedicated check
 * in this order — "did the wrong kind of work" (scope) outranks "fetched
 * the wrong data". Rows failing only shared checks are "unattributed";
 * this single-dimension view is a presentational simplification the
 * harness itself deliberately does not make.
 */
export const ATTRIBUTION_ORDER: readonly BucketName[] = [
  "scope",
  "retrieval",
  "analysis",
  "explanation",
  "output",
];

export interface QueryTypeDef {
  readonly label: string;
  /** CHALLENGE case set this type maps to; absent = no cases yet (grey). */
  readonly set?: string;
}

/**
 * The query-type taxonomy for the accuracy view (from the Query Accuracy
 * Dashboard mockup). Types without a `set` render grey (n=0) until their
 * CHALLENGE batch is authored — the panel doubles as the case-authoring
 * roadmap. Spatial === the aoi set (AJ, 2026-09-04).
 */
export const QUERY_TYPES: readonly QueryTypeDef[] = [
  { label: "Refusal" },
  { label: "Identification" },
  { label: "Spatial", set: "aoi" },
  { label: "Quantification", set: "quantification" },
  { label: "Monitoring" },
  { label: "Comparison", set: "comparison" },
  { label: "Trend", set: "trend" },
  { label: "Conceptual" },
  { label: "Risk" },
  { label: "Causal" },
  { label: "Feasibility" },
];
