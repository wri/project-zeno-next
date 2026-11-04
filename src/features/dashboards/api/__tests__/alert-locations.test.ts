import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { API_CONFIG } from "@/app/config/api";
import {
  prepareAlertLocations,
  type AlertLocationsRequest,
} from "../alert-locations";

const EXPORT_URL = `${API_CONFIG.ANALYTICS_API_HOST}/v0/land_change/integrated_alerts/points/exports`;
const LINK = `${EXPORT_URL}/5b1e0000-0000-5000-8000-000000000000`;
const FILE_URL =
  "https://results.s3.amazonaws.com/integrated_alerts_points_export/v20261101/x.csv?X-Amz-Signature=abc";

const request: AlertLocationsRequest = {
  gadmId: "BRA.16.137",
  range: { start: "2026-10-10", end: "2026-10-16" },
  confidence: "all",
  landFilter: "any",
  format: "csv",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const created = () => json(202, { data: { link: LINK }, status: "pending" });
const pending = () =>
  json(200, {
    data: { status: "pending", result: null, metadata: {}, message: "x" },
    status: "success",
  });
const saved = (truncated = false, pointCount = 48211) =>
  json(200, {
    data: {
      status: "saved",
      result: {
        download_url: FILE_URL,
        filename: "integrated_alerts_BRA.16.137_2026-10-10_2026-10-16.csv",
        format: "csv",
        point_count: pointCount,
      },
      metadata: {
        aoi: { type: "admin", ids: ["BRA.16.137"] },
        truncated: { "BRA.16.137": truncated },
      },
      message: "Analysis completed successfully.",
    },
    status: "success",
  });
const serverError = () => json(500, { detail: "Internal Server Error" });
const failed = (message: string | null) =>
  json(200, {
    data: { status: "failed", result: null, metadata: {}, message },
    status: "success",
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Runs the download to its end, letting every poll's wait pass. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const outcome = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error })
  );
  await vi.runAllTimersAsync();
  const result = await outcome;
  if ("error" in result) throw result.error;
  return result.value;
}

/** Runs a download of `request`, changed by `overrides`, to its end. */
const run = (overrides: Partial<AlertLocationsRequest> = {}) =>
  settle(
    prepareAlertLocations(
      { ...request, ...overrides },
      new AbortController().signal
    )
  );

const sentBody = () =>
  JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<
    string,
    unknown
  >;

describe("prepareAlertLocations", () => {
  it("asks for the view's alerts, polls the link and returns the file", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(pending())
      .mockResolvedValueOnce(saved());

    const file = await run();

    expect(file).toEqual({
      url: FILE_URL,
      pointCount: 48211,
      truncated: false,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(EXPORT_URL);
    expect(init?.method).toBe("POST");
    // No token: the user's is for the GNW backend only.
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(sentBody()).toEqual({
      aoi: {
        type: "admin",
        ids: ["BRA.16.137"],
        provider: "gadm",
        version: "4.1",
      },
      start_date: "2026-10-10",
      end_date: "2026-10-16",
      alert_confidence: ["high", "highest"],
      format: "csv",
    });
    expect(fetchMock.mock.calls.slice(1).map(([url]) => url)).toEqual([
      LINK,
      LINK,
    ]);
  });

  it.each([
    ["all", ["high", "highest"]],
    ["high", ["high"]],
    ["highest", ["highest"]],
  ] as const)("sends confidence %s as %j", async (confidence, levels) => {
    fetchMock.mockResolvedValueOnce(created()).mockResolvedValueOnce(saved());
    await run({ confidence });
    expect(sentBody().alert_confidence).toEqual(levels);
  });

  it.each(["natural_lands", "natural_forests"] as const)(
    "sends the %s land filter, and the shapefile format",
    async (landFilter) => {
      fetchMock.mockResolvedValueOnce(created()).mockResolvedValueOnce(saved());
      await run({ landFilter, format: "shp" });
      expect(sentBody()).toMatchObject({
        land_filter: landFilter,
        format: "shp",
      });
    }
  );

  it("reports a file cut at the export's cap", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(saved(true, 1_000_000));
    const file = await run();
    expect(file).toMatchObject({ pointCount: 1_000_000, truncated: true });
  });

  it("rides out the server errors of a poll that beats the job's status", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(saved());
    const file = await run();
    expect(file.url).toBe(FILE_URL);
  });

  it("counts only server errors in a row", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(pending())
      .mockResolvedValueOnce(serverError())
      .mockResolvedValueOnce(saved());
    const file = await run();
    expect(file.url).toBe(FILE_URL);
  });

  it("gives up after three server errors in a row", async () => {
    fetchMock.mockResolvedValueOnce(created()).mockResolvedValue(serverError());
    await expect(run()).rejects.toThrow("Export poll failed: 500");
    expect(fetchMock).toHaveBeenCalledTimes(1 + 3);
  });

  it.each([
    ["the request is refused", [json(422, { detail: [] })], "failed: 422"],
    ["the link is not found", [created(), json(404, {})], "failed: 404"],
    ["the job fails", [created(), failed("Boom")], "Boom"],
    [
      "the job fails with no message",
      [created(), failed(null)],
      "Export failed",
    ],
    [
      "a saved job has no file",
      [created(), json(200, { data: { status: "saved" } })],
      ZodError,
    ],
  ])("throws when %s", async (_case, responses, expected) => {
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    await expect(run()).rejects.toThrow(expected);
  });

  it("stops waiting after five minutes", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockImplementation(async () => pending());
    await expect(run()).rejects.toThrow("Export timed out");
  });

  it("stops polling when aborted", async () => {
    fetchMock
      .mockResolvedValueOnce(created())
      .mockImplementation(async () => pending());
    const controller = new AbortController();
    const outcome = prepareAlertLocations(request, controller.signal).catch(
      (error: unknown) => error
    );
    await vi.advanceTimersByTimeAsync(4000);
    const polls = fetchMock.mock.calls.length;
    controller.abort();
    expect(await outcome).toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(polls);
  });
});
