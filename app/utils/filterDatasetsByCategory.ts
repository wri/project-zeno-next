import {
  type DatasetCardConfig,
  type DatasetCategoryId,
} from "@/app/constants/datasets";

/**
 * Filters dataset cards for the Data Catalog panel by category.
 *
 * - `all` → every card
 * - `in-conversation` → cards whose `dataset_id` currently has a `layer`
 *   context entry (covers both AI-picked and user-toggled layers).
 * - thematic ids (`land-use`, `disturbance`, ...) → cards whose `categories`
 *   list includes that id.
 *
 * Kept in its own non-JSX module so the test environment (vitest in `node`
 * mode, no JSX transform) can import it without pulling React.
 */
export function filterDatasetsByCategory(
  cards: DatasetCardConfig[],
  category: DatasetCategoryId,
  activeDatasetIds: number[]
): DatasetCardConfig[] {
  if (category === "all") return cards;
  if (category === "in-conversation") {
    const idSet = new Set(activeDatasetIds);
    return cards.filter((c) => idSet.has(c.dataset_id));
  }
  return cards.filter((c) => c.categories?.includes(category));
}
