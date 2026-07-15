/**
 * Public API of the `insights-history` feature (FSD slice).
 *
 * The browse-past-analyses use-case. Consumers import ONLY from this barrel.
 */
export { useUserInsights, type UseUserInsights } from "./ui/use-user-insights";
export { verifiedInsights } from "./lib/verified-fixtures";
export { InsightsPanel } from "./ui/insights-panel";
