import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildUserFirstSeenMap, fetchAllUsers } from "../users";
import { requestJson } from "../http";

vi.mock("../http", () => ({ requestJson: vi.fn() }));
vi.mock("@/app/lib/api-client", () => ({ getAuthHeaders: () => ({}) }));

// An existing GFW user: the Resource Watch account is from 2021, the first
// GNW sign-in from 2025. Only the sign-in may date them for GNW.
const GFW_USER = {
  id: "gfw-user",
  createdAt: "2021-03-04T05:06:07",
  firstSeenAt: "2025-11-03T23:30:00+00:00",
};

async function firstSeenMap(payload: unknown[]) {
  vi.mocked(requestJson).mockResolvedValueOnce(payload);
  return buildUserFirstSeenMap(await fetchAllUsers());
}

describe("fetchAllUsers + buildUserFirstSeenMap", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset();
  });

  it("dates a user by the UTC day of their first GNW sign-in", async () => {
    const map = await firstSeenMap([
      GFW_USER,
      { id: "west", firstSeenAt: "2025-11-03T23:30:00-02:00" },
    ]);

    expect(map.get("gfw-user")).toBe("2025-11-03");
    expect(map.get("west")).toBe("2025-11-04");
  });

  it("leaves out users with no first sign-in", async () => {
    const map = await firstSeenMap([
      { id: "null", firstSeenAt: null },
      { id: "missing" },
    ]);

    expect(map.size).toBe(0);
  });

  it("rejects a first sign-in that is not an ISO timestamp", async () => {
    vi.mocked(requestJson).mockResolvedValueOnce([
      { id: "bad", firstSeenAt: "yesterday" },
    ]);

    await expect(fetchAllUsers()).rejects.toThrow();
  });
});
