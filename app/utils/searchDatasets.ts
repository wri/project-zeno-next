import {
  DATASET_CATEGORY_LABELS,
  type DatasetCardConfig,
} from "@/app/constants/datasets";
import { DATASET_META_FIELDS } from "@/app/utils/datasetMeta";

/** The text a catalogue search matches against: name, meta and category labels. */
function searchText(card: DatasetCardConfig): string {
  return [
    card.dataset_name,
    ...DATASET_META_FIELDS.map((f) => card[f]),
    ...(card.categories ?? []).map((id) => DATASET_CATEGORY_LABELS[id]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Case-insensitive substring search over the Data Catalog cards. A blank
 * query returns every card. Descriptions are deliberately not searched: short
 * words like "loss" would match nearly everything.
 */
export function searchDatasets(
  cards: DatasetCardConfig[],
  query: string
): DatasetCardConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter((card) => searchText(card).includes(q));
}
