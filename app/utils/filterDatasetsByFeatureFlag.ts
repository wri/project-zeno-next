import { type DatasetCardConfig } from "@/app/constants/datasets";

/**
 * Drops cards gated behind a feature flag that isn't currently on.
 *
 * Applied to browse surfaces (Data Catalog, layer menu) only — never to the
 * `DATASET_CARDS` lookups that resolve a layer's legend or display name, so a
 * layer already on the map keeps rendering if the flag is dropped mid-session.
 *
 * Kept in its own non-JSX module so the test environment (vitest in `node`
 * mode, no JSX transform) can import it without pulling React.
 */
export function filterDatasetsByFeatureFlag<T extends DatasetCardConfig>(
  cards: T[],
  enabledFlags: ReadonlySet<string>
): T[] {
  return cards.filter((c) => !c.featureFlag || enabledFlags.has(c.featureFlag));
}
