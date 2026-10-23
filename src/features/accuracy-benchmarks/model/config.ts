/**
 * Labels and order mirrored from gnw-gold-evals (`goldset.benchmark`
 * STAGE_ORDER and the validator names in `goldset.registry`); update both
 * together.
 */

import type { AttributionKey, StageKey } from "./types";

/** Attribution order: a failed question counts at its earliest failing stage. */
export const STAGE_ORDER: readonly StageKey[] = [
  "scope",
  "retrieval",
  "analysis",
  "explanation",
  "output",
];

export const ATTRIBUTION_ORDER: readonly AttributionKey[] = [
  ...STAGE_ORDER,
  "unattributed",
];

export const STAGE_LABELS: Readonly<Record<AttributionKey | "shared", string>> =
  {
    scope: "Scope",
    retrieval: "Retrieval",
    analysis: "Analysis",
    explanation: "Explanation",
    output: "Output",
    unattributed: "Unattributed",
    shared: "Shared",
  };

export const STAGE_QUESTIONS: Readonly<Record<StageKey, string>> = {
  scope:
    "Does it choose the right response: answer, ask a clarifying question, or decline?",
  retrieval: "Does it get the right data: place, dataset, settings and dates?",
  analysis: "Does it calculate correctly from that data?",
  explanation:
    "Does the written answer describe the data accurately, with the right caveats?",
  output: "Does it return the right chart, map layer or table?",
};

/** Plain-language names for the checks a question can fail. */
export const CHECK_LABELS: Readonly<Record<string, string>> = {
  aoi_id_match: "Picked the right place",
  dataset_id_match: "Picked the right dataset",
  data_pull_exists: "Fetched the data",
  answered_without_data: "Did not answer without data",
  context_layer_match: "Applied the right forest filter",
  dataset_parameter_match:
    "Applied the right settings (such as canopy threshold)",
  date_extraction: "Used the time window the question asked for",
  date_coverage: "Data covers the requested window",
  chart_integrity: "Chart has no missing values",
  chart_well_formed: "Chart is well-formed",
  answer_traceability: "Figures in the reply match the chart",
  web_fallback: "Did not use web sources in place of the data",
  expected_text_match: "Reply says what it must (judged)",
  clarification_requested: "Asked back when it should (judged)",
  forbidden_tools_absent:
    "Did only what was asked (no analysis on a show-on-map request)",
  pull_source_match: "Pulled from the right source",
  nudge_match: "Offered the right choice of datasets",
  dashboard_created: "Created the dashboard",
};

export function checkLabel(check: string): string {
  return CHECK_LABELS[check] ?? check;
}

/** Plurals for the place kinds in a use case's mix sentence. */
export const PLACE_PLURALS: Readonly<Record<string, string>> = {
  country: "countries",
  "sub-national area": "sub-national areas",
  "protected area": "protected areas",
  "indigenous or community land": "Indigenous or community lands",
  "no place named": "no specific place",
  "several named areas": "several named areas",
  "many areas": "many areas at once",
  "global or regional": "global or regional areas",
  "a point": "single points",
  "other area": "other areas",
};
