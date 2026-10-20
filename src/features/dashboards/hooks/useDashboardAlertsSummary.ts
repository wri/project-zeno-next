import {
  keepPreviousData,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";

import { fetchDashboardAlertsSummary } from "../api/dashboards";
import { dashboardKeys } from "./dashboardKeys";

// The alert week only turns over on a Sunday, but a dashboard's first summary
// of the day can still be waiting on an analytics job, so re-check hourly
// rather than once per session; the entry stays cached that long too, so a
// detour through the map does not cost a new request on return.
const STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Integrated alerts over the latest full alert week for the given dashboards.
 * Disabled for an empty list (the backend rejects one). While a create or
 * delete changes the id set the previous summary is held, so badges do not
 * blink out and back; lookups are by id, so the held copy stays right.
 */
export function useDashboardAlertsSummary(dashboardIds: string[]) {
  const ids = [...dashboardIds].sort();

  return useQuery({
    queryKey: dashboardKeys.alertsSummary(ids),
    queryFn: () => fetchDashboardAlertsSummary(ids),
    enabled: ids.length > 0,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    // Analytics-backed on the backend, so a failure is not re-run three
    // times with all the ids, as the curated analyses also decided.
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * The summary reports only dashboards with an integrated alerts chart, so a
 * write that can add or remove a chart (a widget added or deleted, a section
 * deleted with its widgets, a template applied, an agent write) can move a
 * dashboard into or out of it. Every cached summary goes stale, since the
 * list's id set and each detail strip's single id are separate entries; only
 * the mounted ones refetch straight away.
 */
export function invalidateAlertsSummaries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: dashboardKeys.alertsSummaries,
  });
}
