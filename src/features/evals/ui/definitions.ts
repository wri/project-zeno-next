/**
 * Plain-English keys for the accuracy view: what each failure dimension
 * means (grounded in the checks that feed it — see model/config.ts and
 * gnw-gold-evals buckets.py) and what the coverage-matrix categories mean.
 */

import type { PrimaryDimension } from "../lib/attribution";
import type { MatrixCategory } from "../lib/matrix";
import { DIMENSION_COLORS, PASS_COLOR } from "./charts/palette";

export interface DimensionDefinition {
  key: "pass" | PrimaryDimension;
  label: string;
  color: string;
  description: string;
}

export const DIMENSION_DEFINITIONS: readonly DimensionDefinition[] = [
  {
    key: "pass",
    label: "Pass",
    color: PASS_COLOR,
    description: "The answer cleared every check that applied to it.",
  },
  {
    key: "scope",
    label: "Scope error",
    color: DIMENSION_COLORS.scope,
    description:
      "The wrong kind of work — answered when it should have clarified, refused or nudged, or vice versa.",
  },
  {
    key: "retrieval",
    label: "Retrieval error",
    color: DIMENSION_COLORS.retrieval,
    description:
      "The wrong things were fetched — wrong place, dataset, parameters, context layer or time period.",
  },
  {
    key: "analysis",
    label: "Analysis error",
    color: DIMENSION_COLORS.analysis,
    description:
      "Right data, wrong computation — chart figures that do not add up, or wrong class values.",
  },
  {
    key: "explanation",
    label: "Explanation error",
    color: DIMENSION_COLORS.explanation,
    description:
      "The prose is not faithful to the data — required statements missing, or claims sourced from the web instead of the data pull.",
  },
  {
    key: "output",
    label: "Output error",
    color: DIMENSION_COLORS.output,
    description:
      "The artefacts are wrong — chart missing, malformed or the wrong type; dashboard widgets wrong or invalid.",
  },
  {
    key: "unattributed",
    label: "Unattributed",
    color: DIMENSION_COLORS.unattributed,
    description:
      "Only shared checks failed (answer, chart-vs-answer or dashboard creation). Those straddle two stages, so the failure cannot be pinned on one.",
  },
];

export interface MatrixCategoryDefinition {
  key: MatrixCategory;
  label: string;
  description: string;
}

export const MATRIX_CATEGORY_DEFINITIONS: readonly MatrixCategoryDefinition[] =
  [
    {
      key: "robust",
      label: "ROBUST",
      description:
        "3 or more active cases measure this dimension via dedicated checks — the audit coverage floor. A failure here is attributable and well sampled.",
    },
    {
      key: "thin",
      label: "THIN",
      description:
        "Some coverage, but fewer than 3 dedicated cases — or only shared checks, whose failures cannot be attributed to this dimension.",
    },
    {
      key: "gap",
      label: "GAP",
      description:
        "Cases exist for this type, but none of them can measure this dimension. A failure here would go unseen.",
    },
    {
      key: "none",
      label: "n/a",
      description: "No case set authored for this type yet.",
    },
  ];
