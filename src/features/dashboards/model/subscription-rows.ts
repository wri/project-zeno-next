import { placeMeta } from "@/src/entities/aoi";

import type { Dashboard } from "../api/schemas";

/** One dashboard on the subscriptions page. */
export interface SubscriptionRow {
  id: string;
  name: string;
  /** The area's kind, e.g. "State or province · BRA". */
  area: string;
  emailOn: boolean;
  /** Whether email can be turned on: the dashboard has an integrated alerts widget. */
  eligible: boolean;
}

/**
 * The page's rows: the dashboards whose subscription state the backend sent,
 * which it does for their owner only. Email on a dashboard that is not
 * eligible is never stored, so such a row is always off.
 */
export function toSubscriptionRows(dashboards: Dashboard[]): SubscriptionRow[] {
  return dashboards.flatMap((dashboard) => {
    if (!dashboard.subscriptions) return [];
    const aoi = dashboard.aois[0];
    const eligible = dashboard.eligible_for_subscription;
    return {
      id: dashboard.id,
      name: dashboard.name,
      area: aoi ? placeMeta(aoi) : "",
      emailOn: eligible && dashboard.subscriptions.emailEnabled,
      eligible,
    };
  });
}

export const hasEmailOn = (rows: SubscriptionRow[]): boolean =>
  rows.some((row) => row.emailOn);
