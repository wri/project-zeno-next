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
  data_to: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  new_week: WireDateRangeSchema,
  total_area_ha: z.number(),
  // Newest first, per the contract.
  rows: z.array(AlertsListRowSchema),
});

export type AlertsListWire = z.infer<typeof AlertsListResponseSchema>;

export function toAlertsList(wire: AlertsListWire): AlertsList {
  return {
    dataTo: wire.data_to,
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
 * A failed list fetch, with the copy the widget shows and whether a Retry
 * button makes sense. A 422 (an area or a window the backend refuses) and a
 * 502 (a failed analytics job) both carry a user-facing sentence in
 * `detail`; only the 502 is worth a retry. A 401 is a sign-in prompt.
 * Anything else — a network failure, a body the schema rejects — is generic
 * and retryable.
 */
export class AlertsListError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "AlertsListError";
  }
}

const GENERIC_MESSAGE = "Couldn't load the alerts.";

export function toAlertsListError(error: unknown): AlertsListError {
  if (error instanceof AlertsListError) return error;
  const status = httpStatus(error);
  if (status === 401) {
    return new AlertsListError("Sign in to see the alerts list.", false);
  }
  const sentence =
    status === 422 || status === 502 ? httpDetail(error) : undefined;
  return new AlertsListError(sentence ?? GENERIC_MESSAGE, status !== 422);
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
