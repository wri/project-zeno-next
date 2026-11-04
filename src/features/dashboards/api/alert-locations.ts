import { z } from "zod";

import { API_CONFIG } from "@/app/config/api";
import type { DateRange } from "@/src/shared/lib/iso-date";
import {
  TIERS,
  type AlertLocationsFormat,
  type AlertsConfidence,
  type AlertsLandFilter,
} from "../lib/alertsWidgets";

/**
 * The alert locations download (project-zeno-data-infra #323, PZB-1603): one
 * row per alert pixel in a GADM area, as CSV or a zipped shapefile. It runs as
 * a job, like the analytics endpoints. The POST answers 202 with a link. The
 * link reports `pending` until the file is written, then a presigned S3 URL
 * that lasts an hour.
 *
 * A plain `fetch`, as for `/latest`: the user's token is for the GNW backend
 * only, and this endpoint needs none.
 */
const EXPORT_PATH = "/v0/land_change/integrated_alerts/points/exports";

/** The wait before each poll. The link asks for 1 second (`Retry-After`). */
const POLL_INTERVAL_MS = 2000;

/** How long the file may take before the widget stops waiting. */
const EXPORT_DEADLINE_MS = 5 * 60 * 1000;

/**
 * Server errors in a row before a poll gives up. A poll that comes before
 * the job has set its status gets a 500 (noted in data-infra #323).
 */
const MAX_SERVER_ERRORS = 3;

/** One download: the area and the view on show, in one format. */
export interface AlertLocationsRequest {
  /** `AlertsWidgetSpec.gadmId`. */
  gadmId: string;
  range: DateRange;
  confidence: AlertsConfidence;
  landFilter: AlertsLandFilter;
  format: AlertLocationsFormat;
}

/** A written file, ready to save. */
export interface AlertLocationsFile {
  /** The presigned S3 URL. Its `Content-Disposition` names the file. */
  url: string;
  pointCount: number;
  /** The period had more alerts than the file holds. The file keeps the newest. */
  truncated: boolean;
}

const ExportLinkSchema = z.object({ data: z.object({ link: z.string() }) });

const ExportJobSchema = z.object({
  data: z.discriminatedUnion("status", [
    z.object({ status: z.literal("pending") }),
    z.object({ status: z.literal("failed"), message: z.string().nullable() }),
    z.object({
      status: z.literal("saved"),
      result: z.object({ download_url: z.string(), point_count: z.number() }),
      // Per AOI id. A request names one area.
      metadata: z.object({ truncated: z.record(z.string(), z.boolean()) }),
    }),
  ]),
});

export class AlertLocationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlertLocationsError";
  }
}

/**
 * Asks for the file, waits until it is written and returns its URL. Throws
 * `AlertLocationsError` when the job fails, a response is malformed or the
 * deadline passes, and the abort reason when `signal` aborts.
 */
export async function prepareAlertLocations(
  request: AlertLocationsRequest,
  signal: AbortSignal
): Promise<AlertLocationsFile> {
  const res = await fetch(`${API_CONFIG.ANALYTICS_API_HOST}${EXPORT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportBody(request)),
    signal,
  });
  if (!res.ok) {
    throw new AlertLocationsError(`Export request failed: ${res.status}`);
  }
  const { link } = parseOrThrow(ExportLinkSchema, await res.json()).data;

  const deadline = Date.now() + EXPORT_DEADLINE_MS;
  let serverErrors = 0;
  while (Date.now() < deadline) {
    await wait(POLL_INTERVAL_MS, signal);
    const poll = await fetch(link, { signal });
    if (poll.status >= 500 && ++serverErrors < MAX_SERVER_ERRORS) continue;
    if (!poll.ok) {
      throw new AlertLocationsError(`Export poll failed: ${poll.status}`);
    }
    serverErrors = 0;
    const job = parseOrThrow(ExportJobSchema, await poll.json()).data;
    if (job.status === "saved") {
      return {
        url: job.result.download_url,
        pointCount: job.result.point_count,
        truncated: Object.values(job.metadata.truncated).some(Boolean),
      };
    }
    if (job.status === "failed") {
      throw new AlertLocationsError(job.message ?? "Export failed");
    }
  }
  throw new AlertLocationsError("Export timed out");
}

/** The request body: the view's filters in the analytics API's names. */
function exportBody(request: AlertLocationsRequest) {
  return {
    aoi: {
      type: "admin",
      ids: [request.gadmId],
      provider: "gadm",
      version: "4.1",
    },
    start_date: request.range.start,
    end_date: request.range.end,
    alert_confidence: TIERS[request.confidence].levels,
    // The wire has no key for "any", so it is left out.
    ...(request.landFilter === "any"
      ? {}
      : { land_filter: request.landFilter }),
    format: request.format,
  };
}

function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AlertLocationsError(`Malformed export response: ${parsed.error}`);
  }
  return parsed.data;
}

/** Resolves after `ms`, or rejects with the abort reason when `signal` aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
