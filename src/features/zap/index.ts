/**
 * Public API of the `zap` feature: one prompt to a plan, decided by the jev
 * model in `POST /api/zap` and run here without the agent. On the map, the
 * plan changes the dataset, the area and the charts. On a dashboard that the
 * user owns, the plan adds charts, maps, template sections and imagery.
 */
export { ZapPanel } from "./ui/ZapPanel";
export { ZapRunner } from "./ui/ZapRunner";
export { submitZap, useZapBusy } from "./ui/submit-zap";
export { useZapMode, ZAP_FEATURE_FLAG } from "./ui/use-zap-mode";
export { default as useZapStore, type ZapMode } from "./model/zap-store";
