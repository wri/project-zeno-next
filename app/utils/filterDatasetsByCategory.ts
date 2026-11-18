import {
  type DatasetCardConfig,
  type DatasetCategoryId,
} from "@/app/constants/datasets";

/**
 * Filters dataset cards for the Data Catalog panel by category.
 *
 * - `all` → every card
 * - thematic ids (`land-use`, `disturbance`, ...) → cards whose `categories`
 *   list includes that id.
 *
 * Kept in its own non-JSX module so the test environment (vitest in `node`
 * mode, no JSX transform) can import it without pulling React.
 */
export function filterDatasetsByCategory(
  cards: DatasetCardConfig[],
  category: DatasetCategoryId
): DatasetCardConfig[] {
  if (category === "all") return cards;
  return cards.filter((c) => c.categories?.includes(category));
}
