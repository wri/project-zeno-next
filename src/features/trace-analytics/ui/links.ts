/**
 * Href builders for cross-view navigation inside the trace-analytics screen.
 * All three views live on one route behind a `?tab=` param, so deep links
 * (session/trace/prompt/user) are query params carried alongside the tab.
 */

export const TRACE_ANALYTICS_PATH = "/trace-analytics";

export const TRACE_ANALYTICS_TABS = [
  "analytics",
  "traces",
  "conversations",
] as const;

export type TraceAnalyticsTab = (typeof TRACE_ANALYTICS_TABS)[number];

export function isTraceAnalyticsTab(
  value: string | null
): value is TraceAnalyticsTab {
  return (TRACE_ANALYTICS_TABS as readonly string[]).includes(value ?? "");
}

/** Build `/trace-analytics?tab=…` with optional extra params (empty skipped). */
export function tabHref(
  tab: TraceAnalyticsTab,
  params: Readonly<Record<string, string | undefined>> = {}
): string {
  const search = new URLSearchParams({ tab });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${TRACE_ANALYTICS_PATH}?${search.toString()}`;
}
