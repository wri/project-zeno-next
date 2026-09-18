/**
 * What each row of the annual-average tree measures, as the science team wrote
 * it — the copy behind the per-row info icons.
 *
 * Keyed by the backend's raw node id (`src/api/services/charts/lgms.py`
 * `_hierarchy_rows`), not by label, so a product rename of a class (see
 * `lgms-labels`) never silently drops a row's description. A node with no
 * entry simply shows no icon, which is how a class the backend adds later
 * degrades.
 *
 * Aggregate rows state what they sum rather than describing a measurement,
 * because that is the only thing about them a reader can't see in the tree.
 */
export const FLUX_NODE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  all_land: "Sum of land use and agriculture.",

  land_use: "Sum of vegetation and soil.",

  vegetation:
    "Annual gross GHG emissions, gross carbon removals, and GHG net flux from " +
    "data at ~30-m resolution. Includes CO₂, CH₄, and N₂O. Includes aboveground " +
    "biomass, belowground biomass, deadwood, and litter. This does not " +
    "distinguish between permanent and temporary loss or gain, anthropogenic " +
    "and natural disturbances, or natural and planted trees. Forthcoming " +
    "refinements to the interface will support some of those distinctions. " +
    "From Gibbs et al. under review.",

  tree_loss:
    "Emissions from stand-replacing disturbances of vegetation height >5 m, " +
    "with or without fires.",

  tree_gain: "Removals occurring in the year vegetation achieves height >5 m.",

  trees_remaining_trees:
    "Emissions arise from vegetation >5 m in consecutive years, with either " +
    "fire or a height decrease of >5 m over one or more years. Removals arise " +
    "from trees without fire or height loss >5 m.",

  non_trees_remaining_non_trees:
    "Includes loss, gain, and maintenance of short vegetation (height <5 m) " +
    "and annual crops. Emissions arise from the loss of short vegetation and " +
    "annual crops or fires. Removals arise from the gain of short vegetation " +
    "and annual crops. Land that is short vegetation or annual crops in " +
    "consecutive years does not have removals.",

  soil: "Sum of mineral soil and organic soil.",

  mineral_soil:
    "Gross and net change between soil organic carbon densities at 0–30 cm " +
    "depth (difference between average density in 2010 and 2015 and average " +
    "density in 2015 and 2020) from data at ~30-m resolution. This includes " +
    "all land that is not organic soil. Includes CO₂ only (no N₂O emissions " +
    "from soil nitrogen mineralization). From Gibbs et al. under review and " +
    "Hengl et al. 2026.",

  organic_soil:
    "Emissions from disturbance (drainage, fire, extraction) of organic soil " +
    "in two multi-year intervals (2016–2020 and 2021–2024) at 30-m resolution. " +
    "This includes peat and other organic soils. Includes CO₂, CH₄, and N₂O. " +
    "From Glen et al. 2026.",

  agriculture: "Sum of cropland management and livestock.",

  cropland:
    "Emissions from manure application, fertilizer application, rice " +
    "cultivation, and crop residue decomposition. This includes CH₄ and N₂O. " +
    "Data for 2020 is applied to all years. This does not include land-use " +
    "change due to crops. From Cao et al. 2026.",

  livestock:
    "Emissions from livestock (including monogastrics and ruminants). This " +
    "includes CH₄ and N₂O. Data for 2020 is applied to all years. This does " +
    "not include land-use change due to livestock or their feed. From Bilotto " +
    "et al. in prep.",
};

/** The description for a tree node, or null when the class has none. */
export function fluxNodeDescription(nodeId: string): string | null {
  return FLUX_NODE_DESCRIPTIONS[nodeId] ?? null;
}
