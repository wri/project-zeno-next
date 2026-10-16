import { z } from "zod";

import type { AlertsAoi, AlertsList, DateRange } from "../lib/alertsWidgets";
import { readJson } from "./http";

/**
 * `POST /api/alerts/list` (project-zeno, PZB-1468): the live rows behind the
 * dashboard alerts widget. Unlike `/api/analyze` it persists nothing, so a
 * fetch can be repeated, cancelled or retried freely.
 *
 * The wire shapes below mirror the backend exactly; `toAlertsList` is the one
 * place they become the normalised `AlertsList` the widget reads, and
 * `AlertsListError` is the one place a status code becomes user-facing copy.
 */

export const AlertsListRequestSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  subtype: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});

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
  // Newest first per the contract; `toAlertsList` sorts anyway so paging is
  // deterministic should that ever change.
  rows: z.array(AlertsListRowSchema).default([]),
});

export type AlertsListWire = z.infer<typeof AlertsListResponseSchema>;

export function toAlertsList(wire: AlertsListWire): AlertsList {
  return {
    dataTo: wire.data_to,
    window: { start: wire.start_date, end: wire.end_date },
    newWeek: { start: wire.new_week.start_date, end: wire.new_week.end_date },
    totalHa: wire.total_area_ha,
    rows: [...wire.rows]
      .sort((a, b) => (a.alert_date < b.alert_date ? 1 : -1))
      .map((row) => ({
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
 * `detail`, which `readJson` already made the message; only the 502 is
 * worth a retry, and a 401 is a sign-in prompt.
 */
export class AlertsListError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = "AlertsListError";
  }
}

const GENERIC_MESSAGE = "Couldn't load the alerts.";

export function toAlertsListError(error: unknown): AlertsListError {
  if (error instanceof AlertsListError) return error;
  const status = (error as { status?: unknown } | null)?.status;
  const code = typeof status === "number" ? status : undefined;
  if (code === 401) {
    return new AlertsListError("Sign in to see the alerts list.", false, 401);
  }
  const detail = (error as { detail?: unknown } | null)?.detail;
  const sentence =
    typeof detail === "string" && detail.trim() ? detail : undefined;
  const explained = code === 422 || code === 502;
  return new AlertsListError(
    explained && sentence ? sentence : GENERIC_MESSAGE,
    code !== 422,
    code
  );
}

export async function fetchAlertsList(
  aoi: AlertsAoi,
  range: DateRange
): Promise<AlertsList> {
  const body = AlertsListRequestSchema.parse({
    source: aoi.source,
    src_id: aoi.srcId,
    subtype: aoi.subtype,
    start_date: range.start,
    end_date: range.end,
  });
  let data: unknown;
  try {
    data = await readJson<unknown>("/api/alerts/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw toAlertsListError(error);
  }
  return toAlertsList(AlertsListResponseSchema.parse(data));
}
