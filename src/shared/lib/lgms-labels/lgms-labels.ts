/**
 * Product names for LGMS classes where they differ from the backend's own
 * labels (project-zeno's `LGMS_CLASS_LABELS` in `src/api/services/charts/lgms.py`),
 * keyed by the raw class id the backend uses in `chart_data` — as a node `id`
 * in the annual-average tree, and as the `{class}_emissions|removals` field
 * prefix in the time series.
 *
 * Both LGMS charts consult this table, so a renamed class reads the same in
 * the tree's rows and in the time series' legend and tooltip. A class not
 * listed here keeps whatever label the caller already has.
 */
export const LGMS_CLASS_RENAMES: Readonly<Record<string, string>> = {
  // The backend names the transition ("non-trees remaining non-trees"); the
  // product names the land cover.
  non_trees_remaining_non_trees: "Non-tree vegetation",
  // The backend labels the tree node "Crop management"; the time series'
  // legend, the DETAIL info and the class descriptions all say "cropland
  // management", so the tree says it too.
  cropland: "Cropland management",
};

/**
 * The display label for an LGMS class: the product's rename if there is one,
 * otherwise `fallback` (typically the backend's own label).
 */
export function lgmsClassLabel(classId: string, fallback: string): string {
  return LGMS_CLASS_RENAMES[classId] ?? fallback;
}
