import { API_CONFIG } from "@/app/config/api";

import { toAlertsFreshness, type AlertsFreshness } from "../lib/alerts-summary";
import { IntegratedAlertsLatestResponseSchema } from "./schemas";

/**
 * How current the integrated alerts data is. A plain `fetch`, not `apiFetch`:
 * the user's token is for the GNW backend only, and this endpoint needs none.
 * No `x-environment` header either: both dates come from the release marker
 * and its admin results, which staging and production share.
 */
export async function fetchIntegratedAlertsFreshness(): Promise<AlertsFreshness> {
  const res = await fetch(
    `${API_CONFIG.ANALYTICS_API_HOST}/v0/land_change/integrated_alerts/latest`
  );
  if (!res.ok) {
    throw new Error(`Integrated alerts latest request failed: ${res.status}`);
  }
  return toAlertsFreshness(
    IntegratedAlertsLatestResponseSchema.parse(await res.json())
  );
}
