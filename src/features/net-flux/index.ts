/**
 * Public API of the `net-flux` feature (FSD slice).
 *
 * The curated LGMS time-series insights — the three `stacked-bar-with-line`
 * charts project-zeno's `LGMSChartGenerator` returns at positions 0-2 of an
 * LGMS analysis — plus the MEASURE control the design places outside the
 * widget card. Consumers import ONLY from this barrel.
 */
export {
  deriveNetFluxVariant,
  isNetFluxWidget,
  NET_FLUX_LINE_FIELD,
  seriesGroup,
  seriesLabel,
  type NetFluxMeasure,
  type NetFluxVariant,
} from "./model/net-flux-variants";
export {
  collapseNetFluxSiblings,
  netFluxDetailLabel,
  netFluxWidgetDetailLabel,
  netFluxWidgetDetailPillLabel,
  netFluxGroupKey,
  netFluxSiblings,
} from "./model/net-flux-siblings";
export { netFluxViewKey } from "./model/net-flux-view-store";
export {
  useNetFluxDetail,
  useNetFluxDetailSelection,
  useNetFluxView,
} from "./ui/use-net-flux-view";
export { NetFluxToolbar } from "./ui/NetFluxToolbar";
export { NetFluxChartBody } from "./ui/NetFluxChartBody";
export { NetFluxFootnote } from "./ui/NetFluxFootnote";
