import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import {
  AlertsListError,
  AlertsListResponseSchema,
  fetchAlertsList,
  isRetryable,
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

  it("takes a null data_to (a window without alerts) but not a missing one", () => {
    expect(
      AlertsListResponseSchema.parse({ ...ALERTS_LIST_WIRE, data_to: null })
        .data_to
    ).toBeNull();
    expect(() =>
      AlertsListResponseSchema.parse({
        ...ALERTS_LIST_WIRE,
        data_to: undefined,
      })
    ).toThrow();
  });

  it("rejects a response missing its rows", () => {
    expect(() =>
      AlertsListResponseSchema.parse({ ...ALERTS_LIST_WIRE, rows: undefined })
    ).toThrow();
  });
});

describe("toAlertsList", () => {
  it("normalises the wire shape and keeps rows newest first", () => {
    const list = toAlertsList(ALERTS_LIST_WIRE);
    expect(list.latest).toBe("2026-10-16");
    // The chips count back from the latest alert day, not the window's end.
    expect(list.anchor).toBe("2026-10-16");
    expect(list.window).toEqual({ start: "2026-09-16", end: "2026-10-19" });
    expect(list.newWeek).toEqual({ start: "2026-10-04", end: "2026-10-10" });
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

  it("anchors a window without alerts on its end, with no latest day", () => {
    const list = toAlertsList({ ...ALERTS_LIST_WIRE, data_to: null, rows: [] });
    expect(list.latest).toBeUndefined();
    expect(list.anchor).toBe("2026-10-19");
    expect(list.rows).toEqual([]);
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
    const list = await fetchAlertsList(aoi, range, "any");
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

  it('sends the land filter unless it is "any"', async () => {
    // A fresh Response per call: a body can be read once.
    mockedFetch.mockImplementation(async () =>
      jsonResponse(200, ALERTS_LIST_WIRE)
    );
    await fetchAlertsList(aoi, range, "natural_lands");
    expect(
      JSON.parse(mockedFetch.mock.calls[0][1]?.body as string)
    ).toMatchObject({ land_filter: "natural_lands" });
    await fetchAlertsList(aoi, range, "any");
    expect(
      JSON.parse(mockedFetch.mock.calls[1][1]?.body as string)
    ).not.toHaveProperty("land_filter");
  });

  it("turns a 502 into a retryable `unavailable` carrying the backend's sentence", async () => {
    const detail =
      "Integrated alerts data is unavailable right now. Please try again in a moment.";
    mockedFetch.mockResolvedValue(jsonResponse(502, { detail }));
    const error = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(error).toBeInstanceOf(AlertsListError);
    expect(error).toMatchObject({ kind: "unavailable", detail });
    expect(isRetryable(error.kind)).toBe(true);
  });

  it("keeps a 422's reason, final, whether it is the area or the window", async () => {
    const tooLong =
      "The period from 2025-01-01 to 2026-10-16 is longer than 365 days.";
    mockedFetch.mockResolvedValue(jsonResponse(422, { detail: tooLong }));
    const window = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(window).toBeInstanceOf(AlertsListError);
    expect(window).toMatchObject({ kind: "rejected", detail: tooLong });
    expect(isRetryable(window.kind)).toBe(false);

    mockedFetch.mockResolvedValue(
      jsonResponse(422, { detail: "Area type not supported" })
    );
    const area = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(area).toMatchObject({
      kind: "rejected",
      detail: "Area type not supported",
    });

    // FastAPI's list-shaped 422 for a malformed body has no sentence to show.
    mockedFetch.mockResolvedValue(
      jsonResponse(422, { detail: [{ msg: "field required" }] })
    );
    const malformed = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(malformed.kind).toBe("rejected");
    expect(malformed.detail).toBeUndefined();
  });

  it("marks a 401 as unauthenticated and anything else as unknown", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(401, { detail: "Unauthorized" })
    );
    const unauthorized = await fetchAlertsList(aoi, range, "any").catch(
      (e) => e
    );
    expect(unauthorized.kind).toBe("unauthenticated");
    expect(unauthorized.detail).toBeUndefined();
    expect(isRetryable(unauthorized.kind)).toBe(false);

    // A failed fetch: `apiFetch` rejects with the browser's TypeError.
    mockedFetch.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    const network = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(network).toBeInstanceOf(AlertsListError);
    expect(network.kind).toBe("unknown");
    expect(isRetryable(network.kind)).toBe(true);
  });

  it("turns a 200 the schema rejects into the unknown error", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { rows: "not a list" }));
    const error = await fetchAlertsList(aoi, range, "any").catch((e) => e);
    expect(error).toBeInstanceOf(AlertsListError);
    expect(error.kind).toBe("unknown");
  });

  it("keeps a bodiless 502 unavailable without a sentence and passes its own errors through", () => {
    const bare = Object.assign(new Error("Request failed: Bad Gateway"), {
      status: 502,
    });
    expect(toAlertsListError(bare).kind).toBe("unavailable");
    expect(toAlertsListError(bare).detail).toBeUndefined();
    const own = new AlertsListError("rejected", "x");
    expect(toAlertsListError(own)).toBe(own);
  });
});
