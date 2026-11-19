import { z } from "zod";

import { API_CONFIG } from "@/app/config/api";
import type { DateRange } from "@/src/shared/lib/iso-date";
import { wait } from "@/src/shared/lib/wait";
import {
  TIERS,
  type AlertLocationsFormat,
  type AlertsConfidence,
  type AlertsLandFilter,
  type PointsArea,
} from "../lib/alertsWidgets";
import { landFilterBody } from "./alerts";

/**
 * The alert locations download (project-zeno-data-infra #323, PZB-1603): one
 * row per alert pixel in a GADM area or saved custom area, as CSV or a zipped
 * shapefile. It runs as a job, like the analytics endpoints. The POST answers
 * 202 with a link. The link reports `pending` until the file is written, then
 * a presigned S3 URL that lasts an hour.
 *
 * A plain `fetch`, as for `/latest`: the user's token is for the GNW backend
 * only, and this endpoint needs none.
 */
const EXPORT_PATH = "/v0/land_change/integrated_alerts/points/exports";
const EXPORT_URL = `${API_CONFIG.ANALYTICS_API_HOST}${EXPORT_PATH}`;

/** A job link's path. Its one segment after the export path is the job id. */
const JOB_PATH = new RegExp(`^${EXPORT_PATH}/([^/]+)$`);

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
  /** `AlertsWidgetSpec.pointsArea`. */
  area: PointsArea;
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

/** The created job, as the URL to poll it at. */
const ExportLinkSchema = z.object({
  data: z.object({ link: z.string().transform(exportJobUrl) }),
});

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

/**
 * Asks for the file, waits until it is written and returns its URL. Throws
 * when the job fails, a response is malformed or the deadline passes, and an
 * `AbortError` when `signal` aborts.
 */
export async function prepareAlertLocations(
  request: AlertLocationsRequest,
  signal: AbortSignal
): Promise<AlertLocationsFile> {
  const res = await fetch(EXPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportBody(request)),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Export request failed: ${res.status}`);
  }
  const { link: jobUrl } = ExportLinkSchema.parse(await res.json()).data;

  const deadline = Date.now() + EXPORT_DEADLINE_MS;
  let serverErrors = 0;
  while (Date.now() < deadline) {
    await wait(POLL_INTERVAL_MS, signal);
    const poll = await fetch(jobUrl, { signal });
    if (poll.status >= 500 && ++serverErrors < MAX_SERVER_ERRORS) continue;
    if (!poll.ok) {
      throw new Error(`Export poll failed: ${poll.status}`);
    }
    serverErrors = 0;
    const job = ExportJobSchema.parse(await poll.json()).data;
    if (job.status === "saved") {
      return {
        url: job.result.download_url,
        pointCount: job.result.point_count,
        truncated: Object.values(job.metadata.truncated).some(Boolean),
      };
    }
    if (job.status === "failed") {
      throw new Error(job.message ?? "Export failed");
    }
  }
  throw new Error("Export timed out");
}

/**
 * The link's job on our own analytics host. The API builds its links behind
 * its load balancer, so they come as `http://`, and an https page may not
 * fetch them (mixed content).
 */
function exportJobUrl(link: string): string {
  const jobId = JOB_PATH.exec(new URL(link).pathname)?.[1];
  if (!jobId) throw new Error(`Unexpected export link: ${link}`);
  return `${EXPORT_URL}/${jobId}`;
}

/** The request body: the view's filters in the analytics API's names. */
function exportBody(request: AlertLocationsRequest) {
  return {
    aoi: aoiBody(request.area),
    start_date: request.range.start,
    end_date: request.range.end,
    alert_confidence: TIERS[request.confidence].levels,
    ...landFilterBody(request.landFilter),
    format: request.format,
  };
}

/** The area in the analytics API's AOI names. */
function aoiBody(area: PointsArea) {
  if (area.kind === "custom")
    return { type: "custom_aoi", ids: [area.customAreaId] };
  return {
    type: "admin",
    ids: [area.gadmId],
    provider: "gadm",
    version: "4.1",
  };
}
