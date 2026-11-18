import { useQuery } from "@tanstack/react-query";

import { fetchIntegratedAlertsFreshness } from "../api/analytics";
import { dashboardKeys } from "./dashboardKeys";

// A new release lands at most daily, and the analytics API holds its version
// marker for an hour, so re-checking more often would only repeat the answer.
const STALE_TIME_MS = 60 * 60 * 1000;

/**
 * The integrated alerts' newest detection and release dates. Not gated on the
 * dashboards list: the request needs no ids and no token, so it runs
 * alongside the list rather than after it.
 */
export function useIntegratedAlertsFreshness() {
  return useQuery({
    queryKey: dashboardKeys.alertsFreshness,
    queryFn: fetchIntegratedAlertsFreshness,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    // The likely failures (a format change, a 4xx) repeat identically, and
    // the line simply stays hidden, so a retry burst buys nothing.
    retry: false,
  });
}
