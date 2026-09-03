/**
 * Public API of the `ghg-flux-tree` feature (FSD slice).
 *
 * The curated "Net GHG flux (annual average)" insight — the `hierarchical-bar`
 * chart that project-zeno's `LGMSChartGenerator` returns at position 3 of an
 * LGMS analysis — plus the MEASURE control the design places outside the widget
 * card. Consumers import ONLY from this barrel.
 */
export { isFluxTreeWidget } from "./model/hierarchy";
export { treeViewKey } from "./model/tree-view-store";
export { FLUX_TREE_CARD_WIDTH } from "./ui/tree-chart-constants";
export { GhgFluxTreeBody } from "./ui/GhgFluxTreeBody";
export { GhgFluxMeasurePill } from "./ui/GhgFluxMeasurePill";
