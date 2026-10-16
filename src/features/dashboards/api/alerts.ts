import { z } from "zod";

import type {
  AlertsAoi,
  AlertsLandFilter,
  AlertsList,
  DateRange,
} from "../lib/alertsWidgets";
import { httpDetail, httpStatus, readJson } from "./http";

/**
 * `POST /api/alerts/list` (project-zeno, PZB-1468): the live rows behind the
 * dashboard alerts widget. Unlike `/api/analyze` it persists nothing, so a
 * fetch can be repeated, cancelled or retried freely.
 *
 * The wire shape below mirrors the backend exactly; `toAlertsList` is the one
 * place it becomes the normalised `AlertsList` the widget reads, and
 * `AlertsListError` the one place any failure — a status code, a network
 * error, a malformed body — becomes user-facing copy.
 */

const WireDateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

export const AlertsListRowSchema = z.object({
  alert_date: z.string(),
  high_ha: z.number(),
  highest_ha: z.number(),
  total_ha: z.number(),
  new: z.boolean(),
});

export const AlertsListResponseSchema = z.object({
  // The latest alert day the analytics API returned for the window, across
  // every tier; null when the window returned no rows.
  data_to: z.string().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  new_week: WireDateRangeSchema,
  total_area_ha: z.number(),
  // Newest first, per the contract.
  rows: z.array(AlertsListRowSchema),
});

export type AlertsListWire = z.infer<typeof AlertsListResponseSchema>;

export function toAlertsList(wire: AlertsListWire): AlertsList {
  const latest = wire.data_to ?? undefined;
  return {
    latest,
    // Without alerts there is no latest day to count back from, so the chips
    // count back from the window's end instead.
    anchor: latest ?? wire.end_date,
    window: { start: wire.start_date, end: wire.end_date },
    newWeek: { start: wire.new_week.start_date, end: wire.new_week.end_date },
    rows: wire.rows.map((row) => ({
      date: row.alert_date,
      highHa: row.high_ha,
      highestHa: row.highest_ha,
      totalHa: row.total_ha,
      isNew: row.new,
    })),
  };
}

/**
 * Why a list fetch failed, for the widget to word: `unauthenticated` (401),
 * `rejected` (422: an area or a window the backend refuses, final),
 * `unavailable` (502: a failed analytics job, worth a retry) or `unknown`
 * (a network failure, a body the schema rejects — retryable). A 422 and a
 * 502 carry the backend's own user-facing sentence as `detail`.
 */
export type AlertsListErrorKind =
  | "unauthenticated"
  | "rejected"
  | "unavailable"
  | "unknown";

export class AlertsListError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly kind: AlertsListErrorKind,
    readonly detail?: string
  ) {
    super(detail ?? kind);
    this.name = "AlertsListError";
    this.retryable = kind === "unavailable" || kind === "unknown";
  }
}

export function toAlertsListError(error: unknown): AlertsListError {
  if (error instanceof AlertsListError) return error;
  switch (httpStatus(error)) {
    case 401:
      return new AlertsListError("unauthenticated");
    case 422:
      return new AlertsListError("rejected", httpDetail(error));
    case 502:
      return new AlertsListError("unavailable", httpDetail(error));
    default:
      return new AlertsListError("unknown");
  }
}

/**
 * `landFilter` restricts the rows to alerts on that land class (the
 * Intersects dropdown); the key is left out of the body for "Any".
 */
export async function fetchAlertsList(
  aoi: AlertsAoi,
  range: DateRange,
  landFilter?: AlertsLandFilter
): Promise<AlertsList> {
  try {
    const data = await readJson<unknown>("/api/alerts/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: aoi.source,
        src_id: aoi.srcId,
        subtype: aoi.subtype,
        start_date: range.start,
        end_date: range.end,
        ...(landFilter ? { land_filter: landFilter } : {}),
      }),
    });
    return toAlertsList(AlertsListResponseSchema.parse(data));
  } catch (error) {
    throw toAlertsListError(error);
  }
}
