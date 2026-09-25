/**
 * Case facets for the intent x dataset matrix. Prefer the facets the
 * ledger stamps into cases_index.json (gnw-gold-evals PR #45); fall back
 * to the store's `set` / `group` convention for older artefacts, where the
 * numeric sets' groups are dataset slugs and aoi's are prompt subtypes.
 */

import {
  DATASET_GROUPS,
  INTENT_BY_SET,
  SUBTYPE_GROUP_SETS,
} from "../model/config";
import type { CaseIndexEntry } from "../model/types";

/** Taxonomy key of the case, or null outside the taxonomy (GOLD). */
export function caseIntentKey(entry: CaseIndexEntry): string | null {
  if (entry.intent) return entry.intent;
  if (!entry.set) return null;
  return INTENT_BY_SET[entry.set] ?? entry.set;
}

/** Datasets the case exercises; [] for dataset-agnostic or unknown. */
export function caseDatasetIds(entry: CaseIndexEntry): readonly string[] {
  if (entry.datasetIds) return entry.datasetIds;
  if (!entry.set || SUBTYPE_GROUP_SETS.has(entry.set)) return [];
  const dataset = DATASET_GROUPS[entry.group];
  return dataset ? [dataset.datasetId] : [];
}
