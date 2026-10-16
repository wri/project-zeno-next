import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import {
  AlertsListError,
  AlertsListResponseSchema,
  fetchAlertsList,
  toAlertsList,
  toAlertsListError,
} from "../alerts";
import { ALERTS_LIST_WIRE } from "./fixtures";

const mockedFetch = vi.mocked(apiFetch);

const aoi = {
  source: "gadm",
  srcId: "BRA.16.137_2",
  subtype: "district",
  name: "Guarapuava",
};
const range = { start: "2026-09-17", end: "2026-10-16" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "Content-Type": "application/json" },
  });
}

describe("AlertsListResponseSchema", () => {
  it("accepts the contract fixture", () => {
    expect(AlertsListResponseSchema.parse(ALERTS_LIST_WIRE)).toEqual(
      ALERTS_LIST_WIRE
    );
  });

  it("defaults absent rows to none and rejects a missing data_to", () => {
    expect(
      AlertsListResponseSchema.parse({ ...ALERTS_LIST_WIRE, rows: undefined })
        .rows
    ).toEqual([]);
    expect(() =>
      AlertsListResponseSchema.parse({
        ...ALERTS_LIST_WIRE,
        data_to: undefined,
      })
    ).toThrow();
  });
});

describe("toAlertsList", () => {
  it("normalises the wire shape and keeps rows newest first", () => {
    const list = toAlertsList(ALERTS_LIST_WIRE);
    expect(list.dataTo).toBe("2026-10-16");
    expect(list.window).toEqual({ start: "2026-09-17", end: "2026-10-16" });
    expect(list.newWeek).toEqual({ start: "2026-10-04", end: "2026-10-10" });
    expect(list.totalHa).toBe(105.7);
    expect(list.rows).toHaveLength(14);
    expect(list.rows[0]).toEqual({
      date: "2026-10-16",
      highHa: 4.2,
      highestHa: 0.8,
      totalHa: 5.0,
      isNew: false,
    });
    expect(list.rows.filter((r) => r.isNew).map((r) => r.date)).toEqual([
      "2026-10-10",
      "2026-10-09",
      "2026-10-07",
      "2026-10-05",
      "2026-10-04",
    ]);
  });

  it("sorts rows by date descending if the backend ever sends them otherwise", () => {
    const shuffled = {
      ...ALERTS_LIST_WIRE,
      rows: [...ALERTS_LIST_WIRE.rows].reverse(),
    };
    expect(toAlertsList(shuffled).rows.map((r) => r.date)).toEqual(
      ALERTS_LIST_WIRE.rows.map((r) => r.alert_date)
    );
  });
});

describe("fetchAlertsList", () => {
  // Block body on purpose: `mockReset()` returns the mock, and a function
  // returned from `beforeEach` is run by vitest as the test's teardown.
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("posts the exact request body and returns the normalised list", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, ALERTS_LIST_WIRE));
    const list = await fetchAlertsList(aoi, range);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [path, init] = mockedFetch.mock.calls[0];
    expect(path).toBe("/api/alerts/list");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      source: "gadm",
      src_id: "BRA.16.137_2",
      subtype: "district",
      start_date: "2026-09-17",
      end_date: "2026-10-16",
    });
    expect(list.rows).toHaveLength(14);
  });

  it("turns a 502 into a retryable error carrying the backend's sentence", async () => {
    const detail =
      "Integrated alerts data is unavailable right now. Please try again in a moment.";
    mockedFetch.mockResolvedValue(jsonResponse(502, { detail }));
    const error = await fetchAlertsList(aoi, range).catch((e) => e);
    expect(error).toBeInstanceOf(AlertsListError);
    expect(error.message).toBe(detail);
    expect(error.retryable).toBe(true);
    expect(error.status).toBe(502);
  });

  it("turns a 422 into a final error for an unsupported area", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(422, { detail: "Area type not supported" })
    );
    const error = await fetchAlertsList(aoi, range).catch((e) => e);
    expect(error).toBeInstanceOf(AlertsListError);
    expect(error.message).toBe("Alerts aren't available for this area.");
    expect(error.retryable).toBe(false);
    expect(error.status).toBe(422);
  });

  it("asks for sign-in on a 401 and stays generic otherwise", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(401, { detail: "Unauthorized" })
    );
    const unauthorized = await fetchAlertsList(aoi, range).catch((e) => e);
    expect(unauthorized.message).toBe("Sign in to see the alerts list.");
    expect(unauthorized.retryable).toBe(false);

    // A failed fetch: `apiFetch` rejects with the browser's TypeError.
    mockedFetch.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    const network = await fetchAlertsList(aoi, range).catch((e) => e);
    expect(network).toBeInstanceOf(AlertsListError);
    expect(network.message).toBe("Couldn't load the alerts.");
    expect(network.retryable).toBe(true);
    expect(network.status).toBeUndefined();
  });

  it("maps a bodiless 502 to the generic copy and passes its own errors through", () => {
    const bare = Object.assign(new Error("Request failed: Bad Gateway"), {
      status: 502,
    });
    expect(toAlertsListError(bare).message).toBe("Request failed: Bad Gateway");
    const own = new AlertsListError("x", false, 422);
    expect(toAlertsListError(own)).toBe(own);
  });
});
