/**
 * Public API of the `insight` entity (FSD slice).
 *
 * The shared business noun produced by analyses and listed by the history
 * browse feature. Consumers import ONLY from this barrel.
 */
export type { Chart } from "./model/chart";
export type {
  InsightRecord,
  InsightVerification,
} from "./model/insight-record";
export { chartsToWidgets } from "./lib/charts-to-widgets";
export { chartDatasetName } from "./lib/chart-dataset-name";
export { generateInsightTitle } from "./lib/insight-title";
export type { InsightTitleInput } from "./lib/insight-title";
export { resolveInsightTitle } from "./lib/resolve-insight-title";
