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
  /** Taxonomy key; matches the ledger's stamped `intent`. */
  readonly key: string;
  readonly label: string;
  /** Plain-language gloss shown under the label. */
  readonly blurb: string;
  /** CHALLENGE case set this type maps to; absent = no cases yet (grey). */
  readonly set?: string;
  /** Measured across every dataset: one spanning cell in the matrix. */
  readonly crossCutting?: boolean;
  /** Dimensions a case of this type must be able to fail in for its
   * coverage to count as complete (the matrix's dimension test). */
  readonly requires: readonly BucketName[];
}

const ALL_DIMENSIONS: readonly BucketName[] = ATTRIBUTION_ORDER;

/**
 * The query-type taxonomy for the accuracy view, in matrix row order
 * (dataset-bound intents first, cross-cutting last). Types without a `set`
 * render as "no evals yet" until their CHALLENGE batch is authored — the
 * matrix doubles as the case-authoring roadmap. Spatial === the aoi set
 * (AJ, 2026-09-04). Interim home until the ledger's cases/taxonomy.yml.
 */
export const QUERY_TYPES: readonly QueryTypeDef[] = [
  {
    key: "quantification",
    label: "Quantification",
    blurb: "how much, how many",
    set: "quantification",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "comparison",
    label: "Comparison",
    blurb: "places or periods",
    set: "comparison",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "trend",
    label: "Trend",
    blurb: "change over time",
    set: "trend",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "monitoring",
    label: "Monitoring",
    blurb: "watching for change",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "identification",
    label: "Identification",
    blurb: "what is at this place",
    requires: ["retrieval", "explanation", "output"],
  },
  {
    key: "risk",
    label: "Risk",
    blurb: "exposure and threat",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "causal",
    label: "Causal",
    blurb: "why did this happen",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "feasibility",
    label: "Feasibility",
    blurb: "can it be done here",
    requires: ALL_DIMENSIONS,
  },
  {
    key: "spatial",
    label: "Spatial",
    blurb: "finding the right place",
    set: "aoi",
    crossCutting: true,
    requires: ["retrieval"],
  },
  {
    key: "refusal",
    label: "Refusal",
    blurb: "knowing when not to answer",
    crossCutting: true,
    requires: ["scope"],
  },
  {
    key: "conceptual",
    label: "Conceptual",
    blurb: "definitions and methods",
    crossCutting: true,
    requires: ["scope", "explanation"],
  },
];

/** Store set -> taxonomy key, for artefacts without a stamped `intent`. */
export const INTENT_BY_SET: Readonly<Record<string, string>> = {
  aoi: "spatial",
};

export interface DatasetDef {
  readonly datasetId: string;
  readonly label: string;
}

/**
 * CHALLENGE group slug -> dataset, for the dataset-grouped sets
 * (quantification / comparison / trend), in matrix column order. Fallback
 * only: artefacts stamped with `dataset_ids` win. Ids are zeno catalog ids
 * (cases/zeno_catalog.json).
 */
export const DATASET_GROUPS: Readonly<Record<string, DatasetDef>> = {
  tcl: { datasetId: "4", label: "Tree cover loss" },
  "tc-gain": { datasetId: "5", label: "Tree cover gain" },
  "tree-cover": { datasetId: "7", label: "Tree cover" },
  "land-cover": { datasetId: "1", label: "Land cover" },
  grasslands: { datasetId: "2", label: "Grasslands" },
  "natural-lands": { datasetId: "3", label: "Natural lands" },
  "ghg-flux": { datasetId: "6", label: "GHG net flux" },
  "tcl-drivers": { datasetId: "8", label: "Loss drivers" },
  "tcl-fires": { datasetId: "10", label: "Fire loss" },
  "integrated-alerts": { datasetId: "11", label: "Integrated alerts" },
  sluc: { datasetId: "9", label: "Crop emission factors" },
};

/** Sets whose groups are prompt subtypes, never datasets. */
export const SUBTYPE_GROUP_SETS: ReadonlySet<string> = new Set(["aoi"]);

/** Matrix columns: every known dataset, in DATASET_GROUPS order. */
export const DATASET_COLUMNS: readonly DatasetDef[] =
  Object.values(DATASET_GROUPS);

/**
 * CHALLENGE cell floor for ROBUST coverage (AJ, 2026-09-25): at least this
 * many active cases AND dedicated coverage of every required dimension.
 * BENCHMARK is sampled, so it gates on dimensions only.
 */
export const CHALLENGE_CELL_FLOOR = 10;
