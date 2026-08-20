/**
 * Public API of the `ghg-flux-tree` feature (FSD slice).
 *
 * The curated "Net GHG flux (annual average)" insight (LGMS, dataset 12): the
 * flux hierarchy and its dummy data for the still-WIP backend endpoint.
 * Consumers import ONLY from this barrel.
 */
export {
  LGMS_DATASET_ID,
  GHG_FLUX_TREE_DUMMY_RESULT,
  GHG_FLUX_TREE_DUMMY_WIDGET,
} from "./model/dummy-data";
export {
  isFluxTreeWidget,
  nodeNet,
  parseFluxNodes,
  singleSidedLabel,
  visibleRows,
  type FluxMeasure,
  type FluxNode,
  type FluxRow,
} from "./model/hierarchy";
export { treeViewKey } from "./model/tree-view-store";
