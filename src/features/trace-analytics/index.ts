/**
 * Public API of the `trace-analytics` feature (FSD slice).
 *
 * Other slices import ONLY from this barrel — never reach into segment files
 * directly. Keeps the slice's internals free to move.
 */
export { TraceAnalyticsScreen } from "./ui/TraceAnalyticsScreen";
export { TRACE_ANALYTICS_PATH } from "./ui/links";
