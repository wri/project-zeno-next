import { format, isValid, parseISO } from "date-fns";

import type {
  DashboardAlertsSummaryResponse,
  IntegratedAlertsLatestResponse,
} from "../api/schemas";

/**
 * The alerts summary as the dashboards pages consume it, settled once from
 * the wire by `toAlertsSummary`: which dashboards had alerts, how much, for
 * which period. A dashboard the backend did not assess, could not fetch
 * (`integrated_alerts: null`) or found quiet is simply absent from
 * `newAlertAreaHa`; nothing downstream tells those apart.
 */
export interface AlertsSummary {
  /** Inclusive ISO dates of the period the summary covers. */
  startDate: string;
  endDate: string;
  /**
   * Dashboards whose alert total the backend obtained, quiet periods (0 ha)
   * included. A `null` total is not an assessment, so a response of only
   * failures counts none.
   */
  assessedCount: number;
  /** Alert area in hectares by dashboard id, for the dashboards whose period carried alerts. */
  newAlertAreaHa: Record<string, number>;
}

/** The one place the alerts-summary wire payload is interpreted. */
export function toAlertsSummary(
  wire: DashboardAlertsSummaryResponse
): AlertsSummary {
  const newAlertAreaHa: Record<string, number> = {};
  let assessedCount = 0;
  for (const [id, row] of Object.entries(wire.dashboards)) {
    if (row.integrated_alerts === null) continue;
    assessedCount += 1;
    if (row.integrated_alerts > 0) {
      newAlertAreaHa[id] = row.integrated_alerts;
    }
  }
  return {
    startDate: wire.start_date,
    endDate: wire.end_date,
    assessedCount,
    newAlertAreaHa,
  };
}

/**
 * "New" is the backend's rule: alert dates inside the summary's period, not
 * the date the alerts reached GNW.
 */
export function hasNewAlerts(
  summary: AlertsSummary,
  dashboardId: string
): boolean {
  return dashboardId in summary.newAlertAreaHa;
}

/**
 * How many of `dashboardIds` had alerts. Counted by id rather than from the
 * summary's keys, so a summary held over from a previous id set (a dashboard
 * just deleted or created) still counts the ids on the page.
 */
export function countWithNewAlerts(
  summary: AlertsSummary,
  dashboardIds: string[]
): number {
  return dashboardIds.filter((id) => hasNewAlerts(summary, id)).length;
}

/**
 * The period as the design writes it: "Oct 5–11" within one month, "Oct 26 –
 * Nov 1" across months, and with years when the period straddles a year end.
 */
export function formatPeriodRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  }
  return `${format(start, "MMM d")}–${format(end, "d")}`;
}

const WHOLE_HA = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const TENTHS_HA = new Intl.NumberFormat("en", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * "1,458 ha" for areas of ten hectares and up; smaller weeks keep a decimal
 * ("0.5 ha") so a dashboard flagged for new alerts never reads as 0 ha.
 */
export function formatAlertArea(areaHa: number): string {
  if (areaHa < 0.05) return "<0.1 ha";
  if (areaHa < 10) return `${TENTHS_HA.format(areaHa)} ha`;
  return `${WHOLE_HA.format(areaHa)} ha`;
}

/**
 * How current the integrated alerts data is, settled once from the analytics
 * API by `toAlertsFreshness`. Alerts are dated by detection and reach a
 * release a few days later, so the release is always the later date.
 */
export interface AlertsFreshness {
  /** ISO date of the newest alert detection in the data. */
  latestAlertDate: string;
  /** ISO date of the release the analytics API serves. */
  updatedOn: string;
}

/**
 * The one place the analytics API's latest response is interpreted. The
 * release date is read from its version ("v20261018" is 2026-10-18). Any
 * other version throws, so a scheme change cannot print a wrong date.
 */
export function toAlertsFreshness(
  wire: IntegratedAlertsLatestResponse
): AlertsFreshness {
  const { alert_date, version } = wire.data;
  const release = /^v(\d{4})(\d{2})(\d{2})$/.exec(version);
  const updatedOn = release && `${release[1]}-${release[2]}-${release[3]}`;
  if (!updatedOn || !isValid(parseISO(updatedOn))) {
    throw new Error(`Unexpected integrated alerts version: ${version}`);
  }
  return { latestAlertDate: alert_date, updatedOn };
}

/**
 * True when no alert in the data was detected on or after the period's first
 * day, so a count of zero would be a false all clear rather than a quiet period.
 */
export function awaitingPeriodData(
  periodStart: string,
  freshness: AlertsFreshness
): boolean {
  return freshness.latestAlertDate < periodStart;
}

/**
 * "Latest alert detected Oct 16, 2026 · updated Oct 18", with the release's
 * year only when it differs from the detection's.
 */
export function formatFreshness({
  latestAlertDate,
  updatedOn,
}: AlertsFreshness): string {
  const detected = parseISO(latestAlertDate);
  const updated = parseISO(updatedOn);
  const updatedFormat =
    detected.getFullYear() === updated.getFullYear() ? "MMM d" : "MMM d, yyyy";
  return `Latest alert detected ${format(detected, "MMM d, yyyy")} · updated ${format(updated, updatedFormat)}`;
}

/**
 * The strip's "2 charts can be updated." lead-in. With no countable chart
 * (older rows without `dataset_id`) the sentence drops the number rather
 * than claiming zero on a dashboard the backend did flag.
 */
export function updatableChartsLabel(count: number): string {
  if (count === 0) return "Charts can be updated.";
  return `${count} ${count === 1 ? "chart" : "charts"} can be updated.`;
}
