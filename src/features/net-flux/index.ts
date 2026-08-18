/**
 * Public API of the `net-flux` feature (FSD slice).
 *
 * The curated "Net flux over time" insight (LGMS, dataset 12): dummy data for
 * the still-WIP backend endpoint, the DETAIL/MEASURE variant derivation, and
 * the bespoke card chrome the design specifies for it. Consumers import ONLY
 * from this barrel.
 */
export {
  LGMS_DATASET_ID,
  NET_FLUX_DUMMY_RESULT,
  NET_FLUX_DUMMY_WIDGET,
} from "./model/dummy-data";
export {
  deriveNetFluxVariant,
  isNetFluxWidget,
  DETAIL_LABEL,
  NET_FLUX_LINE_FIELD,
  type NetFluxDetail,
  type NetFluxMeasure,
  type NetFluxVariant,
} from "./model/net-flux-variants";
export { netFluxViewKey } from "./model/net-flux-view-store";
export { useNetFluxView } from "./ui/use-net-flux-view";
export { NetFluxToolbar } from "./ui/NetFluxToolbar";
export { NetFluxChartBody } from "./ui/NetFluxChartBody";
export { NetFluxFootnote } from "./ui/NetFluxFootnote";
