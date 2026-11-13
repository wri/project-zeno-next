import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import {
  restoreEmailSubscriptions,
  turnOffAllEmailSubscriptions,
} from "../dashboards";

const mockedFetch = vi.mocked(apiFetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => mockedFetch.mockReset());

describe("turnOffAllEmailSubscriptions", () => {
  it("turns email off in one request and returns the dashboards it changed", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, { dashboard_ids: ["d1", "d2"], skipped: [] })
    );

    const changed = await turnOffAllEmailSubscriptions();

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/subscriptions?channel=email",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(changed).toEqual(["d1", "d2"]);
  });

  it("throws the backend's detail when the request fails", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(500, { detail: "Boom" }));

    await expect(turnOffAllEmailSubscriptions()).rejects.toMatchObject({
      message: "Boom",
      status: 500,
    });
  });
});

describe("restoreEmailSubscriptions", () => {
  it("turns email back on for the given dashboards in one request", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, { dashboard_ids: ["d1"], skipped: ["d2"] })
    );

    const result = await restoreEmailSubscriptions(["d1", "d2"]);

    const [path, init] = mockedFetch.mock.calls[0];
    expect(path).toBe("/api/subscriptions");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      channel: "email",
      dashboard_ids: ["d1", "d2"],
    });
    expect(result).toEqual({ subscribed: ["d1"], skipped: ["d2"] });
  });
});
