import { format, isValid, parseISO } from "date-fns";

import type {
  DashboardAlertsSummaryResponse,
  IntegratedAlertsLatestResponse,
} from "../api/schemas";
import {
  NRT_MONITORING,
  templateStatus,
  type TemplateStatus,
} from "./analysis-templates";

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
 * The tooltip beside every line that dates the alerts data. Users read an
 * alert date a week old as data that stopped updating, so it says how often
 * new data arrives.
 */
export const ALERTS_DATA_TOOLTIP =
  "Alerts are dated by when they were detected. Global Nature Watch gets new alerts data about once a week, so the newest alerts can be a week or more old.";

/**
 * Month first ("Nov 15") on the dashboards list and banner, day first
 * ("15 Nov") in the alerts widget, matching the dates already on each.
 */
export type DateOrder = "month-first" | "day-first";

const DAY_FORMATS: Record<DateOrder, { day: string; dayYear: string }> = {
  "month-first": { day: "MMM d", dayYear: "MMM d, yyyy" },
  "day-first": { day: "d MMM", dayYear: "d MMM yyyy" },
};

/**
 * "Data updated Nov 15 · alerts to Nov 13, 2026": the release first, then
 * the newest alert date the periods count back from. The year comes once,
 * at the end, and on both dates when they differ in it. Either date alone
 * ("Alerts to Nov 13, 2026") when the other is unknown; undefined for none.
 */
export function formatFreshness(
  {
    latestAlertDate,
    updatedOn,
  }: { latestAlertDate?: string; updatedOn?: string },
  order: DateOrder = "month-first"
): string | undefined {
  const { dayYear } = DAY_FORMATS[order];
  const alertsTo = latestAlertDate ? parseISO(latestAlertDate) : undefined;
  if (updatedOn && alertsTo) {
    return `${formatDataUpdated(updatedOn, latestAlertDate, order)} · alerts to ${format(alertsTo, dayYear)}`;
  }
  if (updatedOn) return formatDataUpdated(updatedOn, undefined, order);
  if (alertsTo) return `Alerts to ${format(alertsTo, dayYear)}`;
  return undefined;
}

/**
 * "Data updated Nov 15": the one owner of the phrase. Without a year when
 * `against` (the date it follows: the period's end, or the newest alert
 * date) falls in the same year, with it otherwise or when there is nothing
 * to compare to.
 */
export function formatDataUpdated(
  updatedOn: string,
  against?: string,
  order: DateOrder = "month-first"
): string {
  const { day, dayYear } = DAY_FORMATS[order];
  const updated = parseISO(updatedOn);
  const sameYear =
    against !== undefined &&
    updated.getFullYear() === parseISO(against).getFullYear();
  return `Data updated ${format(updated, sameYear ? day : dayYear)}`;
}

/**
 * The control at the end of the alerts banner: a link to the dashboard's
 * alerts list, else, for an owner, a button that adds the Near real-time
 * monitoring section (alerts chart, list and imagery), else nothing.
 */
export type AlertsStripAction =
  | { kind: "view"; widgetId: string }
  | { kind: "add"; state: TemplateStatus }
  | { kind: "none" };

export function alertsStripAction({
  alertsWidgetId,
  canAdd,
  templateNames,
  pendingTemplates,
}: {
  /** The first alerts widget on screen (`firstAlertsWidgetId`). */
  alertsWidgetId: string | undefined;
  /** The viewer owns the dashboard, and it has an area for a template to use. */
  canAdd: boolean;
  /**
   * The backend's template registry; undefined while it loads or when it
   * failed, and then nothing is offered: a button that fails is worse than
   * none.
   */
  templateNames: readonly string[] | undefined;
  /** The templates being applied to this dashboard right now. */
  pendingTemplates: readonly string[];
}): AlertsStripAction {
  if (alertsWidgetId) return { kind: "view", widgetId: alertsWidgetId };
  if (!canAdd || !templateNames?.includes(NRT_MONITORING)) {
    return { kind: "none" };
  }
  return {
    kind: "add",
    state: templateStatus(NRT_MONITORING, pendingTemplates),
  };
}
