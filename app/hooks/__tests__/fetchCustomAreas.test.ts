import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import { fetchCustomAreas } from "../useCustomAreasList";

const mockedFetch = vi.mocked(apiFetch);

function area(id: string) {
  return {
    id,
    user_id: "u1",
    name: `Area ${id}`,
    geometries: [],
    created_at: "2026-09-18T00:00:00",
    updated_at: "2026-09-18T00:00:00",
  };
}

function page(ids: string[], nextOffset?: number): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (nextOffset !== undefined) headers.set("X-Next-Offset", `${nextOffset}`);
  return new Response(JSON.stringify(ids.map(area)), { status: 200, headers });
}

describe("fetchCustomAreas", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("follows X-Next-Offset until the last page", async () => {
    mockedFetch
      .mockResolvedValueOnce(page(["a", "b"], 100))
      .mockResolvedValueOnce(page(["c"]));

    const areas = await fetchCustomAreas();

    expect(areas.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(mockedFetch.mock.calls.map(([path]) => path)).toEqual([
      "/api/custom_areas?limit=100&offset=0",
      "/api/custom_areas?limit=100&offset=100",
    ]);
  });

  it("makes one request when the backend does not paginate", async () => {
    mockedFetch.mockResolvedValueOnce(page(["a"]));

    await expect(fetchCustomAreas()).resolves.toHaveLength(1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("throws with the status on failure", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 401, statusText: "Nope" })
    );

    await expect(fetchCustomAreas()).rejects.toMatchObject({ status: 401 });
  });
});
